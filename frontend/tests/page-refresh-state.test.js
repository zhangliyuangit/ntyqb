const test = require("node:test");
const assert = require("node:assert/strict");

const { beginPageRefresh, finishPageRefresh, failPageRefresh } = require("../miniprogram/utils/page-refresh-state");

test("uses a blocking loading state on first entry", () => {
  assert.deepEqual(beginPageRefresh({ hasContent: false }), {
    loading: true,
    refreshing: false
  });
});

test("keeps the page visible while refreshing existing content", () => {
  assert.deepEqual(beginPageRefresh({ hasContent: true }), {
    loading: false,
    refreshing: true
  });
});

test("finishing a refresh always settles the page", () => {
  assert.deepEqual(finishPageRefresh(), {
    loading: false,
    refreshing: false,
    pageReady: true
  });
});

test("failing a refresh preserves ready state when old content is still visible", () => {
  assert.deepEqual(failPageRefresh({ hasContent: true }), {
    loading: false,
    refreshing: false,
    pageReady: true
  });
});

test("failing the first load keeps the page in a non-ready state", () => {
  assert.deepEqual(failPageRefresh({ hasContent: false }), {
    loading: false,
    refreshing: false,
    pageReady: false
  });
});
