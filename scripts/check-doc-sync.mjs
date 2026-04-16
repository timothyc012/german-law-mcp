#!/usr/bin/env node
/**
 * check-doc-sync.mjs
 *
 * Safe documentation/registration drift guard.
 * Verifies that README and src/index.ts agree on the exposed tool count,
 * that every registered MCP tool is documented in README, and that the
 * verification scripts referenced in package.json actually exist.
 *
 * Usage: node scripts/check-doc-sync.mjs
 * Exit: 0 = pass, 1 = mismatch
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function read(relPath) {
  return readFileSync(resolve(ROOT, relPath), "utf8");
}

function fail(message) {
  console.error(`❌ ${message}`);
  failures += 1;
}

function pass(message) {
  console.log(`✅ ${message}`);
}

let failures = 0;

const readme = read("README.md");
const indexTs = read("src/index.ts");
const packageJson = JSON.parse(read("package.json"));

const registeredTools = [...indexTs.matchAll(/server\.registerTool\(\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
const uniqueRegisteredTools = [...new Set(registeredTools)];

if (registeredTools.length !== uniqueRegisteredTools.length) {
  fail(`Duplicate tool registration detected in src/index.ts (${registeredTools.length} entries, ${uniqueRegisteredTools.length} unique).`);
} else {
  pass(`Tool registration list has no duplicates (${uniqueRegisteredTools.length} unique tools).`);
}

const readmeToolRows = [...readme.matchAll(/\|\s*`([a-z0-9_]+)`\s*\|/g)].map((m) => m[1]);
const documentedTools = [...new Set(readmeToolRows)];

const readmeHeadlineMatch = readme.match(/## 도구 목록 \((\d+)개\)/);
const indexHeadlineMatch = indexTs.match(/도구 목록 \((\d+)개\)/);
const indexDescriptionMatch = indexTs.match(/German law MCP server — (\d+) tools covering/);
const readmeIndexCommentMatch = readme.match(/index\.ts\s+# MCP 서버 진입점 \(도구 (\d+)개 등록\)/);
const readmeToolsCommentMatch = readme.match(/tools\/\s+# 도구별 구현 \((\d+)개\)/);

const expectedCount = uniqueRegisteredTools.length;

for (const [label, match] of [
  ["README headline", readmeHeadlineMatch],
  ["src/index.ts headline", indexHeadlineMatch],
  ["src/index.ts description", indexDescriptionMatch],
  ["README architecture/index comment", readmeIndexCommentMatch],
  ["README architecture/tools comment", readmeToolsCommentMatch],
]) {
  if (!match) {
    fail(`${label} missing expected tool-count marker.`);
    continue;
  }

  const declared = Number(match[1]);
  if (declared !== expectedCount) {
    fail(`${label} says ${declared}, but src/index.ts registers ${expectedCount} tools.`);
  } else {
    pass(`${label} matches registered tool count (${expectedCount}).`);
  }
}

const undocumented = uniqueRegisteredTools.filter((tool) => !documentedTools.includes(tool));
const staleDocs = documentedTools.filter((tool) => !uniqueRegisteredTools.includes(tool));

if (undocumented.length > 0) {
  fail(`README is missing tool docs for: ${undocumented.join(", ")}`);
} else {
  pass("README documents every registered MCP tool.");
}

if (staleDocs.length > 0) {
  fail(`README documents tools that are not registered: ${staleDocs.join(", ")}`);
} else {
  pass("README has no stale tool rows.");
}

if (!readme.includes("`risk_alert`")) {
  fail("README does not document risk_alert.");
}

const scripts = packageJson.scripts ?? {};
for (const scriptName of ["typecheck", "verify:regression", "verify:docs", "verify:live-law", "verify"]) {
  if (!(scriptName in scripts)) {
    fail(`package.json is missing script: ${scriptName}`);
  } else {
    pass(`package.json exposes script: ${scriptName}`);
  }
}

const expectedScriptFiles = [
  "scripts/legal-regression-guard.mjs",
  "scripts/check-doc-sync.mjs",
  "scripts/legal-verify.mjs",
];

for (const relPath of expectedScriptFiles) {
  if (!existsSync(resolve(ROOT, relPath))) {
    fail(`Referenced script file missing: ${relPath}`);
  } else {
    pass(`Script file exists: ${relPath}`);
  }
}

console.log("\n━━━ Documentation Sync Guard ━━━");
console.log(`Registered tools: ${expectedCount}`);
console.log(`README tool rows: ${documentedTools.length}`);
console.log(`Failures: ${failures}`);

process.exit(failures === 0 ? 0 : 1);
