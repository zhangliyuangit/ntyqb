const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

const pages = [
  "pages/home",
  "pages/leaderboard",
  "pages/records",
  "pages/profile",
  "pages/auth",
  "pages/player"
];

test("all main mini program pages declare share handlers", () => {
  for (const page of pages) {
    const source = read(`miniprogram/${page}/index.ts`);
    assert.equal(source.includes("onShareAppMessage"), true, `${page} should define onShareAppMessage`);
    assert.equal(source.includes("onShareTimeline"), true, `${page} should define onShareTimeline`);
  }
});

test("all main mini program pages enable share in page config", () => {
  for (const page of pages) {
    const config = JSON.parse(read(`miniprogram/${page}/index.json`));
    assert.equal(config.enableShareAppMessage, true, `${page} should enable share app message`);
    assert.equal(config.enableShareTimeline, true, `${page} should enable share timeline`);
  }
});
