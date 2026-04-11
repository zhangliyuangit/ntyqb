import { getMe, isAuthError, isLoggedIn, listMatches } from "../../services/api";
import { syncTabBarSelection } from "../../custom-tab-bar/state";
import { beginPageRefresh, failPageRefresh, finishPageRefresh } from "../../utils/page-refresh-state";
import { detailSummary, formatDate, sportDisplayLabel, statusLabel, teamText } from "../../utils/format";
import { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } from "../../utils/share";
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
    refreshing: false,
    pageReady: false,
    loggedIn: false,
    errorMessage: "",
    matches: [],
    userName: "球友",
    homeSummary: "",
    latestMatch: null,
    pendingCount: 0
  },
  onShow() {
    enablePageShareMenu();
    syncTabBarSelection(this, "pages/home/index");
    this.loadPage();
  },
  onShareAppMessage() {
    return buildShareAppMessage({
      title: "来你挺有球呗，看看最新球局和月榜",
      path: "/pages/home/index"
    });
  },
  onShareTimeline() {
    return buildShareTimeline({
      title: "来你挺有球呗，看看最新球局和月榜",
      path: "/pages/home/index"
    });
  },
  async loadPage() {
    const loggedIn = isLoggedIn();
    const hasContent = this.data.pageReady;
    this.setData({
      ...beginPageRefresh({ hasContent }),
      loggedIn,
      errorMessage: hasContent ? this.data.errorMessage : ""
    });
    try {
      if (loggedIn) {
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
          loggedIn: true,
          ...finishPageRefresh(),
          errorMessage: ""
        });
        return;
      }

      await this.loadPublicHome(hasContent);
    } catch (error: any) {
      if (isAuthError(error)) {
        try {
          await this.loadPublicHome(hasContent);
        } catch (fallbackError: any) {
          const message = fallbackError?.message || "加载失败，请确认后端服务和开发者工具配置";
          this.setData({
            ...failPageRefresh({ hasContent }),
            errorMessage: hasContent ? "" : message
          });
          wx.showToast({ title: "加载失败", icon: "none" });
        }
        return;
      }
      const message = error?.message || "加载失败，请确认后端服务和开发者工具配置";
      this.setData({
        ...failPageRefresh({ hasContent }),
        errorMessage: hasContent ? "" : message
      });
      wx.showToast({ title: "加载失败", icon: "none" });
    }
  },
  retryLoad() {
    this.loadPage();
  },
  async loadPublicHome(hasContent: boolean) {
    const data = await listMatches(
      {
        scope: "all",
        status: "CONFIRMED"
      },
      {
        needAuth: false
      }
    );
    this.setData({
      matches: data.items,
      userName: "游客",
      homeSummary: data.items.length
        ? "最近大家都在打球，首页先把最新球局摆在前面。"
        : "暂时还没有新的球局动态。",
      latestMatch: buildLatestMatch(data.items[0]),
      pendingCount: 0,
      loggedIn: false,
      ...finishPageRefresh(),
      errorMessage: hasContent ? "" : ""
    });
  }
});
