#!/usr/bin/env node
/**
 * legal-regression-guard.ts
 * 
 * 법적 정확성(legal accuracy) regression guard for german-law-mcp.
 * 코드 수정이 기존 법적 사실을 훼손하지 않았는지 자동 검증.
 * 
 * 사용법: npx ts-node scripts/legal-regression-guard.ts
 * 또는: node dist/scripts/legal-regression-guard.js (빌드 후)
 * 
 * Track A (자율 루프)에서 법적 정확성 변경 감지 시 Track B (검토 큐)로 분리.
 */

import * as fs from "fs";
import * as path from "path";

interface LegalAssertion {
  file: string;
  mustContain?: string[];
  mustNotContain?: string[];
  description: string;
  severity: "critical" | "high" | "medium";
}

// ── 법적 정확성 assertions ──────────────────────────────────────────────

const LEGAL_ASSERTIONS: LegalAssertion[] = [
  // ═══ CRITICAL: 틀리면 실제 법적 효과에 영향 ═══

  // 공휴일 — 틀리면 기한 계산 오류
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["getBussUndBettag"],
    description: "SN Buß- und Bettag must be dynamically calculated from 1. Advent",
    severity: "critical",
  },
  {
    file: "src/tools/calculate-frist.ts",
    mustNotContain: ["new Date(j, 11, 24)"],
    description: "BY Heiligabend (24.12.) is NOT a legal holiday — must not be in landesFeiertage",
    severity: "critical",
  },
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["j >= 2019"],
    description: "BE Frauentag only since 2019 — must have year guard",
    severity: "critical",
  },

  // 기한 — 틀리면 소권 상실
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["berufung", "517"],
    description: "Berufungsfrist = 1 Monat (§ 517 ZPO)",
    severity: "critical",
  },
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["kuendigungsschutzklage", "3"],
    description: "Kündigungsschutzklage = 3 Wochen (§ 4 KSchG)",
    severity: "critical",
  },
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["einspruch_versaeumnisurteil", "2"],
    description: "Einspruch Versäumnisurteil = 2 Wochen (§ 339 ZPO)",
    severity: "critical",
  },

  // 소멸시효 — 틀리면 청구권 상실
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["Jahresende", "12-31"],
    description: "Verjährung must end at Jahresende (§ 199 Abs. 4 BGB)",
    severity: "critical",
  },
  {
    file: "src/tools/calculate-frist.ts",
    mustContain: ["verjährung_allgemein", "36"],
    description: "Regelverjährung = 36 Monate / 3 Jahre (§ 195 BGB)",
    severity: "critical",
  },

  // ═══ HIGH: 틀리면 법률 분석 오류 ═══

  // 조문 번호
  {
    file: "src/tools/risk-alert.ts",
    mustContain: ["§ 199", "§ 195", "§ 438"],
    description: "Verjährung references must cite correct BGB paragraphs",
    severity: "high",
  },
  {
    file: "src/tools/risk-alert.ts",
    mustContain: ["grobe Schätzung"],
    description: "Cost estimates must be clearly marked as approximation",
    severity: "high",
  },
  {
    file: "src/tools/risk-alert.ts",
    mustContain: ["§ 91 ZPO"],
    description: "Kostenlast reference must cite § 91 ZPO",
    severity: "high",
  },
  {
    file: "src/tools/risk-alert.ts",
    mustContain: ["§ 23 GVG"],
    description: "Amtsgericht jurisdiction threshold must cite § 23 GVG",
    severity: "high",
  },

  // verify-citation: OLG/LG confidence
  {
    file: "src/tools/verify-citation.ts",
    mustContain: ["isNonFederal", "medium"],
    description: "OLG/LG/AG citations must get 'medium' (not hallucination_risk) when not found in NeuRIS",
    severity: "high",
  },

  // Concept Map: 핵심 조문
  {
    file: "src/lib/concept-map.ts",
    mustContain: ["§ 477", "§ 438", "§ 195", "§ 355"],
    description: "Core BGB paragraphs must be present in concept map",
    severity: "high",
  },

  // ═══ MEDIUM: 틀리면 정보 오해 ═══

  // RVG 기본 구조
  {
    file: "src/tools/calculate-rvg.ts",
    mustContain: ["1.3", "1.2", "1.5"],
    description: "RVG fee factors: Verfahren 1.3, Termin 1.2, Einigung 1.5",
    severity: "medium",
  },
  {
    file: "src/tools/calculate-rvg.ts",
    mustContain: ["0.19"],
    description: "MwSt must be 19% (VV 7008 RVG)",
    severity: "medium",
  },

  // Rechtsgebiet filter
  {
    file: "src/tools/gutachten-scaffold.ts",
    mustContain: ["bereichMatch", "stichwortMatch"],
    description: "Rechtsgebiet filter must require bereichMatch || stichwortMatch",
    severity: "medium",
  },

  // Word boundary matching
  {
    file: "src/tools/analyze-scenario.ts",
    mustContain: ["escapeRegex"],
    description: "Keyword matching must use word boundaries via escapeRegex",
    severity: "medium",
  },

  // Concept Map always on top
  {
    file: "src/tools/search-law.ts",
    mustContain: ["buildConceptSection", "conceptSection"],
    description: "search-law must always include Concept Map section at top",
    severity: "medium",
  },
];

// ── 검증 엔진 ────────────────────────────────────────────────────────────

interface GuardResult {
  passed: boolean;
  assertion: LegalAssertion;
  actualContent?: string;
  failures: string[];
}

function runGuard(projectRoot: string): { passed: number; failed: number; results: GuardResult[] } {
  let passed = 0;
  let failed = 0;
  const results: GuardResult[] = [];

  for (const assertion of LEGAL_ASSERTIONS) {
    const filePath = path.join(projectRoot, assertion.file);
    const failures: string[] = [];

    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      results.push({
        passed: false,
        assertion,
        failures: [`FILE NOT FOUND: ${assertion.file}`],
      });
      failed++;
      continue;
    }

    // mustContain 검증
    if (assertion.mustContain) {
      for (const needle of assertion.mustContain) {
        if (!content.includes(needle)) {
          failures.push(`MISSING: "${needle}" not found in ${assertion.file}`);
        }
      }
    }

    // mustNotContain 검증
    if (assertion.mustNotContain) {
      for (const forbidden of assertion.mustNotContain) {
        if (content.includes(forbidden)) {
          failures.push(`FORBIDDEN: "${forbidden}" found in ${assertion.file}`);
        }
      }
    }

    const isPassed = failures.length === 0;
    if (isPassed) {
      passed++;
    } else {
      failed++;
    }

    results.push({ passed: isPassed, assertion, actualContent: content.slice(0, 200), failures });
  }

  return { passed, failed, results };
}

// ── 메인 ──────────────────────────────────────────────────────────────────

const thisDir = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(thisDir, "..");
const { passed, failed, results } = runGuard(projectRoot);

console.log("━━━ Legal Regression Guard ━━━");
console.log(`날짜: ${new Date().toISOString().slice(0, 10)}`);
console.log(`총 assertions: ${LEGAL_ASSERTIONS.length}`);
console.log(`✅ 통과: ${passed}`);
console.log(`❌ 실패: ${failed}`);
console.log("");

if (failed > 0) {
  console.log("━━━ 실패 상세 ━━━");
  for (const r of results) {
    if (!r.passed) {
      const icon = r.assertion.severity === "critical" ? "🔴" : r.assertion.severity === "high" ? "🟡" : "🟠";
      console.log(`${icon} [${r.assertion.severity.toUpperCase()}] ${r.assertion.description}`);
      for (const f of r.failures) {
        console.log(`   → ${f}`);
      }
      console.log("");
    }
  }

  // critical 실패 시 exit code 2, high는 1, medium만 실패면 0 (경고만)
  const hasCritical = results.some((r) => !r.passed && r.assertion.severity === "critical");
  const hasHigh = results.some((r) => !r.passed && r.assertion.severity === "high");

  if (hasCritical) {
    console.log("⛔ CRITICAL 실패: 자동 커밋 불가. 수동 검토 필요 (Track B)");
    process.exit(2);
  } else if (hasHigh) {
    console.log("⚠️ HIGH 실패: 검토 큐에 추가 (Track B)");
    process.exit(1);
  }
} else {
  console.log("✅ 모든 법적 정확성 assertion 통과 — Track A 자동 커밋 가능");
}

process.exit(0);
