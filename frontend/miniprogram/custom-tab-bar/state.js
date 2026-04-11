const TABS = [
  {
    key: "home",
    pagePath: "/pages/home/index",
    route: "pages/home/index"
  },
  {
    key: "leaderboard",
    pagePath: "/pages/leaderboard/index",
    route: "pages/leaderboard/index"
  },
  {
    key: "records",
    pagePath: "/pages/records/index",
    route: "pages/records/index"
  },
  {
    key: "profile",
    pagePath: "/pages/profile/index",
    route: "pages/profile/index"
  }
];

const DEFAULT_TAB_KEY = "home";

function normalizePagePath(pagePath) {
  if (!pagePath) {
    return "";
  }
  return String(pagePath).replace(/^\//, "").split("?")[0];
}

function getTabByRoute(route) {
  const normalizedRoute = normalizePagePath(route);
  return TABS.find((item) => item.route === normalizedRoute) || null;
}

function getAppSafe() {
  if (typeof getApp !== "function") {
    return null;
  }
  try {
    return getApp();
  } catch (error) {
    return null;
  }
}

function getCurrentTabKey() {
  const app = getAppSafe();
  const currentTabKey = app && app.globalData ? app.globalData.currentTabKey : "";
  return TABS.some((item) => item.key === currentTabKey) ? currentTabKey : "";
}

function setCurrentTabKey(tabKey) {
  const nextTabKey = TABS.some((item) => item.key === tabKey) ? tabKey : DEFAULT_TAB_KEY;
  const app = getAppSafe();
  if (app && app.globalData) {
    app.globalData.currentTabKey = nextTabKey;
  }
  return nextTabKey;
}

function resolveSelectedTab({ route = "", pendingPagePath = "", currentTabKey = "" } = {}) {
  const pendingTab = getTabByRoute(pendingPagePath);
  if (pendingTab) {
    return pendingTab.key;
  }

  const currentRouteTab = getTabByRoute(route);
  if (currentRouteTab) {
    return currentRouteTab.key;
  }

  if (TABS.some((item) => item.key === currentTabKey)) {
    return currentTabKey;
  }

  return DEFAULT_TAB_KEY;
}

function setCurrentTabByPagePath(pagePath) {
  const nextTabKey = resolveSelectedTab({
    pendingPagePath: pagePath,
    currentTabKey: getCurrentTabKey()
  });
  return setCurrentTabKey(nextTabKey);
}

function setCurrentTabByRoute(route) {
  const nextTabKey = resolveSelectedTab({
    route,
    currentTabKey: getCurrentTabKey()
  });
  return setCurrentTabKey(nextTabKey);
}

function syncTabBarSelection(page, route, extraData) {
  const selected = setCurrentTabByRoute(route);
  const tabBar = page && typeof page.getTabBar === "function" ? page.getTabBar() : null;
  if (tabBar && typeof tabBar.setData === "function") {
    tabBar.setData(Object.assign({ selected }, extraData));
  }
  return selected;
}

module.exports = {
  DEFAULT_TAB_KEY,
  TABS,
  getCurrentTabKey,
  normalizePagePath,
  resolveSelectedTab,
  setCurrentTabByPagePath,
  setCurrentTabByRoute,
  syncTabBarSelection
};
