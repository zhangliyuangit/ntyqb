const { restoreSession } = require("./services/api");

App({
  globalData: {
    apiBaseUrl: "https://niyoushashilia.cloud/api",
    token: "",
    user: null,
    currentTabKey: "home"
  },
  onLaunch() {
    restoreSession();
  }
});
