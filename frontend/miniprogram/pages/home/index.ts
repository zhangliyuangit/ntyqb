import {
  confirmAssistantAction,
  getMe,
  isAuthError,
  isLoggedIn,
  listMatches,
  sendAssistantMessage as sendAssistantChatMessage
} from "../../services/api";
import { syncTabBarSelection } from "../../custom-tab-bar/state";
import { beginPageRefresh, failPageRefresh, finishPageRefresh } from "../../utils/page-refresh-state";
import { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } from "../../utils/share";
import type { SportStat, SportType } from "../../types/models";

const SPORT_OPTIONS = [
  { value: "BILLIARDS", label: "🎱 台球" },
  { value: "BADMINTON", label: "🏸 羽毛球" },
  { value: "TABLE_TENNIS", label: "🏓 乒乓球" }
];

const ASSISTANT_SUGGESTIONS = [
  "我今天台球赢了张三，净胜 3 球",
  "查我最近的台球记录",
  "我有哪些待确认？"
];

function findSportStat(stats: SportStat[], sportType: SportType) {
  return stats.find((item) => item.sportType === sportType) || null;
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
    pendingCount: 0,
    sportOptions: SPORT_OPTIONS,
    homeStats: [],
    activeStatsSport: "BILLIARDS",
    activeHomeStat: null,
    assistantVisible: false,
    assistantInput: "",
    assistantSending: false,
    assistantConversationId: "",
    assistantSuggestions: ASSISTANT_SUGGESTIONS,
    assistantMessages: [
      {
        id: "welcome",
        role: "assistant",
        content: "可以帮你添加比赛、查询战绩、查看待确认。"
      }
    ],
    assistantDraftAction: null
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
          pendingCount,
          homeStats: me.stats,
          activeHomeStat: findSportStat(me.stats, this.data.activeStatsSport as SportType),
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
  openAssistant() {
    if (!this.data.loggedIn) {
      return;
    }
    this.setData({ assistantVisible: true });
  },
  closeAssistant() {
    if (this.data.assistantSending) {
      return;
    }
    this.setData({
      assistantVisible: false,
      assistantInput: "",
      assistantDraftAction: null
    });
  },
  onAssistantInput(event: WechatMiniprogram.Input) {
    this.setData({ assistantInput: event.detail.value });
  },
  useAssistantSuggestion(event: WechatMiniprogram.BaseEvent) {
    const text = event.currentTarget.dataset.text || "";
    this.setData({ assistantInput: text });
  },
  async sendAssistantMessage() {
    const content = `${this.data.assistantInput || ""}`.trim();
    if (!content || this.data.assistantSending) {
      return;
    }
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content
    };
    const currentMessages = this.data.assistantMessages as Array<{ id: string; role: string; content: string }>;
    this.setData({
      assistantInput: "",
      assistantSending: true,
      assistantDraftAction: null,
      assistantMessages: [...currentMessages, userMessage]
    });
    try {
      const response = await sendAssistantChatMessage({
        conversationId: this.data.assistantConversationId || undefined,
        message: content
      });
      this.setData({
        assistantConversationId: response.conversationId,
        assistantDraftAction: response.pendingAction || null,
        assistantMessages: [
          ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
          {
            id: `assistant-${Date.now()}`,
            role: "assistant",
            content: response.reply
          }
        ]
      });
    } catch (error: any) {
      this.setData({
        assistantMessages: [
          ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
          {
            id: `assistant-error-${Date.now()}`,
            role: "assistant",
            content: error?.message || "刚刚没听清，可以换个说法再试一次"
          }
        ]
      });
    } finally {
      this.setData({ assistantSending: false });
    }
  },
  async confirmAssistantDraftAction() {
    const action = this.data.assistantDraftAction as { id: string } | null;
    if (!action || this.data.assistantSending) {
      return;
    }
    this.setData({ assistantSending: true });
    try {
      const response = await confirmAssistantAction(action.id);
      this.setData({
        assistantDraftAction: null,
        assistantMessages: [
          ...(this.data.assistantMessages as Array<{ id: string; role: string; content: string }>),
          {
            id: `assistant-confirm-${Date.now()}`,
            role: "assistant",
            content: response.reply
          }
        ]
      });
      await this.loadPage();
    } catch (error: any) {
      wx.showToast({ title: error?.message || "确认失败", icon: "none" });
    } finally {
      this.setData({ assistantSending: false });
    }
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
      pendingCount: 0,
      homeStats: [],
      activeHomeStat: null,
      loggedIn: false,
      assistantVisible: false,
      assistantInput: "",
      assistantConversationId: "",
      assistantDraftAction: null,
      ...finishPageRefresh(),
      errorMessage: hasContent ? "" : ""
    });
  },
  onStatsSportTap(event: WechatMiniprogram.BaseEvent) {
    const sportType = event.currentTarget.dataset.sportType as SportType;
    this.setData({
      activeStatsSport: sportType,
      activeHomeStat: findSportStat(this.data.homeStats as SportStat[], sportType)
    });
  },
  noop() {
  }
});
