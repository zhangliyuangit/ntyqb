import type {
  CreateMatchPayload,
  LeaderboardResponse,
  MatchDetail,
  MatchListResponse,
  MeResponse,
  PlayerProfile,
  RecentPlayer,
  SportType,
  UserSummary
} from "../types/models";
import {
  AUTH_PAGE_URL,
  HOME_PAGE_URL,
  normalizeAuthRedirectTarget,
  resolvePostLoginNavigation
} from "../utils/auth-redirect";

const TOKEN_KEY = "ntyqb_token";
const MOCK_USER_KEY = "ntyqb_mock_user_key";
const AUTH_PROFILE_KEY = "ntyqb_auth_profile";
const AUTH_REDIRECT_KEY = "ntyqb_auth_redirect";
const DEFAULT_API_BASE_URL = "https://niyoushashilia.cloud/api";

interface RequestOptions {
  method?: "GET" | "POST";
  url: string;
  data?: Record<string, any> | string;
  needAuth?: boolean;
}

interface RequestPolicyOptions {
  needAuth?: boolean;
}

interface LoginPayload {
  nickname: string;
  avatarUrl: string;
}

interface LoginResponse {
  token: string;
  authMode: string;
  user: UserSummary;
}

export interface SavedAuthProfile {
  userId?: number;
  nickname: string;
  avatarUrl: string;
}

interface AvatarUploadResponse {
  avatarUrl: string;
}

type AuthErrorCode = "AUTH_REQUIRED" | "AUTH_EXPIRED";

interface AuthError extends Error {
  code?: AuthErrorCode;
}

export function getStoredToken(): string {
  try {
    return wx.getStorageSync(TOKEN_KEY) || "";
  } catch (error) {
    return "";
  }
}

export function hasToken(): boolean {
  const app = getAppSafe(false);
  const token = (app && app.globalData.token) || getStoredToken();
  if (app && token) {
    app.globalData.token = token;
  }
  return Boolean(token);
}

export function isLoggedIn(): boolean {
  return hasToken();
}

export function getSavedAuthProfile(): SavedAuthProfile | null {
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

function getMockUserKey(): string {
  const stored = wx.getStorageSync(MOCK_USER_KEY);
  if (stored) {
    return stored;
  }
  const generated = `mock-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  wx.setStorageSync(MOCK_USER_KEY, generated);
  return generated;
}

function setToken(token: string) {
  const app = getAppSafe();
  app.globalData.token = token;
  wx.setStorageSync(TOKEN_KEY, token);
}

function setUser(user: UserSummary | null) {
  const app = getAppSafe();
  app.globalData.user = user;
  if (user && user.nickname && user.avatarUrl) {
    saveAuthProfile({
      userId: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl
    });
  }
}

export function saveAuthProfile(profile: SavedAuthProfile) {
  wx.setStorageSync(AUTH_PROFILE_KEY, {
    userId: profile.userId,
    nickname: profile.nickname,
    avatarUrl: profile.avatarUrl
  });
}

export function clearSavedAuthProfile() {
  wx.removeStorageSync(AUTH_PROFILE_KEY);
}

export function clearAuth() {
  const app = getAppSafe(false);
  if (app) {
    app.globalData.token = "";
    app.globalData.user = null;
  }
  wx.removeStorageSync(TOKEN_KEY);
}

export function restoreSession() {
  const app = getAppSafe();
  app.globalData.token = getStoredToken();
  if (!app.globalData.user) {
    app.globalData.user = null;
  }
}

export function requireAuthPage(): boolean {
  return hasToken();
}

export function navigateToAuth(options: { targetUrl?: string } = {}) {
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

export function switchToHome() {
  wx.switchTab({
    url: HOME_PAGE_URL
  });
}

export function completeAuthNavigation(fallbackUrl?: string) {
  const targetUrl = getPendingAuthRedirect();
  clearPendingAuthRedirect();
  const destination = resolvePostLoginNavigation(targetUrl || fallbackUrl || HOME_PAGE_URL);
  if (destination.method === "switchTab") {
    wx.switchTab({ url: destination.url });
    return;
  }
  wx.redirectTo({ url: destination.url });
}

export function cancelAuthNavigation() {
  clearPendingAuthRedirect();
}

export async function loginWithWechatProfile(payload: LoginPayload): Promise<LoginResponse> {
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
  const response = await request<LoginResponse>({
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

export async function logout(): Promise<void> {
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

export async function getMe(): Promise<MeResponse> {
  const data = await request<MeResponse>({ url: "/me" });
  setUser(data.user);
  return data;
}

export async function searchUsers(keyword: string): Promise<UserSummary[]> {
  return request<UserSummary[]>({ url: `/users/search?keyword=${encodeURIComponent(keyword)}` });
}

export async function getRecentPlayers(sportType: SportType): Promise<RecentPlayer[]> {
  return request<RecentPlayer[]>({ url: `/users/recent-opponents?sportType=${sportType}` });
}

export async function createMatch(payload: CreateMatchPayload): Promise<MatchDetail> {
  return request<MatchDetail>({ method: "POST", url: "/matches", data: payload });
}

export async function listMatches(
  params: Record<string, string>,
  options: RequestPolicyOptions = {}
): Promise<MatchListResponse> {
  const query = Object.entries(params)
    .filter(([, value]) => value)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
  return request<MatchListResponse>({
    url: `/matches${query ? `?${query}` : ""}`,
    needAuth: options.needAuth ?? true
  });
}

export async function confirmMatch(matchId: number): Promise<MatchDetail> {
  return request<MatchDetail>({ method: "POST", url: `/matches/${matchId}/confirm` });
}

export async function rejectMatch(matchId: number): Promise<MatchDetail> {
  return request<MatchDetail>({ method: "POST", url: `/matches/${matchId}/reject` });
}

export async function cancelMatch(matchId: number): Promise<MatchDetail> {
  return request<MatchDetail>({ method: "POST", url: `/matches/${matchId}/cancel` });
}

export async function getLeaderboard(
  sportType: SportType,
  options: RequestPolicyOptions = {}
): Promise<LeaderboardResponse> {
  return request<LeaderboardResponse>({
    url: `/leaderboards?sportType=${sportType}`,
    needAuth: options.needAuth ?? true
  });
}

export async function getPlayerProfile(userId: number, sportType: SportType): Promise<PlayerProfile> {
  return request<PlayerProfile>({ url: `/users/${userId}/profile?sportType=${sportType}` });
}

async function request<T>({
  method = "GET",
  url,
  data,
  needAuth = true
}: RequestOptions): Promise<T> {
  const app = getAppSafe();
  if (needAuth && !hasToken()) {
    throw createAuthError("请先登录后使用该功能", "AUTH_REQUIRED");
  }

  return new Promise<T>((resolve, reject) => {
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
          resolve(response.data as T);
          return;
        }
        const message = (response.data as any)?.message || "请求失败";
        reject(new Error(message));
      },
      fail: (error) => reject(error)
    });
  });
}

function wxpLogin(): Promise<WechatMiniprogram.LoginSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.login({
      success: resolve,
      fail: reject
    });
  });
}

function getCurrentRoute(): string {
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

function getCurrentPageUrl(): string {
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

function getPendingAuthRedirect(): string {
  try {
    return normalizeAuthRedirectTarget(wx.getStorageSync(AUTH_REDIRECT_KEY) || HOME_PAGE_URL);
  } catch (error) {
    return HOME_PAGE_URL;
  }
}

function clearPendingAuthRedirect() {
  wx.removeStorageSync(AUTH_REDIRECT_KEY);
}

function createAuthError(message: string, code: AuthErrorCode): AuthError {
  const error = new Error(message) as AuthError;
  error.code = code;
  return error;
}

export function isAuthError(error: any, code?: AuthErrorCode): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const errorCode = (error as AuthError).code;
  if (!errorCode) {
    return false;
  }
  return code ? errorCode === code : errorCode === "AUTH_REQUIRED" || errorCode === "AUTH_EXPIRED";
}

function needsAvatarUpload(avatarUrl: string): boolean {
  const { isTemporaryAvatarUrl } = require("../utils/avatar-url");
  return isTemporaryAvatarUrl(avatarUrl);
}

async function uploadAvatar(filePath: string): Promise<string> {
  const app = getAppSafe();
  const apiBaseUrl = (app.globalData.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/$/, "");
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${apiBaseUrl}/uploads/avatar`,
      filePath,
      name: "file",
      success(response) {
        let data: AvatarUploadResponse | { message?: string } = { avatarUrl: "" };
        try {
          data = JSON.parse(response.data || "{}");
        } catch (error) {
          reject(new Error("头像上传失败，请重新选择头像"));
          return;
        }
        if (response.statusCode >= 200 && response.statusCode < 300 && "avatarUrl" in data && data.avatarUrl) {
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

function getAppSafe(required = true): IAppOption | null {
  try {
    const app = getApp<IAppOption>();
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
