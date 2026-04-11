const tabBarState = require("./state");
const { isLoggedIn, navigateToAuth } = require("../services/api");

const TABS = [
  {
    key: "home",
    pagePath: "/pages/home/index",
    route: "pages/home/index",
    text: "首页",
    iconPath: "/assets/tabbar/home.png",
    selectedIconPath: "/assets/tabbar/home-active.png"
  },
  {
    key: "leaderboard",
    pagePath: "/pages/leaderboard/index",
    route: "pages/leaderboard/index",
    text: "排行榜",
    iconPath: "/assets/tabbar/leaderboard.png",
    selectedIconPath: "/assets/tabbar/leaderboard-active.png"
  },
  {
    key: "records",
    pagePath: "/pages/records/index",
    route: "pages/records/index",
    text: "记录",
    iconPath: "/assets/tabbar/records.png",
    selectedIconPath: "/assets/tabbar/records-active.png"
  },
  {
    key: "profile",
    pagePath: "/pages/profile/index",
    route: "pages/profile/index",
    text: "我的",
    iconPath: "/assets/tabbar/profile.png",
    selectedIconPath: "/assets/tabbar/profile-active.png"
  }
];

Component({
  data: {
    selected: tabBarState.getCurrentTabKey() || tabBarState.DEFAULT_TAB_KEY,
    overlayVisible: false,
    leftTabs: TABS.slice(0, 2),
    rightTabs: TABS.slice(2)
  },
  lifetimes: {
    attached() {
      this.syncSelected();
    }
  },
  pageLifetimes: {
    show() {
      this.syncSelected();
    }
  },
  methods: {
    syncSelected() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage && currentPage.route ? currentPage.route : "";
      const selected = tabBarState.resolveSelectedTab({
        route,
        currentTabKey: tabBarState.getCurrentTabKey()
      });
      tabBarState.setCurrentTabByRoute(route || selected);
      if (this.data.selected !== selected) {
        this.setData({ selected });
      }
    },
    onTabTap(event) {
      const pagePath = event.currentTarget.dataset.pagePath;
      if (!pagePath) {
        return;
      }
      const selected = tabBarState.setCurrentTabByPagePath(pagePath);
      if (this.data.selected !== selected) {
        this.setData({ selected });
      }
      wx.switchTab({ url: pagePath });
    },
    onPlusTap() {
      if (!isLoggedIn()) {
        wx.setStorageSync("records_open_create_overlay", "1");
        navigateToAuth({ targetUrl: "/pages/records/index" });
        return;
      }
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      if (currentPage && currentPage.route === "pages/records/index" && typeof currentPage.openCreateOverlay === "function") {
        currentPage.openCreateOverlay();
        return;
      }
      wx.setStorageSync("records_open_create_overlay", "1");
      const selected = tabBarState.setCurrentTabByPagePath("/pages/records/index");
      if (this.data.selected !== selected) {
        this.setData({ selected });
      }
      wx.switchTab({ url: "/pages/records/index" });
    }
  }
});
