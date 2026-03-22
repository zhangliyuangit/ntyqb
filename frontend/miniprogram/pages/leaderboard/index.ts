import { getLeaderboard, requireAuthPage } from "../../services/api";
import type { SportType } from "../../types/models";

const SPORTS: SportType[] = ["BILLIARDS", "BADMINTON", "TABLE_TENNIS"];

Page({
  data: {
    sports: [
      { value: "BILLIARDS", label: "🎱 台球" },
      { value: "BADMINTON", label: "🏸 羽毛球" },
      { value: "TABLE_TENNIS", label: "🏓 乒乓球" }
    ],
    activeSport: "BILLIARDS",
    currentSportLabel: "🎱 台球",
    loading: true,
    ranked: [],
    provisional: [],
    topThree: []
  },
  onShow() {
    if (!requireAuthPage()) {
      this.setData({ loading: false });
      return;
    }
    this.loadLeaderboard(this.data.activeSport as SportType);
  },
  async loadLeaderboard(sportType: SportType) {
    this.setData({ activeSport: sportType, loading: true });
    try {
      const response = await getLeaderboard(sportType);
      const currentSportLabel = this.data.sports.find((item: any) => item.value === sportType)?.label || "球类排行榜";
      this.setData({
        currentSportLabel,
        ranked: response.ranked,
        provisional: response.provisional,
        topThree: response.ranked.slice(0, 3),
        loading: false
      });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "排行榜加载失败", icon: "none" });
    }
  },
  onSportTap(event: WechatMiniprogram.BaseEvent) {
    const sportType = event.currentTarget.dataset.sportType as SportType;
    if (!SPORTS.includes(sportType)) {
      return;
    }
    this.loadLeaderboard(sportType);
  },
  openPlayer(event: WechatMiniprogram.BaseEvent) {
    const userId = event.currentTarget.dataset.userId;
    wx.navigateTo({
      url: `/pages/player/index?userId=${userId}&sportType=${this.data.activeSport}`
    });
  }
});
