import {
  clearAuth,
  clearSavedAuthProfile,
  getMe,
  getSavedAuthProfile,
  hasToken,
  loginWithWechatProfile,
  switchToHome
} from "../../services/api";

Page({
  data: {
    nickname: "",
    avatarUrl: "",
    loading: false,
    errorMessage: "",
    savedProfile: null,
    isFirstAuth: true
  },
  onShow() {
    if (hasToken()) {
      switchToHome();
      return;
    }
    this.syncAuthState();
  },
  syncAuthState() {
    const savedProfile = getSavedAuthProfile();
    this.setData({
      savedProfile,
      isFirstAuth: !savedProfile,
      nickname: savedProfile ? savedProfile.nickname : "",
      avatarUrl: savedProfile ? savedProfile.avatarUrl : "",
      errorMessage: "",
      loading: false
    });
  },
  onChooseAvatar(event: WechatMiniprogram.CustomEvent) {
    if (!this.data.isFirstAuth) {
      return;
    }
    const avatarUrl = event.detail.avatarUrl || "";
    this.setData({
      avatarUrl,
      errorMessage: ""
    });
  },
  onNicknameInput(event: WechatMiniprogram.CustomEvent) {
    if (!this.data.isFirstAuth) {
      return;
    }
    const nickname = event.detail.value || "";
    this.setData({
      nickname,
      errorMessage: ""
    });
  },
  onResetProfile() {
    clearSavedAuthProfile();
    this.syncAuthState();
  },
  async onSubmit() {
    const profile = this.data.savedProfile || {
      nickname: (this.data.nickname || "").trim(),
      avatarUrl: (this.data.avatarUrl || "").trim()
    };

    if (!profile.nickname) {
      this.setData({ errorMessage: "请先填写微信昵称" });
      return;
    }
    if (!profile.avatarUrl) {
      this.setData({ errorMessage: "请先选择微信头像" });
      return;
    }

    this.setData({ loading: true, errorMessage: "" });

    try {
      await loginWithWechatProfile(profile);
      await getMe();
      switchToHome();
    } catch (error: any) {
      clearAuth();
      const message = error?.message || "登录失败，请稍后重试";
      this.setData({ errorMessage: message });
      wx.showToast({
        title: "登录失败",
        icon: "none"
      });
    } finally {
      this.setData({ loading: false });
    }
  }
});
