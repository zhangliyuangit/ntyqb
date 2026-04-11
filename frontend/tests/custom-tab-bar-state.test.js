const test = require("node:test");
const assert = require("node:assert/strict");

const { resolveSelectedTab } = require("../miniprogram/custom-tab-bar/state");

test("resolves the selected tab from the active route", () => {
  assert.equal(resolveSelectedTab({ route: "pages/profile/index" }), "profile");
  assert.equal(resolveSelectedTab({ route: "pages/leaderboard/index" }), "leaderboard");
});

test("uses the pending page path so the next tab highlights before switchTab finishes", () => {
  assert.equal(
    resolveSelectedTab({
      route: "pages/home/index",
      pendingPagePath: "/pages/profile/index"
    }),
    "profile"
  );
});

test("reuses the last known tab when the destination page is attaching without a route yet", () => {
  assert.equal(
    resolveSelectedTab({
      route: "",
      currentTabKey: "profile"
    }),
    "profile"
  );
});

test("falls back to home when no tab can be resolved", () => {
  assert.equal(resolveSelectedTab({ route: "pages/player/index" }), "home");
});
