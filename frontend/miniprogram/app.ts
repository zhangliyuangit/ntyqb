import { restoreSession } from "./services/api";

App<IAppOption>({
  globalData: {
    apiBaseUrl: "http://39.102.100.241/api",
    token: "",
    user: null
  },
  onLaunch() {
    restoreSession();
  }
});
