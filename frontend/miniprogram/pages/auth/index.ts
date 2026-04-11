import {
  cancelAuthNavigation,
  clearAuth,
  clearSavedAuthProfile,
  completeAuthNavigation,
  getMe,
  getSavedAuthProfile,
  hasToken,
  loginWithWechatProfile,
  switchToHome
} from "../../services/api";
import { isTemporaryAvatarUrl } from "../../utils/avatar-url";
import { buildShareAppMessage, buildShareTimeline, enablePageShareMenu } from "../../utils/share";

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
    enablePageShareMenu();
    if (hasToken()) {
      completeAuthNavigation();
      return;
    }
    this.syncAuthState();
  },
  onShareAppMessage() {
    return buildShareAppMessage({
      title: "来你挺有球呗，先逛首页和月榜",
      path: "/pages/home/index"
    });
  },
  onShareTimeline() {
    return buildShareTimeline({
      title: "来你挺有球呗，先逛首页和月榜",
      path: "/pages/home/index"
    });
  },
  syncAuthState() {
    const rawSavedProfile = getSavedAuthProfile();
    const savedProfile = rawSavedProfile && !isTemporaryAvatarUrl(rawSavedProfile.avatarUrl)
      ? rawSavedProfile
      : null;
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
      completeAuthNavigation();
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
  },
  onBrowseFirst() {
    cancelAuthNavigation();
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    switchToHome();
  }
});
