const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("login api no longer hardcodes the local demo mock user", () => {
  const source = read("miniprogram/services/api.ts");
  assert.equal(source.includes("local-demo-user"), false);
});
