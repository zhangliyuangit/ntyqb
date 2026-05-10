const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("records page prioritizes pending confirmations when opening the list", () => {
  const source = read("miniprogram/pages/records/index.ts");
  assert.equal(source.includes("me.pendingConfirmations.length"), true);
  assert.equal(source.includes("pending_confirmation"), true);
});

test("records create overlay preloads a selectable player list", () => {
  const source = read("miniprogram/pages/records/index.ts");
  const wxml = read("miniprogram/pages/records/index.wxml");

  assert.equal(source.includes('searchUsers("")'), true);
  assert.equal(wxml.includes("球友列表"), true);
});

test("records create overlay removes redundant recent opponents", () => {
  const source = read("miniprogram/pages/records/index.ts");
  const wxml = read("miniprogram/pages/records/index.wxml");

  assert.equal(source.includes("getRecentPlayers"), false);
  assert.equal(source.includes("chooseRecent"), false);
  assert.equal(source.includes("recentPlayers"), false);
  assert.equal(wxml.includes("最近对手 / 队友"), false);
});

test("records player picker uses a versus panel and horizontal player cards", () => {
  const wxml = read("miniprogram/pages/records/index.wxml");
  const wxss = read("miniprogram/pages/records/index.wxss");

  assert.equal(wxml.includes("versus-picker"), true);
  assert.equal(wxml.includes("side-panel"), true);
  assert.equal(wxml.includes("player-row"), true);
  assert.equal(wxml.includes("scroll-x class=\"player-results-scroll\""), true);
  assert.equal(wxml.includes("player-card-track"), true);
  assert.equal(wxml.includes("recent-card available-card"), false);
  assert.equal(wxss.includes(".versus-picker"), true);
  assert.equal(wxss.includes(".player-row-action"), true);
  assert.equal(wxss.includes(".player-card-track"), true);
  assert.equal(wxss.includes(".available-card"), false);
});

test("records player picker keeps long lists horizontally scrollable", () => {
  const wxml = read("miniprogram/pages/records/index.wxml");
  const wxss = read("miniprogram/pages/records/index.wxss");

  assert.equal(wxml.includes("scroll-x class=\"player-results-scroll\""), true);
  assert.equal(wxml.includes('wx:elif="{{availablePlayers.length > 0}}"'), true);
  assert.equal(wxml.includes("球友列表 · {{availablePlayers.length}} 人"), true);
  assert.equal(wxss.includes(".player-results-scroll"), true);
  assert.equal(wxss.includes("white-space: nowrap"), true);
  assert.equal(wxss.includes("width: 220rpx"), true);
});

test("records player picker adds light haptics while scrolling and selecting", () => {
  const source = read("miniprogram/pages/records/index.ts");
  const wxml = read("miniprogram/pages/records/index.wxml");
  const haptics = read("miniprogram/utils/haptics.ts");

  assert.equal(source.includes('import { haptic } from "../../utils/haptics"'), true);
  assert.equal(source.includes("onPlayerListScroll"), true);
  assert.equal(source.includes("event.detail.scrollLeft"), true);
  assert.equal(source.includes('haptic("light", 90)'), true);
  assert.equal(source.includes('haptic("medium")'), true);
  assert.equal(source.includes('haptic("heavy")'), true);
  assert.equal(wxml.includes('bindscroll="onPlayerListScroll"'), true);
  assert.equal(haptics.includes("wx.vibrateShort"), true);
  assert.equal(haptics.includes("minIntervalMs"), true);
});

test("records create overlay supports single-game racket matches", () => {
  const source = read("miniprogram/pages/records/index.ts");
  const wxml = read("miniprogram/pages/records/index.wxml");

  assert.equal(source.includes("bestOf: 1"), true);
  assert.equal(wxml.includes('data-value="1"'), true);
  assert.equal(source.includes("{ aScore: \"\", bScore: \"\" },\n      { aScore: \"\", bScore: \"\" }"), false);
});

test("records score entry reduces reversed score mistakes", () => {
  const source = read("miniprogram/pages/records/index.ts");
  const wxml = read("miniprogram/pages/records/index.wxml");

  assert.equal(source.includes("swapSetScore"), true);
  assert.equal(source.includes("scorePreview"), true);
  assert.equal(source.includes("buildTeamName"), true);
  assert.equal(wxml.includes("bindtap=\"swapSetScore\""), true);
  assert.equal(wxml.includes("score-preview"), true);
  assert.equal(wxml.includes("team-score-label"), true);
});

test("records score entry offers common quick score chips", () => {
  const source = read("miniprogram/pages/records/index.ts");
  const wxml = read("miniprogram/pages/records/index.wxml");

  assert.equal(source.includes("quickScoreOptions"), true);
  assert.equal(source.includes("applyQuickScore"), true);
  assert.equal(wxml.includes("quick-score-chip"), true);
  assert.equal(source.includes('label: "11:8"'), true);
  assert.equal(source.includes('label: "9:11"'), true);
});

test("match card runtime keeps action area enabled by default", () => {
  const runtimeSource = read("miniprogram/components/match-card/index.js");

  assert.equal(runtimeSource.includes("showActions"), true);
});

test("records page trims non-essential helper copy", () => {
  const wxml = read("miniprogram/pages/records/index.wxml");

  assert.equal(wxml.includes("记录归记录，发起归发起"), false);
  assert.equal(wxml.includes("点一下就加到参赛名单"), false);
});

test("match card actions use custom view-based controls", () => {
  const wxml = read("miniprogram/components/match-card/index.wxml");

  assert.equal(wxml.includes("<button"), false);
  assert.equal(wxml.includes("action-btn-label"), true);
});
