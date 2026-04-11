const test = require("node:test");
const assert = require("node:assert/strict");

const { isTemporaryAvatarUrl } = require("../miniprogram/utils/avatar-url");

test("treats WeChat tmp avatar paths as temporary", () => {
  assert.equal(
    isTemporaryAvatarUrl("http://tmp/edwV2EyA-3nQa947d53a64d7a0b081522ea61de0f304.jpeg"),
    true
  );
  assert.equal(
    isTemporaryAvatarUrl("wxfile://tmp_123456789"),
    true
  );
});

test("keeps remote avatar urls as stable", () => {
  assert.equal(isTemporaryAvatarUrl("https://niyoushashilia.cloud/uploads/avatars/demo.png"), false);
});
