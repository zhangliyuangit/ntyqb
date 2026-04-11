import { getMe, isAuthError, isLoggedIn, listMatches, logout, navigateToAuth } from "../../services/api";
import { syncTabBarSelection } from "../../custom-tab-bar/state";
import { beginPageRefresh, failPageRefresh, finishPageRefresh } from "../../utils/page-refresh-state";
import { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } from "../../utils/share";
import type { SportType } from "../../types/models";

Page({
  data: {
    loading: true,
    refreshing: false,
    pageReady: false,
    loggedIn: false,
    me: null,
    stats: [],
    statsCollapsed: false,
    activeSport: "BILLIARDS",
    matches: []
  },
  onShow() {
    enablePageShareMenu();
    syncTabBarSelection(this, "pages/profile/index");
    if (!isLoggedIn()) {
      this.setData({
        loading: false,
        refreshing: false,
        pageReady: false,
        loggedIn: false,
        me: null,
        stats: [],
        matches: []
      });
      return;
    }
    this.setData({ loggedIn: true });
    this.loadPage();
  },
  onShareAppMessage() {
    return buildShareAppMessage({
      title: "来你挺有球呗，沉淀你的球局战绩",
      path: "/pages/profile/index"
    });
  },
  onShareTimeline() {
    return buildShareTimeline({
      title: "来你挺有球呗，沉淀你的球局战绩",
      path: "/pages/profile/index"
    });
  },
  async loadPage() {
    const hasContent = this.data.pageReady;
    this.setData({
      loggedIn: true,
      ...beginPageRefresh({ hasContent })
    });
    try {
      const [me, response] = await Promise.all([
        getMe(),
        listMatches({
          scope: "mine",
          sportType: this.data.activeSport as SportType,
          status: "CONFIRMED"
        })
      ]);
      this.setData({
        me: me.user,
        stats: me.stats,
        matches: response.items,
        ...finishPageRefresh()
      });
    } catch (error) {
      if (isAuthError(error)) {
        this.setData({
          loading: false,
          refreshing: false,
          pageReady: false,
          loggedIn: false,
          me: null,
          stats: [],
          matches: []
        });
        return;
      }
      this.setData(failPageRefresh({ hasContent }));
      wx.showToast({ title: "个人页加载失败", icon: "none" });
    }
  },
  async loadMatches(sportType: SportType) {
    const hasContent = this.data.pageReady;
    this.setData({
      activeSport: sportType,
      ...beginPageRefresh({ hasContent })
    });
    try {
      const response = await listMatches({
        scope: "mine",
        sportType,
        status: "CONFIRMED"
      });
      this.setData({
        activeSport: sportType,
        matches: response.items,
        ...finishPageRefresh()
      });
    } catch (error) {
      if (isAuthError(error)) {
        this.setData({
          loading: false,
          refreshing: false,
          pageReady: false,
          loggedIn: false,
          me: null,
          stats: [],
          matches: []
        });
        return;
      }
      this.setData(failPageRefresh({ hasContent }));
      wx.showToast({ title: "战绩加载失败", icon: "none" });
    }
  },
  onSportTap(event: WechatMiniprogram.BaseEvent) {
    this.loadMatches(event.currentTarget.dataset.sportType as SportType);
  },
  onToggleStats() {
    this.setData({
      statsCollapsed: !this.data.statsCollapsed
    });
  },
  async onLogout() {
    await logout();
  },
  onLoginTap() {
    navigateToAuth({ targetUrl: "/pages/profile/index" });
  }
});
