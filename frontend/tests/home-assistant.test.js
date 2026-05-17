const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("home page renders assistant entry only for logged-in users", () => {
  const wxml = read("miniprogram/pages/home/index.wxml");

  assert.equal(wxml.includes('wx:if="{{loggedIn}}" class="assistant-entry section"'), true);
  assert.equal(wxml.includes('bindtap="openAssistant"'), true);
  assert.equal(wxml.includes("记录助手"), true);
  assert.equal(wxml.includes("一句话添加或查询球局"), true);
});

test("home page assistant bottom sheet has chat structure", () => {
  const wxml = read("miniprogram/pages/home/index.wxml");

  assert.equal(wxml.includes('wx:if="{{assistantVisible}}" class="assistant-overlay"'), true);
  assert.equal(wxml.includes('class="assistant-sheet"'), true);
  assert.equal(wxml.includes('wx:for="{{assistantMessages}}"'), true);
  assert.equal(wxml.includes('value="{{assistantInput}}"'), true);
  assert.equal(wxml.includes('bindtap="sendAssistantMessage"'), true);
  assert.equal(wxml.includes('bindtap="closeAssistant"'), true);
});

test("home page assistant state and handlers are defined", () => {
  const source = read("miniprogram/pages/home/index.ts");

  assert.equal(source.includes("assistantVisible: false"), true);
  assert.equal(source.includes("assistantMessages:"), true);
  assert.equal(source.includes("assistantSuggestions:"), true);
  assert.equal(source.includes("openAssistant()"), true);
  assert.equal(source.includes("closeAssistant()"), true);
  assert.equal(source.includes("onAssistantInput"), true);
  assert.equal(source.includes("sendAssistantMessage"), true);
});

test("home page assistant styles include sheet and entry classes", () => {
  const wxss = read("miniprogram/pages/home/index.wxss");

  assert.equal(wxss.includes(".assistant-entry"), true);
  assert.equal(wxss.includes(".assistant-overlay"), true);
  assert.equal(wxss.includes(".assistant-sheet"), true);
  assert.equal(wxss.includes("height: 78vh"), true);
  assert.equal(wxss.includes(".assistant-input-bar"), true);
});
