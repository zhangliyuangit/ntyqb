const test = require("node:test");
const assert = require("node:assert/strict");

const {
  AUTH_PAGE_URL,
  HOME_PAGE_URL,
  normalizeAuthRedirectTarget,
  resolvePostLoginNavigation
} = require("../miniprogram/utils/auth-redirect");

test("normalizes missing or auth-page redirects back to home", () => {
  assert.equal(normalizeAuthRedirectTarget(""), HOME_PAGE_URL);
  assert.equal(normalizeAuthRedirectTarget(null), HOME_PAGE_URL);
  assert.equal(normalizeAuthRedirectTarget(AUTH_PAGE_URL), HOME_PAGE_URL);
});

test("keeps tab targets as switchTab destinations after login", () => {
  assert.deepEqual(resolvePostLoginNavigation("/pages/records/index"), {
    method: "switchTab",
    url: "/pages/records/index"
  });
});

test("keeps non-tab targets as redirectTo destinations after login", () => {
  assert.deepEqual(resolvePostLoginNavigation("/pages/player/index?userId=8&sportType=BILLIARDS"), {
    method: "redirectTo",
    url: "/pages/player/index?userId=8&sportType=BILLIARDS"
  });
});
