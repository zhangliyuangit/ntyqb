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

  assert.equal(wxml.includes('wx:if="{{loggedIn && assistantVisible}}" class="assistant-overlay"'), true);
  assert.equal(wxml.includes('class="assistant-sheet"'), true);
  assert.equal(wxml.includes('wx:for="{{assistantMessages}}"'), true);
  assert.equal(wxml.includes('value="{{assistantInput}}"'), true);
  assert.equal(wxml.includes('bindtap="sendAssistantMessage"'), true);
  assert.equal(wxml.includes('bindtap="closeAssistant"'), true);
});

test("home page assistant state and handlers are defined", () => {
  for (const sourcePath of [
    "miniprogram/pages/home/index.ts",
    "miniprogram/pages/home/index.js"
  ]) {
    const source = read(sourcePath);

    assert.equal(source.includes("assistantVisible: false"), true, `${sourcePath} should initialize assistantVisible`);
    assert.equal(source.includes("assistantMessages:"), true, `${sourcePath} should initialize assistantMessages`);
    assert.equal(source.includes("assistantSuggestions:"), true, `${sourcePath} should initialize assistantSuggestions`);
    assert.equal(source.includes("openAssistant()"), true, `${sourcePath} should define openAssistant`);
    assert.equal(source.includes("closeAssistant()"), true, `${sourcePath} should define closeAssistant`);
    assert.equal(source.includes("onAssistantInput"), true, `${sourcePath} should define onAssistantInput`);
    assert.equal(source.includes("sendAssistantMessage"), true, `${sourcePath} should define sendAssistantMessage`);
  }
});

test("home page assistant resets when falling back to public mode", () => {
  for (const sourcePath of [
    "miniprogram/pages/home/index.ts",
    "miniprogram/pages/home/index.js"
  ]) {
    const source = read(sourcePath);
    const publicHomeStart = source.indexOf("async loadPublicHome");
    assert.notEqual(publicHomeStart, -1, `${sourcePath} should define loadPublicHome`);
    const publicHomeSource = source.slice(publicHomeStart);

    assert.equal(publicHomeSource.includes("assistantVisible: false"), true, `${sourcePath} should hide assistant in public mode`);
    assert.equal(publicHomeSource.includes('assistantInput: ""'), true, `${sourcePath} should clear assistant input in public mode`);
    assert.equal(publicHomeSource.includes("assistantDraftAction: null"), true, `${sourcePath} should clear assistant action in public mode`);
  }
});

test("home page assistant styles include sheet and entry classes", () => {
  const wxss = read("miniprogram/pages/home/index.wxss");

  assert.equal(wxss.includes(".assistant-entry"), true);
  assert.equal(wxss.includes(".assistant-overlay"), true);
  assert.equal(wxss.includes(".assistant-sheet"), true);
  assert.equal(wxss.includes("height: 78vh"), true);
  assert.equal(wxss.includes(".assistant-input-bar"), true);
  assert.equal(wxss.includes(".field-placeholder"), true);
});
