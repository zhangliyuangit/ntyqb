const HOME_SHARE_PATH = "/pages/home/index";
const DEFAULT_SHARE_TITLE = "来你挺有球呗，看看球局动态和月榜";

function normalizeSharePath(path) {
  if (!path) {
    return HOME_SHARE_PATH;
  }
  return path.startsWith("/") ? path : `/${path}`;
}

function getTimelineQuery(path) {
  const normalizedPath = normalizeSharePath(path);
  const queryIndex = normalizedPath.indexOf("?");
  return queryIndex === -1 ? "" : normalizedPath.slice(queryIndex + 1);
}

function enablePageShareMenu() {
  if (typeof wx.showShareMenu !== "function") {
    return;
  }
  try {
    wx.showShareMenu({
      menus: ["shareAppMessage", "shareTimeline"]
    });
  } catch (error) {
    wx.showShareMenu();
  }
}

function buildShareAppMessage(payload) {
  const sharePayload = {
    title: payload.title || DEFAULT_SHARE_TITLE,
    path: normalizeSharePath(payload.path)
  };
  if (payload.imageUrl) {
    sharePayload.imageUrl = payload.imageUrl;
  }
  return sharePayload;
}

function buildShareTimeline(payload) {
  const sharePayload = {
    title: payload.title || DEFAULT_SHARE_TITLE,
    query: getTimelineQuery(payload.path)
  };
  if (payload.imageUrl) {
    sharePayload.imageUrl = payload.imageUrl;
  }
  return sharePayload;
}

module.exports = {
  buildShareAppMessage,
  buildShareTimeline,
  enablePageShareMenu
};
