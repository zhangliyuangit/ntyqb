import { getMe, listMatches, requireAuthPage } from "../../services/api";
import { detailSummary, formatDate, sportDisplayLabel, statusLabel, teamText } from "../../utils/format";
import type { MatchDetail } from "../../types/models";

function buildLatestMatch(match?: MatchDetail | null) {
  if (!match) {
    return null;
  }
  return {
    sportText: sportDisplayLabel(match.sportType),
    statusText: statusLabel(match.status),
    teamLine: `${teamText(match, "A")} vs ${teamText(match, "B")}`,
    detailText: detailSummary(match),
    timeText: formatDate(match.occurredAt)
  };
}

Page({
  data: {
    loading: true,
    errorMessage: "",
    matches: [],
    userName: "球友",
    homeSummary: "",
    latestMatch: null,
    pendingCount: 0
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
      const [me, data] = await Promise.all([
        getMe(),
        listMatches({
          scope: "all"
        })
      ]);
      const pendingCount = me.pendingConfirmations.length;
      const homeSummary = pendingCount
        ? `你有 ${pendingCount} 场比赛待确认，先把今天的球局结清楚。`
        : me.recentMatches.length
          ? "最近大家都在打球，首页先帮你把最新动态和下一步动作摆在前面。"
          : "从这里发起第一场记录，把小圈子的球局慢慢沉淀下来。";
      this.setData({
        matches: data.items,
        userName: me.user.nickname || "球友",
        homeSummary,
        latestMatch: buildLatestMatch(data.items[0]),
        pendingCount,
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
