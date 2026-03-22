import { listMatches, requireAuthPage } from "../../services/api";

Page({
  data: {
    loading: true,
    errorMessage: "",
    noticeText: "我说白了，你有啥实力啊？？？",
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
    this.setData({ loading: true, errorMessage: "" });
    try {
      const data = await listMatches({
        scope: "all"
      });
      this.setData({
        matches: data.items,
        loading: false,
        errorMessage: ""
      });
    } catch (error: any) {
      const message = error?.message || "加载失败，请确认后端服务和开发者工具配置";
      this.setData({ loading: false, errorMessage: message });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  retryLoad() {
    this.loadPage();
  }
});
