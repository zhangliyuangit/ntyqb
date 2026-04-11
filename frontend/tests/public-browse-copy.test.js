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
