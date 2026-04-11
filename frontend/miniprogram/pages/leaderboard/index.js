const { getLeaderboard, isLoggedIn, navigateToAuth } = require("../../services/api");
const { syncTabBarSelection } = require("../../custom-tab-bar/state");
const { beginPageRefresh, failPageRefresh, finishPageRefresh } = require("../../utils/page-refresh-state");
const { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } = require("../../utils/share");

const SPORTS = ["BILLIARDS", "BADMINTON", "TABLE_TENNIS"];
const CURRENT_MONTH_LABEL = `${new Date().getMonth() + 1} 月`;

function sportLabel(sportType) {
  switch (sportType) {
    case "BADMINTON":
      return "羽毛球";
    case "TABLE_TENNIS":
      return "乒乓球";
    default:
      return "台球";
  }
}

Page({
  data: {
    sports: [
      { value: "BILLIARDS", label: "🎱 台球" },
      { value: "BADMINTON", label: "🏸 羽毛球" },
      { value: "TABLE_TENNIS", label: "🏓 乒乓球" }
    ],
    activeSport: "BILLIARDS",
    currentMonthLabel: CURRENT_MONTH_LABEL,
    currentSportLabel: "🎱 台球",
    loading: true,
    refreshing: false,
    pageReady: false,
    loggedIn: false,
    ranked: [],
    provisional: [],
    topThree: []
  },
  onLoad(options) {
    const sportType = options && options.sportType;
    if (SPORTS.includes(sportType)) {
      this.setData({
        activeSport: sportType,
        currentSportLabel: this.data.sports.find((item) => item.value === sportType)?.label || "🎱 台球"
      });
    }
  },
  onShow() {
    enablePageShareMenu();
    syncTabBarSelection(this, "pages/leaderboard/index");
    this.setData({ loggedIn: isLoggedIn() });
    this.loadLeaderboard(this.data.activeSport);
  },
  onShareAppMessage() {
    const activeSport = this.data.activeSport;
    return buildShareAppMessage({
      title: `来看看${CURRENT_MONTH_LABEL}${sportLabel(activeSport)}月榜`,
      path: `/pages/leaderboard/index?sportType=${activeSport}`
    });
  },
  onShareTimeline() {
    const activeSport = this.data.activeSport;
    return buildShareTimeline({
      title: `来看看${CURRENT_MONTH_LABEL}${sportLabel(activeSport)}月榜`,
      path: `/pages/leaderboard/index?sportType=${activeSport}`
    });
  },
  async loadLeaderboard(sportType) {
    const hasContent = this.data.pageReady;
    this.setData({
      activeSport: sportType,
      loggedIn: isLoggedIn(),
      ...beginPageRefresh({ hasContent })
    });
    try {
      const response = await getLeaderboard(sportType, { needAuth: false });
      const currentSportLabel = this.data.sports.find((item) => item.value === sportType)?.label || "球类排行榜";
      this.setData({
        currentMonthLabel: CURRENT_MONTH_LABEL,
        currentSportLabel,
        ranked: response.ranked,
        provisional: response.provisional,
        topThree: response.ranked.slice(0, 3),
        ...finishPageRefresh()
      });
    } catch (error) {
      this.setData(failPageRefresh({ hasContent }));
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
    if (!isLoggedIn()) {
      wx.showModal({
        title: "登录后查看球友详情",
        content: "月榜可以先浏览，球友的详细战绩和最近比赛需要登录后查看。",
        confirmText: "去登录",
        success: (result) => {
          if (result.confirm) {
            navigateToAuth({ targetUrl: "/pages/leaderboard/index" });
          }
        }
      });
      return;
    }
    wx.navigateTo({
      url: `/pages/player/index?userId=${userId}&sportType=${this.data.activeSport}`
    });
  }
});
