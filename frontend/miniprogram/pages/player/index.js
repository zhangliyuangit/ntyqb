const { getPlayerProfile, requireAuthPage } = require("../../services/api");

Page({
  data: {
    loading: true,
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
    if (!requireAuthPage()) {
      this.setData({ loading: false });
      return;
    }
    this.loadProfile();
  },
  async loadProfile() {
    try {
      const profile = await getPlayerProfile(this.data.userId, this.data.sportType);
      this.setData({ profile, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "球友资料加载失败", icon: "none" });
    }
  },
  onSportTap(event) {
    this.setData({ sportType: event.currentTarget.dataset.sportType });
    this.loadProfile();
  }
});
