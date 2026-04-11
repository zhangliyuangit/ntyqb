const { getPlayerProfile, isAuthError, isLoggedIn, navigateToAuth } = require("../../services/api");
const { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } = require("../../utils/share");

function sportLabel(sportType) {
  switch (sportType) {
    case "BADMINTON":
      return "羽毛球";
    case "TABLE_TENNIS":
      return "乒乓球";
    default:
      return "台球";
  }
}

Page({
  data: {
    loading: true,
    loggedIn: false,
    userId: 0,
    sportType: "BILLIARDS",
    profile: null
  },
  onLoad(options) {
    this.setData({
      userId: Number(options.userId || 0),
      sportType: options.sportType || "BILLIARDS"
    });
  },
  onShow() {
    enablePageShareMenu();
    if (!isLoggedIn()) {
      this.setData({ loading: false, loggedIn: false });
      return;
    }
    this.setData({ loading: true, loggedIn: true });
    this.loadProfile();
  },
  onShareAppMessage() {
    const title = this.data.profile
      ? `来看看${this.data.profile.user.nickname}的${sportLabel(this.data.sportType)}战绩`
      : `来你挺有球呗看看${sportLabel(this.data.sportType)}球友战绩`;
    return buildShareAppMessage({
      title,
      path: `/pages/player/index?userId=${this.data.userId}&sportType=${this.data.sportType}`
    });
  },
  onShareTimeline() {
    const title = this.data.profile
      ? `来看看${this.data.profile.user.nickname}的${sportLabel(this.data.sportType)}战绩`
      : `来你挺有球呗看看${sportLabel(this.data.sportType)}球友战绩`;
    return buildShareTimeline({
      title,
      path: `/pages/player/index?userId=${this.data.userId}&sportType=${this.data.sportType}`
    });
  },
  async loadProfile() {
    try {
      const profile = await getPlayerProfile(this.data.userId, this.data.sportType);
      this.setData({ profile, loading: false, loggedIn: true });
    } catch (error) {
      if (isAuthError(error)) {
        this.setData({ loading: false, loggedIn: false, profile: null });
        return;
      }
      this.setData({ loading: false });
      wx.showToast({ title: "球友资料加载失败", icon: "none" });
    }
  },
  onSportTap(event) {
    this.setData({ sportType: event.currentTarget.dataset.sportType });
    if (!this.data.loggedIn) {
      return;
    }
    this.loadProfile();
  },
  onLoginTap() {
    navigateToAuth({
      targetUrl: `/pages/player/index?userId=${this.data.userId}&sportType=${this.data.sportType}`
    });
  }
});
