const { getLeaderboard, requireAuthPage } = require("../../services/api");

const SPORTS = ["BILLIARDS", "BADMINTON", "TABLE_TENNIS"];

Page({
  data: {
    sports: [
      { value: "BILLIARDS", label: "🎱 台球" },
      { value: "BADMINTON", label: "🏸 羽毛球" },
      { value: "TABLE_TENNIS", label: "🏓 乒乓球" }
    ],
    activeSport: "BILLIARDS",
    loading: true,
    ranked: [],
    provisional: []
  },
  onShow() {
    if (!requireAuthPage()) {
      this.setData({ loading: false });
      return;
    }
    this.loadLeaderboard(this.data.activeSport);
  },
  async loadLeaderboard(sportType) {
    this.setData({ activeSport: sportType, loading: true });
    try {
      const response = await getLeaderboard(sportType);
      this.setData({
        ranked: response.ranked,
        provisional: response.provisional,
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "排行榜加载失败", icon: "none" });
    }
  },
  onSportTap(event) {
    const sportType = event.currentTarget.dataset.sportType;
    if (!SPORTS.includes(sportType)) {
      return;
    }
    this.loadLeaderboard(sportType);
  },
  openPlayer(event) {
    const userId = event.currentTarget.dataset.userId;
    wx.navigateTo({
      url: `/pages/player/index?userId=${userId}&sportType=${this.data.activeSport}`
    });
  }
});
