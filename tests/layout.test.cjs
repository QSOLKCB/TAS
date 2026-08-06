"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "styles.css"), "utf8");
const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");

test("desktop field canvas does not stretch to the full side-rail height", () => {
  assert.match(css, /@media \(min-width: 761px\)\s*{\s*\.canvas-shell\s*{[^}]*flex:\s*0 0 clamp\(420px, 58vh, 620px\);/s);
});

test("animation control keeps stable child nodes and pressed state", () => {
  assert.match(html, /id="animate-button"[^>]*aria-pressed="false"/);
  assert.match(html, /id="animate-icon"/);
  assert.match(html, /id="animate-label"/);
  assert.match(app, /button\.setAttribute\("aria-pressed", animating \? "true" : "false"\)/);
  assert.doesNotMatch(app, /button\.innerHTML\s*=\s*"<span[^\n]+(?:Stop|Animate) field/);
});
