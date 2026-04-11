export const AUTH_PAGE_URL = "/pages/auth/index";
export const HOME_PAGE_URL = "/pages/home/index";

const TAB_PAGE_URLS = new Set([
  "/pages/home/index",
  "/pages/leaderboard/index",
  "/pages/records/index",
  "/pages/profile/index"
]);

export function normalizeAuthRedirectTarget(targetUrl?: string | null): string {
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

export function resolvePostLoginNavigation(targetUrl?: string | null): {
  method: "switchTab" | "redirectTo";
  url: string;
} {
  const url = normalizeAuthRedirectTarget(targetUrl);
  const basePath = url.split("?")[0];
  return {
    method: TAB_PAGE_URLS.has(basePath) ? "switchTab" : "redirectTo",
    url
  };
}
