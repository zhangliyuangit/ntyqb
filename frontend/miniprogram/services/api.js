const {
  AUTH_PAGE_URL,
  HOME_PAGE_URL,
  normalizeAuthRedirectTarget,
  resolvePostLoginNavigation
} = require("../utils/auth-redirect");

const TOKEN_KEY = "ntyqb_token";
const MOCK_USER_KEY = "ntyqb_mock_user_key";
const AUTH_PROFILE_KEY = "ntyqb_auth_profile";
const AUTH_REDIRECT_KEY = "ntyqb_auth_redirect";
const DEFAULT_API_BASE_URL = "https://niyoushashilia.cloud/api";

function getStoredToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || "";
  } catch (error) {
    return "";
  }
}

function hasToken() {
  const app = getAppSafe(false);
  const token = (app && app.globalData.token) || getStoredToken();
  if (app && token) {
    app.globalData.token = token;
  }
  return Boolean(token);
}

function isLoggedIn() {
  return hasToken();
}

function getSavedAuthProfile() {
  try {
    const stored = wx.getStorageSync(AUTH_PROFILE_KEY);
    if (!stored || typeof stored !== "object") {
      return null;
    }
    if (!stored.nickname || !stored.avatarUrl) {
      return null;
    }
    return {
      userId: typeof stored.userId === "number" ? stored.userId : undefined,
      nickname: String(stored.nickname),
      avatarUrl: String(stored.avatarUrl)
    };
  } catch (error) {
    return null;
  }
}

function getMockUserKey() {
  const stored = wx.getStorageSync(MOCK_USER_KEY);
  if (stored) {
    return stored;
  }
  const generated = `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  wx.setStorageSync(MOCK_USER_KEY, generated);
  return generated;
}

function setToken(token) {
  const app = getAppSafe();
  app.globalData.token = token;
  wx.setStorageSync(TOKEN_KEY, token);
}

function setUser(user) {
  const app = getAppSafe();
  app.globalData.user = user || null;
  if (user && user.nickname && user.avatarUrl) {
    saveAuthProfile({
      userId: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl
    });
  }
}

function saveAuthProfile(profile) {
  wx.setStorageSync(AUTH_PROFILE_KEY, {
    userId: profile.userId,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl
  });
}

function clearSavedAuthProfile() {
  wx.removeStorageSync(AUTH_PROFILE_KEY);
}

function clearAuth() {
  const app = getAppSafe(false);
  if (app) {
    app.globalData.token = "";
    app.globalData.user = null;
  }
  wx.removeStorageSync(TOKEN_KEY);
}

function restoreSession() {
  const app = getAppSafe();
  app.globalData.token = getStoredToken();
  if (!app.globalData.user) {
    app.globalData.user = null;
  }
}

function requireAuthPage() {
  return hasToken();
}

function navigateToAuth(options = {}) {
  const currentRoute = getCurrentRoute();
  if (currentRoute === "pages/auth/index") {
    return;
  }
  const targetUrl = normalizeAuthRedirectTarget(options.targetUrl || getCurrentPageUrl());
  wx.setStorageSync(AUTH_REDIRECT_KEY, targetUrl);
  wx.navigateTo({
    url: `${AUTH_PAGE_URL}?redirect=${encodeURIComponent(targetUrl)}`
  });
}

function switchToHome() {
  wx.switchTab({
    url: HOME_PAGE_URL
  });
}

function completeAuthNavigation(fallbackUrl) {
  const targetUrl = getPendingAuthRedirect();
  clearPendingAuthRedirect();
  const destination = resolvePostLoginNavigation(targetUrl || fallbackUrl || HOME_PAGE_URL);
  if (destination.method === "switchTab") {
    wx.switchTab({ url: destination.url });
    return;
  }
  wx.redirectTo({ url: destination.url });
}

function cancelAuthNavigation() {
  clearPendingAuthRedirect();
}

async function loginWithWechatProfile(payload) {
  if (!payload.nickname || !payload.nickname.trim()) {
    throw new Error("请先填写微信昵称");
  }
  if (!payload.avatarUrl || !payload.avatarUrl.trim()) {
    throw new Error("请先选择微信头像");
  }

  const avatarUrl = needsAvatarUpload(payload.avatarUrl.trim())
    ? await uploadAvatar(payload.avatarUrl.trim())
    : payload.avatarUrl.trim();
  const loginResult = await wxpLogin();
  const response = await request({
    method: "POST",
    url: "/auth/wechat/login",
    needAuth: false,
    data: {
      code: loginResult.code,
      nickname: payload.nickname.trim(),
      avatarUrl,
      mockUserKey: getMockUserKey()
    }
  });

  setToken(response.token);
  setUser(response.user);
  return response;
}

async function logout() {
  try {
    if (hasToken()) {
      await request({ method: "POST", url: "/auth/logout" });
    }
  } finally {
    clearAuth();
    clearPendingAuthRedirect();
    switchToHome();
  }
}

async function getMe() {
  const data = await request({ url: "/me" });
  setUser(data.user);
  return data;
}

async function searchUsers(keyword) {
  return request({ url: `/users/search?keyword=${encodeURIComponent(keyword)}` });
}

async function getRecentPlayers(sportType) {
  return request({ url: `/users/recent-opponents?sportType=${sportType}` });
}

async function createMatch(payload) {
  return request({ method: "POST", url: "/matches", data: payload });
}

async function listMatches(params, options = {}) {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return request({
    url: `/matches${query ? `?${query}` : ""}`,
    needAuth: options.needAuth ?? true
  });
}

async function confirmMatch(matchId) {
  return request({ method: "POST", url: `/matches/${matchId}/confirm` });
}

async function rejectMatch(matchId) {
  return request({ method: "POST", url: `/matches/${matchId}/reject` });
}

async function cancelMatch(matchId) {
  return request({ method: "POST", url: `/matches/${matchId}/cancel` });
}

async function getLeaderboard(sportType, options = {}) {
  return request({
    url: `/leaderboards?sportType=${sportType}`,
    needAuth: options.needAuth ?? true
  });
}

async function getPlayerProfile(userId, sportType) {
  return request({ url: `/users/${userId}/profile?sportType=${sportType}` });
}

async function request({ method = "GET", url, data, needAuth = true }) {
  const app = getAppSafe();
  if (needAuth && !hasToken()) {
    throw createAuthError("请先登录后使用该功能", "AUTH_REQUIRED");
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiBaseUrl || DEFAULT_API_BASE_URL}${url}`,
      method,
      data,
      header: {
        "Content-Type": "application/json",
        ...(needAuth && app.globalData.token ? { "X-Auth-Token": app.globalData.token } : {})
      },
      success: (response) => {
        if (response.statusCode === 401 && needAuth) {
          clearAuth();
          reject(createAuthError("登录已失效，请重新登录", "AUTH_EXPIRED"));
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data);
          return;
        }
        const message = response.data && response.data.message ? response.data.message : "请求失败";
        reject(new Error(message));
      },
      fail: (error) => reject(error)
    });
  });
}

function wxpLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    });
  });
}

function getCurrentRoute() {
  try {
    const pages = getCurrentPages();
    if (!pages.length) {
      return "";
    }
    return pages[pages.length - 1].route || "";
  } catch (error) {
    return "";
  }
}

function getCurrentPageUrl() {
  try {
    const pages = getCurrentPages();
    if (!pages.length) {
      return HOME_PAGE_URL;
    }
    const currentPage = pages[pages.length - 1];
    const route = currentPage.route || "";
    const options = currentPage.options || {};
    const query = Object.entries(options)
      .filter(([, value]) => value !== undefined && value !== null && `${value}` !== "")
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join("&");
    const basePath = route ? `/${route}` : HOME_PAGE_URL;
    return query ? `${basePath}?${query}` : basePath;
  } catch (error) {
    return HOME_PAGE_URL;
  }
}

function getPendingAuthRedirect() {
  try {
    return normalizeAuthRedirectTarget(wx.getStorageSync(AUTH_REDIRECT_KEY) || HOME_PAGE_URL);
  } catch (error) {
    return HOME_PAGE_URL;
  }
}

function clearPendingAuthRedirect() {
  wx.removeStorageSync(AUTH_REDIRECT_KEY);
}

function createAuthError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function isAuthError(error, code) {
  if (!error || typeof error !== "object" || !error.code) {
    return false;
  }
  return code ? error.code === code : error.code === "AUTH_REQUIRED" || error.code === "AUTH_EXPIRED";
}

function needsAvatarUpload(avatarUrl) {
  const { isTemporaryAvatarUrl } = require("../utils/avatar-url");
  return isTemporaryAvatarUrl(avatarUrl);
}

async function uploadAvatar(filePath) {
  const app = getAppSafe();
  const apiBaseUrl = (app.globalData.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${apiBaseUrl}/uploads/avatar`,
      filePath,
      name: "file",
      success(response) {
        let data = { avatarUrl: "" };
        try {
          data = JSON.parse(response.data || "{}");
        } catch (error) {
          reject(new Error("头像上传失败，请重新选择头像"));
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300 && data.avatarUrl) {
          resolve(data.avatarUrl);
          return;
        }
        reject(new Error(data.message || "头像上传失败，请重新选择头像"));
      },
      fail() {
        reject(new Error("头像上传失败，请重新选择头像"));
      }
    });
  });
}

function getAppSafe(required = true) {
  try {
    const app = getApp();
    if (app && app.globalData) {
      if (!app.globalData.apiBaseUrl) {
        app.globalData.apiBaseUrl = DEFAULT_API_BASE_URL;
      }
      if (typeof app.globalData.token !== "string") {
        app.globalData.token = "";
      }
      if (typeof app.globalData.user === "undefined") {
        app.globalData.user = null;
      }
      return app;
    }
  } catch (error) {
    if (!required) {
      return null;
    }
  }

  if (!required) {
    return null;
  }
  throw new Error("App 尚未初始化");
}

module.exports = {
  clearAuth,
  clearSavedAuthProfile,
  getSavedAuthProfile,
  getStoredToken,
  hasToken,
  isAuthError,
  isLoggedIn,
  loginWithWechatProfile,
  logout,
  getMe,
  getPlayerProfile,
  getRecentPlayers,
  getLeaderboard,
  createMatch,
  listMatches,
  confirmMatch,
  rejectMatch,
  cancelMatch,
  cancelAuthNavigation,
  completeAuthNavigation,
  navigateToAuth,
  requireAuthPage,
  restoreSession,
  saveAuthProfile,
  searchUsers,
  switchToHome
};
