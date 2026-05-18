const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

function methodSource(source, methodName, nextMethodName) {
  const start = source.indexOf(`${methodName}(`);
  assert.notEqual(start, -1, `should define ${methodName}`);
  const end = source.indexOf(`${nextMethodName}(`, start);
  assert.notEqual(end, -1, `should define ${nextMethodName} after ${methodName}`);
  return source.slice(start, end);
}

function cssBlock(source, selector, nextSelector) {
  const start = source.indexOf(selector);
  assert.notEqual(start, -1, `should define ${selector}`);
  const end = source.indexOf(nextSelector, start + selector.length);
  assert.notEqual(end, -1, `should define ${nextSelector} after ${selector}`);
  return source.slice(start, end);
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
  assert.equal(wxml.includes('class="assistant-sheet" catchtap="noop"'), false);
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
  const inputBarStyle = cssBlock(wxss, ".assistant-input-bar", ".assistant-input");

  assert.equal(wxss.includes(".assistant-entry"), true);
  assert.equal(wxss.includes(".assistant-overlay"), true);
  assert.equal(wxss.includes(".assistant-sheet"), true);
  assert.equal(wxss.includes("height: 78vh"), true);
  assert.equal(wxss.includes(".assistant-input-bar"), true);
  assert.equal(inputBarStyle.includes("position: absolute"), false);
  assert.equal(inputBarStyle.includes("flex: 0 0 auto"), true);
  assert.equal(wxss.includes(".field-placeholder"), true);
});

test("assistant api wrappers are exported", () => {
  const models = read("miniprogram/types/models.ts");

  for (const sourcePath of [
    "miniprogram/services/api.ts",
    "miniprogram/services/api.js"
  ]) {
    const source = read(sourcePath);

    assert.equal(source.includes("sendAssistantMessage"), true, `${sourcePath} should export sendAssistantMessage`);
    assert.equal(source.includes('url: "/assistant/chat"'), true, `${sourcePath} should post assistant chat`);
    assert.equal(source.includes("confirmAssistantAction"), true, `${sourcePath} should export confirmAssistantAction`);
    assert.equal(
      source.includes("`/assistant/actions/${actionId}/confirm`"),
      true,
      `${sourcePath} should post assistant action confirmations`
    );
  }
  assert.equal(models.includes("AssistantChatRequest"), true);
  assert.equal(models.includes("AssistantChatResponse"), true);
  assert.equal(models.includes("AssistantPendingAction"), true);
});

test("home page uses assistant api and renders pending action confirmation", () => {
  const wxml = read("miniprogram/pages/home/index.wxml");

  for (const sourcePath of [
    "miniprogram/pages/home/index.ts",
    "miniprogram/pages/home/index.js"
  ]) {
    const source = read(sourcePath);

    assert.equal(source.includes("sendAssistantChatMessage"), true, `${sourcePath} should alias assistant chat API`);
    assert.equal(source.includes("confirmAssistantAction"), true, `${sourcePath} should import confirmAssistantAction`);
    assert.equal(source.includes("assistantConversationId"), true, `${sourcePath} should track conversation ID`);
    assert.equal(
      source.includes("assistantDraftAction: response.pendingAction || null"),
      true,
      `${sourcePath} should store pending actions from assistant responses`
    );
    assert.equal(source.includes("confirmAssistantDraftAction()"), true, `${sourcePath} should confirm draft actions`);
  }
  assert.equal(wxml.includes('wx:if="{{assistantDraftAction}}"'), true);
  assert.equal(wxml.includes('bindtap="confirmAssistantDraftAction"'), true);
});

test("home page close keeps pending assistant draft actions", () => {
  for (const sourcePath of [
    "miniprogram/pages/home/index.ts",
    "miniprogram/pages/home/index.js"
  ]) {
    const source = read(sourcePath);
    const closeSource = methodSource(source, "closeAssistant", "onAssistantInput");

    assert.equal(
      closeSource.includes("assistantDraftAction: null"),
      false,
      `${sourcePath} should not clear draft actions on close`
    );
  }
});

test("home page assistant auth errors refresh public state", () => {
  for (const sourcePath of [
    "miniprogram/pages/home/index.ts",
    "miniprogram/pages/home/index.js"
  ]) {
    const source = read(sourcePath);
    const sendSource = methodSource(source, "sendAssistantMessage", "confirmAssistantDraftAction");
    const confirmSource = methodSource(source, "confirmAssistantDraftAction", "loadPublicHome");

    assert.equal(sendSource.includes("isAuthError(error)"), true, `${sourcePath} send should detect auth errors`);
    assert.equal(sendSource.includes("await this.loadPage()"), true, `${sourcePath} send should refresh on auth errors`);
    assert.equal(confirmSource.includes("isAuthError(error)"), true, `${sourcePath} confirm should detect auth errors`);
    assert.equal(confirmSource.includes("await this.loadPage()"), true, `${sourcePath} confirm should refresh on auth errors`);
  }
});
