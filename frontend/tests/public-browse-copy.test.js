const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("home page does not render the guest login CTA copy", () => {
  const homeWxml = read("miniprogram/pages/home/index.wxml");
  assert.equal(homeWxml.includes("登录后发起记录"), false);
  assert.equal(homeWxml.includes("游客可先浏览公开内容"), false);
});

test("leaderboard page does not render the guest login CTA copy", () => {
  const leaderboardWxml = read("miniprogram/pages/leaderboard/index.wxml");
  assert.equal(leaderboardWxml.includes("登录后查看球友详情"), false);
});

test("home win-rate module uses sport tabs and the shared sport card", () => {
  const homeWxml = read("miniprogram/pages/home/index.wxml");
  const homeJson = read("miniprogram/pages/home/index.json");
  const homeTs = read("miniprogram/pages/home/index.ts");

  assert.match(homeWxml, /我的胜率/);
  assert.match(homeWxml, /onStatsSportTap/);
  assert.match(homeWxml, /<sport-card wx:if="{{activeHomeStat}}"/);
  assert.equal(homeWxml.includes("按球类切换，只看已确认生效的比赛"), false);
  assert.match(homeJson, /"sport-card"/);
  assert.match(homeTs, /activeStatsSport: "BILLIARDS"/);
});

test("home page does not render the latest match spotlight block", () => {
  const homeWxml = read("miniprogram/pages/home/index.wxml");
  const homeWxss = read("miniprogram/pages/home/index.wxss");
  const homeTs = read("miniprogram/pages/home/index.ts");

  assert.equal(homeWxml.includes("刚刚结束"), false);
  assert.equal(homeWxml.includes("latestMatch"), false);
  assert.equal(homeWxss.includes(".spotlight"), false);
  assert.equal(homeTs.includes("buildLatestMatch"), false);
});

test("sport card uses a compact rate panel instead of a progress bar", () => {
  const sportCardWxml = read("miniprogram/components/sport-card/index.wxml");
  const sportCardWxss = read("miniprogram/components/sport-card/index.wxss");

  assert.match(sportCardWxml, /rate-panel/);
  assert.match(sportCardWxml, /rate-label/);
  assert.equal(sportCardWxml.includes("净胜"), false);
  assert.match(sportCardWxml, /近 10 胜/);
  assert.equal(sportCardWxml.includes("rate-track"), false);
  assert.equal(sportCardWxml.includes("rate-fill"), false);
  assert.equal(sportCardWxss.includes(".rate-track"), false);
  assert.equal(sportCardWxss.includes(".rate-fill"), false);
});

test("home broadcast stays compact and user tags use gold styling", () => {
  const homeWxml = read("miniprogram/pages/home/index.wxml");
  const homeWxss = read("miniprogram/pages/home/index.wxss");
  const appWxss = read("miniprogram/app.wxss");

  assert.equal(homeWxml.includes("notice-detail"), false);
  assert.equal(homeWxss.includes(".notice-detail"), false);
  assert.equal(appWxss.includes("#fff4d6"), true);
  assert.equal(appWxss.includes("#8a5a00"), true);
  assert.equal(appWxss.includes("animation: tag-gold-shine"), true);
  assert.equal(appWxss.includes("@keyframes tag-gold-shine"), true);
});
