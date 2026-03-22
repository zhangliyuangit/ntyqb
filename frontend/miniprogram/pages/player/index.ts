import { getPlayerProfile, requireAuthPage } from "../../services/api";
import type { SportType } from "../../types/models";

Page({
  data: {
    loading: true,
    userId: 0,
    sportType: "BILLIARDS",
    profile: null
  },
  onLoad(options: Record<string, string>) {
    this.setData({
      userId: Number(options.userId || 0),
      sportType: (options.sportType || "BILLIARDS") as SportType
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
      const profile = await getPlayerProfile(this.data.userId, this.data.sportType as SportType);
      this.setData({ profile, loading: false });
    } catch (error) {
      this.setData({ loading: false });
      wx.showToast({ title: "球友资料加载失败", icon: "none" });
    }
  },
  onSportTap(event: WechatMiniprogram.BaseEvent) {
    this.setData({ sportType: event.currentTarget.dataset.sportType });
    this.loadProfile();
  }
});
