#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ "${SITES_ENV_READY:-}" != "1" ]]; then
  exec "${script_dir}/sites-env.sh" -- "$0" "$@"
fi

worker="${SITES_PROJECT_ROOT}/dist/server/index.js"
hosting="${SITES_PROJECT_ROOT}/dist/.openai/hosting.json"

[[ -f "${worker}" ]] || {
  echo "Missing Sites Worker entry: dist/server/index.js" >&2
  exit 66
}
[[ -f "${hosting}" ]] || {
  echo "Missing packaged Sites manifest: dist/.openai/hosting.json" >&2
  exit 66
}

node --input-type=module - "${worker}" "${hosting}" <<'NODE'
import { readFile } from "node:fs/promises";

const [workerPath, hostingPath] = process.argv.slice(2);
JSON.parse(await readFile(hostingPath, "utf8"));
const workerSource = await readFile(workerPath, "utf8");

// The compiled worker may import the Cloudflare-only `cloudflare:` protocol.
// Importing it in a plain Node post-build process fails before its exports can
// be inspected, even though it runs correctly in Workers. Validate the emitted
// module shape statically and leave execution to the deployment runtime.
if (!/export\s*\{[^}]*\bdefault\b[^}]*\}/s.test(workerSource) &&
    !/export\s+default\b/.test(workerSource)) {
  throw new Error("dist/server/index.js must expose an ESM default export");
}
NODE

echo "Validated Sites artifact: ESM Worker default export and hosting manifest are present."
