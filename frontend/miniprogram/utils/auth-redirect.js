const AUTH_PAGE_URL = "/pages/auth/index";
const HOME_PAGE_URL = "/pages/home/index";

const TAB_PAGE_URLS = new Set([
  "/pages/home/index",
  "/pages/leaderboard/index",
  "/pages/records/index",
  "/pages/profile/index"
]);

function normalizeAuthRedirectTarget(targetUrl) {
  const rawValue = typeof targetUrl === "string" ? targetUrl.trim() : "";
  if (!rawValue) {
    return HOME_PAGE_URL;
  }

  const normalized = rawValue.startsWith("/") ? rawValue : `/${rawValue}`;
  const basePath = normalized.split("?")[0];
  if (basePath === AUTH_PAGE_URL) {
    return HOME_PAGE_URL;
  }

  return normalized;
}

function resolvePostLoginNavigation(targetUrl) {
  const url = normalizeAuthRedirectTarget(targetUrl);
  const basePath = url.split("?")[0];
  return {
    method: TAB_PAGE_URLS.has(basePath) ? "switchTab" : "redirectTo",
    url
  };
}

module.exports = {
  AUTH_PAGE_URL,
  HOME_PAGE_URL,
  normalizeAuthRedirectTarget,
  resolvePostLoginNavigation
};
