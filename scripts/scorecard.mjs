#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PACKAGE_JSON_PATH = resolve(ROOT, "package.json");
const INDEX_TS_PATH = resolve(ROOT, "src/index.ts");
const README_PATH = resolve(ROOT, "README.md");
const TOOL_DIR = resolve(ROOT, "src/tools");
const MANUAL_OVERRIDE_CANDIDATES = [
  resolve(ROOT, ".scorecard-manual.json"),
  resolve(ROOT, "scripts/.scorecard-manual.json"),
];

const WEIGHTS = {
  법적정확성: 25,
  기능완전성: 20,
  코드품질: 15,
  엣지케이스: 15,
  아키텍처: 10,
  문서화: 10,
  테스트: 5,
};

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function safePercent(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function runNpmScript(scriptName) {
  const command = getNpmCommand();
  const result = spawnSync(command, ["run", "--silent", scriptName], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });

  const stdout = stripAnsi(result.stdout ?? "");
  const stderr = stripAnsi(result.stderr ?? "");
  const combined = [stdout, stderr].filter(Boolean).join("\n").trim();

  return {
    scriptName,
    status: typeof result.status === "number" ? result.status : 1,
    stdout,
    stderr,
    combined,
    error: result.error ?? null,
  };
}

const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", "coverage"]);

function walkFiles(dirPath) {
  const entries = readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) {
      continue;
    }

    const fullPath = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function loadManualOverrides() {
  for (const candidate of MANUAL_OVERRIDE_CANDIDATES) {
    if (!existsSync(candidate)) continue;

    try {
      const parsed = JSON.parse(readText(candidate));
      return {
        path: candidate,
        data: parsed && typeof parsed === "object" ? parsed : {},
      };
    } catch (error) {
      return {
        path: candidate,
        data: {},
        parseError: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return { path: null, data: {} };
}

function getOverride(overrides, keys) {
  for (const key of keys) {
    if (!(key in overrides)) continue;
    const value = overrides[key];

    if (typeof value === "number") {
      return { score: clamp(value), note: `manual override from key \"${key}\"` };
    }

    if (value && typeof value === "object") {
      if (typeof value.score === "number") {
        return {
          score: clamp(value.score),
          note: typeof value.note === "string" ? value.note : `manual override from key \"${key}\"`,
        };
      }
    }
  }

  return null;
}

function buildMetric(name, weight, rawScore, details, extras = {}) {
  return {
    name,
    weight,
    rawScore: round1(clamp(rawScore)),
    weightedScore: round1((clamp(rawScore) * weight) / 100),
    details,
    ...extras,
  };
}

function applyManualOverride(metric, overrides, keys) {
  const override = getOverride(overrides, keys);
  if (!override) return metric;

  return {
    ...metric,
    rawScore: round1(override.score),
    weightedScore: round1((override.score * metric.weight) / 100),
    details: `${metric.details} | Manual override applied: ${override.note}`,
    manualOverride: true,
  };
}

function parseRegressionMetric() {
  const result = runNpmScript("verify:regression");
  const match = result.combined.match(/총 assertions:\s*(\d+)\s*\|\s*✅ 통과:\s*(\d+)\s*\|\s*❌ 실패:\s*(\d+)/);
  const totalAssertions = match ? Number(match[1]) : 0;
  const passedAssertions = match ? Number(match[2]) : 0;
  const failedAssertions = match ? Number(match[3]) : 0;
  const score = totalAssertions > 0 ? safePercent(passedAssertions, totalAssertions) : result.status === 0 ? 100 : 0;

  return buildMetric(
    "법적정확성",
    WEIGHTS.법적정확성,
    score,
    totalAssertions > 0
      ? `Regression guard: ${passedAssertions}/${totalAssertions} assertions passed, ${failedAssertions} failed (exit ${result.status}).`
      : `Regression guard output did not expose assertion counts; fallback score based on exit code ${result.status}.`,
    {
      command: result,
      passedAssertions,
      totalAssertions,
      failedAssertions,
    },
  );
}

function parseFunctionalMetric(indexContent) {
  const registeredTools = [...indexContent.matchAll(/server\.registerTool\(\s*"([a-z0-9_]+)"/g)].map((match) => match[1]);
  const uniqueTools = [...new Set(registeredTools)];
  const duplicateCount = registeredTools.length - uniqueTools.length;

  const declaredCounts = [
    indexContent.match(/도구 목록 \((\d+)개\)/),
    indexContent.match(/German law MCP server — (\d+) tools covering/),
  ]
    .filter(Boolean)
    .map((match) => Number(match[1]));

  const markerMatches = declaredCounts.filter((count) => count === uniqueTools.length).length;
  const markerScore = declaredCounts.length > 0 ? safePercent(markerMatches, declaredCounts.length) : 50;
  const registrationScore = registeredTools.length > 0 ? safePercent(uniqueTools.length, registeredTools.length) : 0;
  const countBaseline = declaredCounts.length > 0 ? Math.max(...declaredCounts) : uniqueTools.length;
  const countPresenceScore = countBaseline > 0 ? safePercent(uniqueTools.length, countBaseline) : 0;
  const score = (registrationScore * 0.5) + (markerScore * 0.3) + (countPresenceScore * 0.2);

  return buildMetric(
    "기능완전성",
    WEIGHTS.기능완전성,
    score,
    `${uniqueTools.length} unique tools registered (${registeredTools.length} register calls, ${duplicateCount} duplicates). Internal count markers matched ${markerMatches}/${declaredCounts.length || 1}.`,
    {
      registeredTools: uniqueTools,
      duplicateCount,
      declaredCounts,
    },
  );
}

function parseCodeQualityMetric(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const typecheck = runNpmScript("typecheck");
  const typecheckScore = typecheck.status === 0 ? 100 : 0;

  if (!("lint" in scripts)) {
    return buildMetric(
      "코드품질",
      WEIGHTS.코드품질,
      typecheckScore * 0.7,
      `Typecheck ${typecheck.status === 0 ? "passed" : "failed"}. No lint script exists in package.json, so the lint portion was not invented and this dimension is explicitly capped at 70/100.`,
      {
        command: typecheck,
        lintAvailable: false,
      },
    );
  }

  const lint = runNpmScript("lint");
  const lintScore = lint.status === 0 ? 100 : 0;
  const score = (typecheckScore * 0.7) + (lintScore * 0.3);

  return buildMetric(
    "코드품질",
    WEIGHTS.코드품질,
    score,
    `Typecheck ${typecheck.status === 0 ? "passed" : "failed"}; lint ${lint.status === 0 ? "passed" : "failed"}.`,
    {
      command: typecheck,
      lintCommand: lint,
      lintAvailable: true,
    },
  );
}

function parseEdgeCaseMetric() {
  const allFiles = walkFiles(ROOT).filter((filePath) => {
    const normalized = relative(ROOT, filePath).replace(/\\/g, "/");
    return /(?:^|\/)(tests|test)\//.test(normalized) && /\.(spec|test)\.ts$/.test(normalized);
  });

  const titleRegex = /\b(?:it|test)\(\s*["'`]([^"'`]+)["'`]/g;
  const edgeRegex = /(edge|boundary|holiday|year|fallback|beweislast|reject|impossible|frauentag|buss|buß|bettag|working day|state-specific|alias|umlaut|mixed text|historical|normalize|third working day)/i;

  let totalTests = 0;
  let edgeTests = 0;

  for (const filePath of allFiles) {
    const content = readText(filePath);
    for (const match of content.matchAll(titleRegex)) {
      totalTests += 1;
      if (edgeRegex.test(match[1])) {
        edgeTests += 1;
      }
    }
  }

  const score = edgeTests === 0 ? 0 : clamp(safePercent(edgeTests, 6));

  return buildMetric(
    "엣지케이스",
    WEIGHTS.엣지케이스,
    score,
    `Deterministic rule: count test titles matching edge keywords (${edgeTests}/${totalTests} matched across ${allFiles.length} spec files). Full score reached at 6 matched edge-focused tests.`,
    {
      totalTests,
      edgeTests,
      specFiles: allFiles.map((filePath) => relative(ROOT, filePath)),
    },
  );
}

function parseArchitectureMetric() {
  const toolFiles = walkFiles(TOOL_DIR).filter((filePath) => extname(filePath) === ".ts");
  const tryCatchRegex = /try\s*\{[\s\S]*?catch\s*(?:\([^)]*\))?\s*\{/;
  const errorMarkerRegex = /(\[검색 오류\]|\[오류\]|\[검색 실패\]|오류:|실패:|찾을 수 없)/;

  let tryCatchCount = 0;
  let errorMarkerCount = 0;
  let compliantCount = 0;

  for (const filePath of toolFiles) {
    const content = readText(filePath);
    const hasTryCatch = tryCatchRegex.test(content);
    const hasErrorMarker = errorMarkerRegex.test(content);

    if (hasTryCatch) tryCatchCount += 1;
    if (hasErrorMarker) errorMarkerCount += 1;
    if (hasTryCatch && hasErrorMarker) compliantCount += 1;
  }

  const tryCatchCoverage = safePercent(tryCatchCount, toolFiles.length);
  const errorMarkerCoverage = safePercent(errorMarkerCount, toolFiles.length);
  const compliantCoverage = safePercent(compliantCount, toolFiles.length);
  const score = (tryCatchCoverage * 0.4) + (errorMarkerCoverage * 0.2) + (compliantCoverage * 0.4);

  return buildMetric(
    "아키텍처",
    WEIGHTS.아키텍처,
    score,
    `Error-handling scan across ${toolFiles.length} tool files: try/catch in ${tryCatchCount}, standardized error markers in ${errorMarkerCount}, both patterns in ${compliantCount}. Deterministic score = 40% try/catch coverage + 20% marker coverage + 40% combined coverage.`,
    {
      toolFileCount: toolFiles.length,
      tryCatchCount,
      errorMarkerCount,
      compliantCount,
    },
  );
}

function parseDocsMetric() {
  const result = runNpmScript("verify:docs");
  const failureMatch = result.combined.match(/Failures:\s*(\d+)/i);
  const failureCount = failureMatch ? Number(failureMatch[1]) : result.status === 0 ? 0 : 1;
  const score = clamp(100 - (failureCount * 20));

  return buildMetric(
    "문서화",
    WEIGHTS.문서화,
    score,
    `Docs sync guard reported ${failureCount} failure(s) (exit ${result.status}). Score deducts 20 points per sync failure.`,
    {
      command: result,
      failureCount,
    },
  );
}

function parseVitestSummaryLine(output, label) {
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .find((line) => line.startsWith(label)) ?? "";
}

function parseLabeledCounts(line) {
  const passed = Number((line.match(/(\d+)\s+passed/i) ?? [null, 0])[1]);
  const failed = Number((line.match(/(\d+)\s+failed/i) ?? [null, 0])[1]);
  const skipped = Number((line.match(/(\d+)\s+skipped/i) ?? [null, 0])[1]);
  const totalFromParen = Number((line.match(/\((\d+)\)/) ?? [null, 0])[1]);
  const total = totalFromParen || passed + failed + skipped;
  return { passed, failed, skipped, total };
}

function parseTestingMetric() {
  const result = runNpmScript("test:unit");
  const testsLine = parseVitestSummaryLine(result.combined, "Tests");
  const filesLine = parseVitestSummaryLine(result.combined, "Test Files");
  const testCounts = parseLabeledCounts(testsLine);
  const fileCounts = parseLabeledCounts(filesLine);
  const passRate = testCounts.total > 0 ? safePercent(testCounts.passed, testCounts.total) : result.status === 0 ? 100 : 0;
  const testCountScore = clamp(safePercent(testCounts.total, 10));
  const fileCountScore = clamp(safePercent(fileCounts.total, 3));
  const score = (passRate * 0.6) + (testCountScore * 0.3) + (fileCountScore * 0.1);

  return buildMetric(
    "테스트",
    WEIGHTS.테스트,
    score,
    `Vitest summary: ${testCounts.passed}/${testCounts.total || 0} tests passed across ${fileCounts.total || 0} file(s) (exit ${result.status}). Score = 60% pass rate + 30% test-count signal (full at 10 tests) + 10% file-count signal (full at 3 files).`,
    {
      command: result,
      testCounts,
      fileCounts,
    },
  );
}

function printMetric(metric) {
  const header = `${metric.name.padEnd(8, " ")} ${String(metric.weight).padStart(2, " ")}% | raw ${metric.rawScore.toFixed(1).padStart(5, " ")} | weighted ${metric.weightedScore.toFixed(1).padStart(5, " ")}`;
  console.log(header);
  console.log(`  ${metric.details}`);
}

function main() {
  const packageJson = JSON.parse(readText(PACKAGE_JSON_PATH));
  const indexContent = readText(INDEX_TS_PATH);
  const readmeExists = existsSync(README_PATH);

  if (!readmeExists) {
    throw new Error("README.md is required for scorecard metrics but was not found.");
  }

  const manual = loadManualOverrides();
  const manualNote = manual.path
    ? manual.parseError
      ? `Manual override file found at ${relative(ROOT, manual.path)} but could not be parsed: ${manual.parseError}`
      : `Manual override file loaded from ${relative(ROOT, manual.path)}.`
    : `No manual override file found (${MANUAL_OVERRIDE_CANDIDATES.map((path) => relative(ROOT, path)).join(", ")}); using auto metrics and explicit defaults.`;

  const metrics = [
    parseRegressionMetric(),
    parseFunctionalMetric(indexContent),
    parseCodeQualityMetric(packageJson),
    parseEdgeCaseMetric(),
    applyManualOverride(
      parseArchitectureMetric(),
      manual.data,
      ["아키텍처", "architecture"],
    ),
    parseDocsMetric(),
    parseTestingMetric(),
  ];

  const total = round1(metrics.reduce((sum, metric) => sum + metric.weightedScore, 0));
  const bottlenecks = [...metrics]
    .sort((a, b) => a.rawScore - b.rawScore)
    .slice(0, 3)
    .filter((metric) => metric.rawScore < 100);

  console.log("━━━ german-law-mcp scorecard ━━━");
  console.log(manualNote);
  console.log("");

  for (const metric of metrics) {
    printMetric(metric);
  }

  console.log("");
  console.log(`Weighted total: ${total.toFixed(1)} / 100.0`);

  if (bottlenecks.length > 0) {
    console.log("Bottlenecks:");
    for (const metric of bottlenecks) {
      console.log(`- ${metric.name} (${metric.rawScore.toFixed(1)}): ${metric.details}`);
    }
  } else {
    console.log("Bottlenecks: none — every dimension scored 100.");
  }
}

try {
  main();
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error("scorecard failed:");
  console.error(message);
  process.exit(1);
}
