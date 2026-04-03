const TOKEN_KEY = "ntyqb_token";
const MOCK_USER_KEY = "ntyqb_mock_user_key";
const AUTH_PROFILE_KEY = "ntyqb_auth_profile";
const DEFAULT_API_BASE_URL = "https://niyoushashilia.cloud/api";
const AUTH_PAGE_URL = "/pages/auth/index";
const HOME_PAGE_URL = "/pages/home/index";

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
  wx.setStorageSync(MOCK_USER_KEY, "local-demo-user");
  return "local-demo-user";
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
  if (hasToken()) {
    return true;
  }
  redirectToAuth();
  return false;
}

function redirectToAuth() {
  const currentRoute = getCurrentRoute();
  if (currentRoute === "pages/auth/index") {
    return;
  }
  wx.reLaunch({
    url: AUTH_PAGE_URL
  });
}

function switchToHome() {
  wx.switchTab({
    url: HOME_PAGE_URL
  });
}

async function loginWithWechatProfile(payload) {
  if (!payload.nickname || !payload.nickname.trim()) {
    throw new Error("请先填写微信昵称");
  }
  if (!payload.avatarUrl || !payload.avatarUrl.trim()) {
    throw new Error("请先选择微信头像");
  }

  const loginResult = await wxpLogin();
  const response = await request({
    method: "POST",
    url: "/auth/wechat/login",
    needAuth: false,
    data: {
      code: loginResult.code,
      nickname: payload.nickname.trim(),
      avatarUrl: payload.avatarUrl.trim(),
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
    redirectToAuth();
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

async function listMatches(params) {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return request({ url: `/matches${query ? `?${query}` : ""}` });
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

async function getLeaderboard(sportType) {
  return request({ url: `/leaderboards?sportType=${sportType}` });
}

async function getPlayerProfile(userId, sportType) {
  return request({ url: `/users/${userId}/profile?sportType=${sportType}` });
}

async function request({ method = "GET", url, data, needAuth = true }) {
  const app = getAppSafe();
  if (needAuth && !hasToken()) {
    redirectToAuth();
    throw new Error("请先完成微信授权登录");
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
          redirectToAuth();
          reject(new Error("登录已失效，请重新授权"));
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
  redirectToAuth,
  requireAuthPage,
  restoreSession,
  saveAuthProfile,
  searchUsers,
  switchToHome
};
