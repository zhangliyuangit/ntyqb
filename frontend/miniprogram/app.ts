import { restoreSession } from "./services/api";

App<IAppOption>({
  globalData: {
    apiBaseUrl: "https://niyoushashilia.cloud/api",
    token: "",
    user: null
  },
  onLaunch() {
    restoreSession();
  }
});
