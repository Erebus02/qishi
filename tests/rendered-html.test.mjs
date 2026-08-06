import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("production metadata is complete and contains no preview marker", async () => {
  const layout = await readFile("app/layout.tsx", "utf8");
  assert.match(layout, /ModelFlow｜SolidWorks 设备建模管理平台/);
  assert.match(layout, /锂电|设备|SolidWorks/);
  assert.doesNotMatch(layout, /codex-preview/);
});

test("compiled worker exposes the required default export", async () => {
  const worker = await readFile("dist/server/index.js", "utf8");
  assert.match(worker, /export\s*\{[^}]*\bdefault\b[^}]*\}|export\s+default\b/s);
});
