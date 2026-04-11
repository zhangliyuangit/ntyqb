const {
  cancelMatch,
  confirmMatch,
  createMatch,
  getMe,
  getRecentPlayers,
  isAuthError,
  isLoggedIn,
  listMatches,
  navigateToAuth,
  rejectMatch,
  searchUsers
} = require("../../services/api");
const { syncTabBarSelection } = require("../../custom-tab-bar/state");
const { beginPageRefresh, failPageRefresh, finishPageRefresh } = require("../../utils/page-refresh-state");
const { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } = require("../../utils/share");

const SPORT_OPTIONS = [
  { value: "BILLIARDS", label: "🎱 台球" },
  { value: "BADMINTON", label: "🏸 羽毛球" },
  { value: "TABLE_TENNIS", label: "🏓 乒乓球" }
];

const STORAGE_KEYS = {
  prefillSport: "records_prefill_sport",
  defaultScope: "records_default_scope",
  defaultStatus: "records_default_status",
  openCreateOverlay: "records_open_create_overlay"
};

Page({
  data: {
    loading: true,
    refreshing: false,
    pageReady: false,
    loggedIn: false,
    saving: false,
    createOverlayVisible: false,
    sportOptions: SPORT_OPTIONS,
    activeSport: "BILLIARDS",
    format: "SINGLES",
    winnerSide: "A",
    bestOf: 5,
    winMarginBalls: "",
    remark: "",
    searchKeyword: "",
    searchResults: [],
    recentPlayers: [],
    myUser: null,
    teamA: [],
    teamB: [],
    sets: [
      { aScore: "", bScore: "" },
      { aScore: "", bScore: "" }
    ],
    listScope: "mine",
    listStatus: "",
    matches: []
  },
  onShow() {
    enablePageShareMenu();
    this.syncTabBarOverlay(false);
    const loggedIn = isLoggedIn();
    if (!loggedIn) {
      this.setData({
        loading: false,
        refreshing: false,
        pageReady: false,
        loggedIn: false,
        myUser: null,
        matches: [],
        createOverlayVisible: false
      });
      return;
    }
    this.setData({ loggedIn: true });
    this.bootstrap();
  },
  onShareAppMessage() {
    return buildShareAppMessage({
      title: "来你挺有球呗，记录每一场球局",
      path: "/pages/records/index"
    });
  },
  onShareTimeline() {
    return buildShareTimeline({
      title: "来你挺有球呗，记录每一场球局",
      path: "/pages/records/index"
    });
  },
  onHide() {
    this.cleanupCreateOverlay();
  },
  onUnload() {
    this.cleanupCreateOverlay();
  },
  async bootstrap() {
    this.syncTabBarOverlay(false);
    const hasContent = this.data.pageReady;
    this.setData({
      loggedIn: true,
      ...beginPageRefresh({ hasContent })
    });
    try {
      const presetSport = wx.getStorageSync(STORAGE_KEYS.prefillSport) || this.data.activeSport;
      const presetScope = wx.getStorageSync(STORAGE_KEYS.defaultScope) || this.data.listScope;
      const presetStatus = wx.getStorageSync(STORAGE_KEYS.defaultStatus) || this.data.listStatus;
      const shouldOpenCreateOverlay = !!wx.getStorageSync(STORAGE_KEYS.openCreateOverlay);
      const [me, response] = await Promise.all([
        getMe(),
        listMatches({
          scope: presetScope,
          status: presetStatus
        })
      ]);
      wx.removeStorageSync(STORAGE_KEYS.prefillSport);
      wx.removeStorageSync(STORAGE_KEYS.defaultScope);
      wx.removeStorageSync(STORAGE_KEYS.defaultStatus);
      wx.removeStorageSync(STORAGE_KEYS.openCreateOverlay);
      this.setData({
        myUser: me.user,
        activeSport: presetSport,
        listScope: presetScope,
        listStatus: presetStatus,
        teamA: [me.user],
        matches: response.items,
        ...finishPageRefresh()
      });
      if (shouldOpenCreateOverlay) {
        await this.openCreateOverlay();
      }
    } catch (error) {
      if (isAuthError(error)) {
        this.setData({
          loading: false,
          refreshing: false,
          pageReady: false,
          loggedIn: false,
          myUser: null,
          matches: []
        });
        return;
      }
      this.setData(failPageRefresh({ hasContent }));
      wx.showToast({ title: "记录页加载失败", icon: "none" });
    }
  },
  noop() {},
  syncTabBarOverlay(visible) {
    syncTabBarSelection(this, "pages/records/index", { overlayVisible: visible });
  },
  async openCreateOverlay() {
    if (!isLoggedIn()) {
      wx.setStorageSync(STORAGE_KEYS.openCreateOverlay, "1");
      navigateToAuth({ targetUrl: "/pages/records/index" });
      return;
    }
    if (!this.data.myUser) {
      wx.showToast({ title: "页面还在加载", icon: "none" });
      return;
    }
    this.resetForm();
    this.setData({ createOverlayVisible: true });
    this.syncTabBarOverlay(true);
    await this.loadRecentPlayers();
  },
  closeCreateOverlay() {
    if (this.data.saving) {
      return;
    }
    this.cleanupCreateOverlay();
  },
  cleanupCreateOverlay() {
    if (!this.data.createOverlayVisible) {
      this.syncTabBarOverlay(false);
      return;
    }
    this.setData({ createOverlayVisible: false });
    this.syncTabBarOverlay(false);
    this.resetForm();
  },
  async loadRecentPlayers() {
    try {
      const recentPlayers = await getRecentPlayers(this.data.activeSport);
      this.setData({ recentPlayers });
    } catch (error) {
      this.setData({ recentPlayers: [] });
    }
  },
  async loadMatches() {
    try {
      const response = await listMatches({
        scope: this.data.listScope,
        status: this.data.listStatus
      });
      this.setData({ matches: response.items });
    } catch (error) {
      if (isAuthError(error)) {
        this.setData({
          loading: false,
          refreshing: false,
          pageReady: false,
          loggedIn: false,
          myUser: null,
          matches: []
        });
        return;
      }
      wx.showToast({ title: "记录列表加载失败", icon: "none" });
    }
  },
  async onSportTap(event) {
    const sportType = event.currentTarget.dataset.sportType;
    this.setData({
      activeSport: sportType,
      format: sportType === "BADMINTON" ? this.data.format : "SINGLES",
      winnerSide: "A",
      winMarginBalls: "",
      bestOf: 5,
      sets: [
        { aScore: "", bScore: "" },
        { aScore: "", bScore: "" }
      ],
      teamB: [],
      teamA: this.data.myUser ? [this.data.myUser] : [],
      searchKeyword: "",
      searchResults: []
    });
    await this.loadRecentPlayers();
  },
  onFormatTap(event) {
    const format = event.currentTarget.dataset.format;
    const teamA = this.data.myUser ? [this.data.myUser] : [];
    this.setData({
      format,
      teamA,
      teamB: []
    });
  },
  onWinnerTap(event) {
    this.setData({ winnerSide: event.currentTarget.dataset.side });
  },
  onBestOfTap(event) {
    this.setData({ bestOf: Number(event.currentTarget.dataset.value) });
  },
  onInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({ [field]: event.detail.value });
  },
  onSetInput(event) {
    const index = Number(event.currentTarget.dataset.index);
    const field = event.currentTarget.dataset.field;
    const sets = [...this.data.sets];
    sets[index][field] = event.detail.value;
    this.setData({ sets });
  },
  addSet() {
    const limit = this.data.activeSport === "TABLE_TENNIS" ? this.data.bestOf : 3;
    if (this.data.sets.length >= limit) {
      return;
    }
    this.setData({
      sets: [...this.data.sets, { aScore: "", bScore: "" }]
    });
  },
  removeSet() {
    if (this.data.sets.length <= 1) {
      return;
    }
    this.setData({
      sets: this.data.sets.slice(0, -1)
    });
  },
  async onSearchConfirm() {
    if (!this.data.searchKeyword.trim()) {
      this.setData({ searchResults: [] });
      return;
    }
    try {
      const searchResults = await searchUsers(this.data.searchKeyword.trim());
      this.setData({ searchResults });
    } catch (error) {
      wx.showToast({ title: "搜索失败", icon: "none" });
    }
  },
  chooseRecent(event) {
    const player = this.data.recentPlayers.find((item) => item.id === Number(event.currentTarget.dataset.playerId));
    if (!player) {
      return;
    }
    this.applyPlayer({
      id: player.id,
      nickname: player.nickname,
      avatarUrl: player.avatarUrl,
      tag: player.tag
    });
  },
  chooseSearchResult(event) {
    const player = this.data.searchResults.find((item) => item.id === Number(event.currentTarget.dataset.playerId));
    if (!player) {
      return;
    }
    this.applyPlayer(player);
  },
  removePlayer(event) {
    const team = event.currentTarget.dataset.team;
    const userId = Number(event.currentTarget.dataset.userId);
    if (team === "teamA") {
      this.setData({
        teamA: this.data.teamA.filter((item) => item.id !== userId)
      });
      return;
    }
    this.setData({
      teamB: this.data.teamB.filter((item) => item.id !== userId)
    });
  },
  async submitMatch() {
    try {
      const payload = this.buildPayload();
      this.setData({ saving: true });
      await createMatch(payload);
      wx.showToast({ title: "已发起，等待确认", icon: "success" });
      this.cleanupCreateOverlay();
      await this.loadMatches();
    } catch (error) {
      wx.showToast({ title: error.message || "提交失败", icon: "none" });
    } finally {
      this.setData({ saving: false });
    }
  },
  async onMatchConfirm(event) {
    try {
      await confirmMatch(event.detail.matchId);
      wx.showToast({ title: "已确认", icon: "success" });
      await this.loadMatches();
    } catch (error) {
      wx.showToast({ title: "确认失败", icon: "none" });
    }
  },
  async onMatchReject(event) {
    try {
      await rejectMatch(event.detail.matchId);
      wx.showToast({ title: "已拒绝", icon: "success" });
      await this.loadMatches();
    } catch (error) {
      wx.showToast({ title: "拒绝失败", icon: "none" });
    }
  },
  async onMatchCancel(event) {
    try {
      await cancelMatch(event.detail.matchId);
      wx.showToast({ title: "已取消", icon: "success" });
      await this.loadMatches();
    } catch (error) {
      wx.showToast({ title: "取消失败", icon: "none" });
    }
  },
  async onScopeTap(event) {
    this.setData({ listScope: event.currentTarget.dataset.scope });
    await this.loadMatches();
  },
  async onStatusTap(event) {
    const nextStatus = event.currentTarget.dataset.status;
    this.setData({ listStatus: this.data.listStatus === nextStatus ? "" : nextStatus });
    await this.loadMatches();
  },
  onLoginTap() {
    navigateToAuth({ targetUrl: "/pages/records/index" });
  },
  applyPlayer(player) {
    const teamA = [...this.data.teamA];
    const teamB = [...this.data.teamB];
    const allIds = [...teamA, ...teamB].map((item) => item.id);
    if (allIds.includes(player.id)) {
      wx.showToast({ title: "已经选过这个球友", icon: "none" });
      return;
    }

    const aLimit = this.data.activeSport === "BADMINTON" && this.data.format === "DOUBLES" ? 2 : 1;
    const bLimit = this.data.activeSport === "BADMINTON" && this.data.format === "DOUBLES" ? 2 : 1;

    if (teamA.length < aLimit) {
      teamA.push(player);
      this.setData({ teamA });
      return;
    }
    if (teamB.length < bLimit) {
      teamB.push(player);
      this.setData({ teamB });
      return;
    }
    wx.showToast({ title: "参赛人数已满", icon: "none" });
  },
  buildPayload() {
    if (!this.data.myUser) {
      throw new Error("当前用户未加载完成");
    }
    const teamAIds = this.data.teamA.map((item) => item.id);
    const teamBIds = this.data.teamB.map((item) => item.id);
    if (!teamBIds.length) {
      throw new Error("请先选择对手");
    }
    if (this.data.activeSport === "BADMINTON" && this.data.format === "DOUBLES" && (teamAIds.length !== 2 || teamBIds.length !== 2)) {
      throw new Error("羽毛球双打必须补齐 4 人");
    }
    if (this.data.activeSport !== "BADMINTON" && (teamAIds.length !== 1 || teamBIds.length !== 1)) {
      throw new Error("当前项目仅支持 1v1");
    }

    if (this.data.activeSport === "BILLIARDS") {
      const winMarginText = `${this.data.winMarginBalls}`.trim();
      if (winMarginText === "") {
        throw new Error("请填写台球净胜球");
      }
      return {
        sportType: this.data.activeSport,
        format: "SINGLES",
        winnerSide: this.data.winnerSide,
        participantIdsA: teamAIds,
        participantIdsB: teamBIds,
        winMarginBalls: Number(winMarginText),
        remark: this.data.remark
      };
    }

    const sets = this.data.sets
      .filter((item) => item.aScore !== "" && item.bScore !== "")
      .map((item) => ({
        aScore: Number(item.aScore),
        bScore: Number(item.bScore)
      }));
    if (!sets.length) {
      throw new Error("请至少填写一局比分");
    }

    if (this.data.activeSport === "TABLE_TENNIS") {
      return {
        sportType: this.data.activeSport,
        format: "SINGLES",
        winnerSide: this.data.winnerSide,
        participantIdsA: teamAIds,
        participantIdsB: teamBIds,
        bestOf: Number(this.data.bestOf),
        sets,
        remark: this.data.remark
      };
    }

    return {
      sportType: this.data.activeSport,
      format: this.data.format,
      winnerSide: this.data.winnerSide,
      participantIdsA: teamAIds,
      participantIdsB: teamBIds,
      sets,
      remark: this.data.remark
    };
  },
  resetForm() {
    this.setData({
      format: this.data.activeSport === "BADMINTON" ? this.data.format : "SINGLES",
      winnerSide: "A",
      bestOf: 5,
      winMarginBalls: "",
      remark: "",
      teamA: this.data.myUser ? [this.data.myUser] : [],
      teamB: [],
      searchKeyword: "",
      searchResults: [],
      recentPlayers: [],
      sets: [
        { aScore: "", bScore: "" },
        { aScore: "", bScore: "" }
      ]
    });
  }
});
