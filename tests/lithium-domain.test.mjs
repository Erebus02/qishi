import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const files = [
  "lib/server-data.ts",
  "app/dashboard-client.tsx",
  "netlify-app/src/dashboard-client.tsx",
];

test("all visible sample data uses lithium-battery projects and equipment", async () => {
  const source = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
  for (const legacy of ["磁钢", "厦门 SFN", "氢破炉", "检包自动化", "PRJ-SFN", "PRJ-HP", "PRJ-GLUE"]) {
    assert.equal(source.includes(legacy), false, `legacy sample remains: ${legacy}`);
  }
  for (const required of ["动力电池", "方形电芯", "储能电池", "正极材料", "模组装配"]) {
    assert.equal(source.includes(required), true, `missing lithium-industry sample: ${required}`);
  }
});

test("Netlify deployment keeps the API proxy and automatic Git build", async () => {
  const config = await readFile("netlify.toml", "utf8");
  assert.match(config, /base = "netlify-app"/);
  assert.match(config, /from = "\/api\/\*"/);
  assert.match(config, /NETLIFY_NEXT_PLUGIN_SKIP = "true"/);
});
