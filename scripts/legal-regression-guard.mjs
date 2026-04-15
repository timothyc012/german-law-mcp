#!/usr/bin/env node
/**
 * legal-regression-guard.mjs
 * 
 * 법적 정확성(legal accuracy) regression guard for german-law-mcp.
 * 코드 수정이 기존 법적 사실을 훼손하지 않았는지 자동 검증.
 * 
 * 사용법: node scripts/legal-regression-guard.mjs
 * 
 * exit codes:
 *   0 = 전체 통과 (Track A 자동 커밋 가능)
 *   1 = HIGH 실패 (검토 큐 — Track B)
 *   2 = CRITICAL 실패 (자동 커밋 불가 — 수동 검토 필수)
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

// ── Assertions ─────────────────────────────────────────────────────────

const ASSERTIONS = [
  // ═══════════════════════════════════════════════════════════
  // CRITICAL — 이 항목 실패 시 자동 커밋 절대 불가 (Track B필수)
  // ═══════════════════════════════════════════════════════════

  // ── Fristenberechnung 핵심 조문 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 517 ZPO"], desc: "Berufungsfrist 법적 근거 (§ 517 ZPO)", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 520 Abs. 2 ZPO"], desc: "Berufungsbegründungsfrist 법적 근거", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 548 ZPO"], desc: "Revisionsfrist 법적 근거 (§ 548 ZPO)", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 339 Abs. 1 ZPO"], desc: "Einspruchsfrist (Versäumnisurteil) 법적 근거", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 573c Abs. 1 BGB"], desc: "Mieter/Vermieter Kündigungsfrist 법적 근거 (§ 573c Abs. 1 BGB)", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 438 Abs. 1 Nr. 3 BGB"], desc: "Gewährleistungsfrist Kaufvertrag 법적 근거", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 195 BGB"], desc: "Regelmäßige Verjährungsfrist 법적 근거", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 199"], desc: "Verjährungsbeginn 조문 참조", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 4 KSchG"], desc: "Kündigungsschutzklage 법적 근거 (§ 4 KSchG)", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 66 Abs. 1 ArbGG"], desc: "Berufungsfrist Arbeitsgericht 법적 근거", severity: "critical" },

  // ── 공휴일 정확성 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["getBussUndBettag"], desc: "SN Buß- und Bettag 동적 계산 필수", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustNotContain: ["new Date(j, 11, 24)"], desc: "BY Heiligabend (24.12.) 공휴일 아님", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["j >= 2019"], desc: "BE/TH Frauentag/Weltkindertag 연도 가드", severity: "critical" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["j >= 2024"], desc: "BB Internationaler Frauentag seit 2024 (§ 1 Abs. 2 Nr. 10 BbgFTG)", severity: "critical" },

  // ── 소멸시효 / 위험경고 ──
  { file: "src/tools/risk-alert.ts", mustContain: ["Jahresende", "12-31"], desc: "Verjährung 연말 종료 (§ 199 Abs. 4 BGB)", severity: "critical" },

  // ── 절대 삭제/수정 금지 (검토자 오류 방지) ──
  { file: "src/tools/spot-issues.ts", mustContain: ["§ 438 Abs. 3 BGB"], desc: "§ 438 Abs. 3 BGB 존재함 (arglistiges Verschweigen → 3 Jahre), 수정/삭제 절대 금지", severity: "critical" },

  // ═══════════════════════════════════════════════════════════
  // HIGH — 자동커밋은 중단하되 검토 후 커밋 가능
  // ═══════════════════════════════════════════════════════════

  // ── Fristen 상세 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["kuendigung_mietvertrag_vermieter"], desc: "Vermieter Kündigungsfrist 타입 존재", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["3 Monate", "6 Monate", "9 Monate"], desc: "§ 573c Abs. 1 S. 2 BGB gestaffelte Fristen 3/6/9 Monate", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 694 Abs. 1 ZPO"], desc: "Mahnbescheid Widerspruchsfrist 법적 근거 (§ 692 = Inhalt, § 694 = Widerspruch)", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 544 Abs. 3 ZPO"], desc: "Nichtzulassungsbeschwerde 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 276 Abs. 1 ZPO"], desc: "Klageerwiderungsfrist 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 568 BGB"], desc: "Schriftform Kündigungserfordernis (§ 568 BGB)", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 700 Abs. 1 ZPO"], desc: "Vollstreckungsbescheid Einspruchsfrist 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 317 Abs. 1 StPO"], desc: "Berufungsfrist Strafrecht 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 341 Abs. 1 StPO"], desc: "Revisionsfrist Strafrecht 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 70 Abs. 1 VwGO"], desc: "Widerspruchsfrist Verwaltungsakt 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 74 Abs. 1 VwGO"], desc: "Anfechtungsklage 법적 근거", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 193 BGB"], desc: "Fristverschiebung 근거 (§ 193 BGB / § 222 Abs. 2 ZPO)", severity: "high" },

  // ── 공휴일 세부 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["Internationaler Frauentag"], desc: "BB/BE Frauentag 설명 주석 존재", severity: "high" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["Weltkindertag"], desc: "TH Weltkindertag 설명 주석 존재", severity: "high" },

  // ── risk-alert ──
  { file: "src/tools/risk-alert.ts", mustContain: ["§ 199", "§ 195", "§ 438"], desc: "소멸시효 조문 참조", severity: "high" },
  { file: "src/tools/risk-alert.ts", mustContain: ["grobe Schätzung"], desc: "비용 추정 명시", severity: "high" },
  { file: "src/tools/risk-alert.ts", mustContain: ["§ 91 ZPO"], desc: "비용 부담 조문", severity: "high" },
  { file: "src/tools/risk-alert.ts", mustContain: ["§ 23 GVG"], desc: "AG 관할 조문", severity: "high" },

  // ── cite confidence ──
  { file: "src/tools/verify-citation.ts", mustContain: ["isNonFederal", "medium"], desc: "OLG/LG/AG → medium confidence", severity: "high" },

  // ── concept map 핵심 조문 ──
  { file: "src/lib/concept-map.ts", mustContain: ["§ 477", "§ 438", "§ 195", "§ 355"], desc: "핵심 BGB 조문 존재", severity: "high" },

  // ── TMG→DDG 대체 안내 ──
  { file: "src/tools/quality-gate.ts", mustContain: ["DDG"], desc: "DDG (Digitale-Dienste-Gesetz) 알려진 법률 목록에 존재", severity: "high" },
  { file: "src/tools/quality-gate.ts", mustContain: ["2024.05.14", "TMG 폐지"], desc: "TMG→DDG 2024 폐지 안내 존재", severity: "high" },

  // ═══════════════════════════════════════════════════════════
  // MEDIUM — 경고 수준, 자동커밋 가능하나 메모 남김
  // ═══════════════════════════════════════════════════════════

  // ── OLG Revision ──
  { file: "src/tools/search-state-courts.ts", mustContain: ["§ 542 ZPO", "§ 543 ZPO"], mustNotContain: ["nicht revisibel"], desc: "OLG Revision möglich (§ 542/543 ZPO), 'nicht revisibel' 금지", severity: "medium" },

  // ── RVG 수수료 ──
  { file: "src/tools/calculate-rvg.ts", mustContain: ["1.3", "1.2", "1.5"], desc: "RVG 수수료 요율", severity: "medium" },
  { file: "src/tools/calculate-rvg.ts", mustContain: ["0.19"], desc: "MwSt 19%", severity: "medium" },

  // ── Rechtsgebiet 필터 ──
  { file: "src/tools/gutachten-scaffold.ts", mustContain: ["bereichMatch", "stichwortMatch"], desc: "rechtsgebiet 필터 로직", severity: "medium" },

  // ── Word boundary ──
  { file: "src/tools/analyze-scenario.ts", mustContain: ["escapeRegex"], desc: "워드바운더리 매칭", severity: "medium" },

  // ── Concept Map 표시 ──
  { file: "src/tools/search-law.ts", mustContain: ["buildConceptSection"], desc: "Concept Map 상단 표시", severity: "medium" },

  // ── Fristenberechnung 로직 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["getOstersonntag"], desc: "Osterformel 함수 존재", severity: "medium" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["verschiebeAufWerktag"], desc: "Fristverschiebung 함수 존재", severity: "medium" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["getFeiertageDates"], desc: "공휴일 계산 함수 존재", severity: "medium" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["berechneFristende"], desc: "Fristende 계산 함수 존재", severity: "medium" },
  { file: "src/tools/calculate-frist.ts", mustContain: ["addMonate"], desc: "Monatsberechnung 함수 존재 (§ 188 Abs. 3 BGB)", severity: "medium" },

  // ── Bundesländer 전수 존재 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["BW:", "BY:", "BE:", "BB:", "HB:", "HH:", "HE:", "MV:", "NI:", "NW:", "RP:", "SL:", "SN:", "ST:", "SH:", "TH:"], desc: "16 Bundesländer 전수 존재", severity: "medium" },

  // ── Bundesweite Feiertage ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["Neujahr", "Karfreitag", "Ostermontag", "Tag der Arbeit", "Christi Himmelfahrt", "Pfingstmontag", "Tag der Deutschen Einheit", "1. Weihnachtstag", "2. Weihnachtstag"], desc: "9 bundesweite Feiertage 주석 존재 (inkl. Weihnachten)", severity: "medium" },

  // ── Ab_werktag Verschiebung ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["§ 193 BGB", "§ 222 Abs. 2 ZPO"], desc: "Fristverschiebung 법적 근거 표시", severity: "medium" },

  // ── quality-gate 법률 목록 ──
  { file: "src/tools/quality-gate.ts", mustContain: ["BGB", "ZPO", "StGB", "BDSG", "DSGVO", "KSchG"], desc: "핵심 법률 약어 존재", severity: "medium" },
  { file: "src/tools/quality-gate.ts", mustContain: ["obsolet", "대체"], desc: "폐지·대체 법률 검증 로직 존재", severity: "medium" },

  // ── Fristtypen enum 완전성 ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["berufung", "revision", "einspruch_versaeumnisurteil", "gewaehrleistung_kauf", "verjährung_allgemein"], desc: "핵심 Fristtypen enum 항목 존재", severity: "medium" },

  // ── HAFTUNGSHINWEIS ──
  { file: "src/tools/calculate-frist.ts", mustContain: ["Haftungshinweis", "anwaltliche"], desc: "Fristenberechnung 면책 조항 존재", severity: "medium" },
];

// ── 검증 ───────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

for (const a of ASSERTIONS) {
  const fp = join(projectRoot, a.file);
  let content;
  try {
    content = readFileSync(fp, "utf-8");
  } catch {
    failures.push({ ...a, errors: [`FILE NOT FOUND: ${a.file}`] });
    failed++;
    continue;
  }

  const errors = [];

  if (a.mustContain) {
    for (const needle of a.mustContain) {
      if (!content.includes(needle)) {
        errors.push(`MISSING: "${needle}" not found in ${a.file}`);
      }
    }
  }

  if (a.mustNotContain) {
    for (const forbidden of a.mustNotContain) {
      if (content.includes(forbidden)) {
        errors.push(`FORBIDDEN: "${forbidden}" found in ${a.file}`);
      }
    }
  }

  if (errors.length === 0) {
    passed++;
  } else {
    failures.push({ ...a, errors });
    failed++;
  }
}

// ── 출력 ───────────────────────────────────────────────────────────────

console.log("━━━ Legal Regression Guard ━━━");
console.log(`날짜: ${new Date().toISOString().slice(0, 10)}`);
console.log(`총 assertions: ${ASSERTIONS.length} | ✅ 통과: ${passed} | ❌ 실패: ${failed}`);
console.log("");

if (failed > 0) {
  console.log("━━━ 실패 상세 ━━━");
  for (const f of failures) {
    const icon = f.severity === "critical" ? "🔴" : f.severity === "high" ? "🟡" : "🟠";
    console.log(`${icon} [${f.severity.toUpperCase()}] ${f.desc}`);
    for (const e of f.errors) {
      console.log(`   → ${e}`);
    }
    console.log("");
  }

  const hasCritical = failures.some((f) => f.severity === "critical");
  const hasHigh = failures.some((f) => f.severity === "high");

  if (hasCritical) {
    console.log("⛔ CRITICAL 실패: 자동 커밋 불가. 수동 검토 필요 (Track B)");
    process.exit(2);
  } else if (hasHigh) {
    console.log("⚠️  HIGH 실패: 검토 큐에 추가 (Track B)");
    process.exit(1);
  }
} else {
  console.log(`✅ 모든 법적 정확성 assertion 통과 — Track A 자동 커밋 가능`);
  console.log(`   총 ${ASSERTIONS.length}개 assertion 전부 PASS`);
}

process.exit(0);