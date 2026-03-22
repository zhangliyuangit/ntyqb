const { getMe, listMatches, logout, requireAuthPage } = require("../../services/api");

Page({
  data: {
    loading: true,
    me: null,
    stats: [],
    statsCollapsed: false,
    activeSport: "BILLIARDS",
    matches: []
  },
  onShow() {
    if (!requireAuthPage()) {
      this.setData({ loading: false });
      return;
    }
    this.loadPage();
  },
  async loadPage() {
    this.setData({ loading: true });
    try {
      const me = await getMe();
      this.setData({
        me: me.user,
        stats: me.stats,
        loading: false
      });
      await this.loadMatches(this.data.activeSport);
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "个人页加载失败", icon: "none" });
    }
  },
  async loadMatches(sportType) {
    const response = await listMatches({
      scope: "mine",
      sportType,
      status: "CONFIRMED"
    });
    this.setData({
      activeSport: sportType,
      matches: response.items
    });
  },
  onSportTap(event) {
    this.loadMatches(event.currentTarget.dataset.sportType);
  },
  onToggleStats() {
    this.setData({
      statsCollapsed: !this.data.statsCollapsed
    });
  },
  async onLogout() {
    await logout();
  }
});
