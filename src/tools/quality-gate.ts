/**
 * quality-gate.ts — 14단계 법률 분석 품질 게이트
 *
 * 법률 분석 결과의 품질을 14개 기준으로 자동 검증한다.
 * 각 게이트 통과/실패 여부와 권장 조치를 반환한다.
 *
 * 게이트 카테고리:
 *   A. 소스 신뢰도 (1-3)
 *   B. 법령 완전성 (4-7)
 *   C. 시간적 유효성 (8-10)
 *   D. 교차참조 일관성 (11-12)
 *   E. 실무 적용성 (13-14)
 */

import { z } from "zod";

export const qualityGateSchema = z.object({
  law: z.string().describe("검증 대상 법률 약어 (예: 'BGB', 'BDSG')"),
  section: z.string().optional().describe("검증 대상 조문 번호"),
  analysis_text: z
    .string()
    .optional()
    .describe("검증할 분석 텍스트 (제공 시 내용 기반 검증 추가)"),
  strict: z
    .boolean()
    .default(false)
    .describe("엄격 모드 — true 시 C등급 이하 소스 사용 시 FAIL 처리"),
});

export type QualityGateInput = z.infer<typeof qualityGateSchema>;

// ── 게이트 정의 ───────────────────────────────────────────────────────────────

interface Gate {
  id: number;
  category: string;
  name: string;
  description: string;
  check: (ctx: GateContext) => GateResult;
}

interface GateContext {
  law: string;
  section?: string;
  analysis_text?: string;
  strict: boolean;
}

interface GateResult {
  passed: boolean;
  note: string;
  recommendation?: string;
  severity: "error" | "warning" | "info";
}

// 알려진 유효한 법률 약어 목록 (샘플)
const KNOWN_LAWS = new Set([
  "BGB", "HGB", "AktG", "GmbHG", "InsO", "ZPO", "StPO", "StGB",
  "GG", "VwGO", "VwVfG", "AO", "EStG", "KStG", "UStG", "GewStG",
  "BDSG", "TMG", "DDG", "TKG", "UWG", "WpHG", "KWG", "VAG", "GWB",
  "BImSchG", "WHG", "BNatSchG", "AEUV", "EUV",
  "DSGVO", "DORA", "NIS2", "MiLoG", "BetrVG", "KSchG", "ArbZG",
  "SGB", "BVerfGG", "BAföG", "FreizügG", "AufenthG",
]);

// 법률별 최소 조문 수 (대략적 상한)
const LAW_SECTION_LIMITS: Record<string, number> = {
  BGB: 2385, HGB: 905, AktG: 410, ZPO: 1066, StGB: 358,
  EStG: 52, KStG: 32, UStG: 27, AO: 415, BDSG: 85,
};

const GATES: Gate[] = [
  // ── A. 소스 신뢰도 ────────────────────────────────────────────────────────
  {
    id: 1,
    category: "A. 소스 신뢰도",
    name: "공식 법령 소스 사용",
    description: "분석이 bundesrecht.bund.de(GII) 또는 NeuRIS 공식 소스를 기반으로 하는지 확인",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 수동 확인 필요", severity: "info" };
      }
      const officialSources = ["bundesrecht.bund.de", "neuris", "gii", "BGBl", "BAnz"];
      const hasSource = officialSources.some((s) =>
        ctx.analysis_text!.toLowerCase().includes(s.toLowerCase())
      );
      return hasSource
        ? { passed: true, note: "공식 소스 참조 확인됨", severity: "info" }
        : {
            passed: false,
            note: "공식 소스 참조 미확인",
            recommendation: "bundesrecht.bund.de 또는 NeuRIS에서 직접 조회하세요",
            severity: "warning",
          };
    },
  },
  {
    id: 2,
    category: "A. 소스 신뢰도",
    name: "연방법원 판례 인용 시 출처 명시",
    description: "판례 인용 시 법원명, 날짜, 사건번호가 포함되어 있는지 확인",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      // 판례 인용 패턴 검사: BGH, BVerfG 등 + 날짜
      const casePattern = /(BGH|BVerfG|BVerwG|BAG|BSG|BFH|OLG|LG|AG)\s+.*\d{2}\.\d{2}\.\d{4}/;
      const hasCaseRef = casePattern.test(ctx.analysis_text);
      const hasIncompleteRef = /판례|Urteil|Beschluss/i.test(ctx.analysis_text) && !hasCaseRef;

      if (hasIncompleteRef) {
        return {
          passed: false,
          note: "불완전한 판례 인용 감지",
          recommendation: "법원명 + 날짜 + 사건번호(Az.) 형식으로 인용하세요",
          severity: "warning",
        };
      }
      return { passed: true, note: "판례 인용 형식 양호", severity: "info" };
    },
  },
  {
    id: 3,
    category: "A. 소스 신뢰도",
    name: "행정규칙·비공식 해석 구분",
    description: "Verwaltungsvorschrift, BMF-Schreiben 등을 법률과 명확히 구분했는지 확인",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      const vwKeywords = ["Verwaltungsvorschrift", "BMF-Schreiben", "Richtlinie", "Erlass"];
      const hasVw = vwKeywords.some((kw) => ctx.analysis_text!.includes(kw));
      if (hasVw && !ctx.analysis_text!.includes("법적 구속력") && !ctx.analysis_text!.includes("nicht rechtsverbindlich")) {
        return {
          passed: !ctx.strict,
          note: "행정규칙 참조 시 구속력 한계 미명시",
          recommendation: "행정규칙은 법원을 구속하지 않음을 명시하세요",
          severity: ctx.strict ? "error" : "warning",
        };
      }
      return { passed: true, note: "소스 유형 구분 양호", severity: "info" };
    },
  },

  // ── B. 법령 완전성 ────────────────────────────────────────────────────────
  {
    id: 4,
    category: "B. 법령 완전성",
    name: "법률 약어 유효성",
    description: "사용된 법률 약어가 알려진 독일 법령인지 확인",
    check: (ctx) => {
      const lawUpper = ctx.law.toUpperCase();
      if (KNOWN_LAWS.has(lawUpper)) {
        return { passed: true, note: `'${ctx.law}' — 알려진 법률`, severity: "info" };
      }
      return {
        passed: false,
        note: `'${ctx.law}' — 알려진 법률 목록에 없음`,
        recommendation: "법률 약어를 확인하거나 bundesrecht.bund.de에서 검색하세요",
        severity: "warning",
      };
    },
  },
  {
    id: 5,
    category: "B. 법령 완전성",
    name: "조문 번호 범위 확인",
    description: "조문 번호가 해당 법률의 유효 범위 내에 있는지 확인",
    check: (ctx) => {
      if (!ctx.section) {
        return { passed: true, note: "조문 미지정 — 건너뜀", severity: "info" };
      }
      const sectionNum = parseInt(ctx.section, 10);
      if (isNaN(sectionNum)) {
        return { passed: true, note: `비정형 조문 번호 '${ctx.section}' — 수동 확인 필요`, severity: "info" };
      }
      const limit = LAW_SECTION_LIMITS[ctx.law.toUpperCase()];
      if (limit && sectionNum > limit) {
        return {
          passed: false,
          note: `§ ${sectionNum} ${ctx.law} — 법률 최대 조문(§ ${limit}) 초과`,
          recommendation: "조문 번호를 다시 확인하세요",
          severity: "error",
        };
      }
      return { passed: true, note: `§ ${ctx.section} — 유효 범위 내`, severity: "info" };
    },
  },
  {
    id: 6,
    category: "B. 법령 완전성",
    name: "EU 규정 직접 적용 검토",
    description: "DSGVO·MiFID 등 EU 규정이 국내법보다 직접 적용되는 경우 확인",
    check: (ctx) => {
      const euSupersedeMap: Record<string, string[]> = {
        BDSG: ["DSGVO (Verordnung (EU) 2016/679) — 우선 적용"],
        TMG: ["DSGVO 제95조 — TMG 일부 조항 대체", "DDG (Digitale-Dienste-Gesetz) — TMG 2024-05-14부로 대체됨"],
        DDG: ["DSA (Verordnung (EU) 2022/2065) — 디지털 서비스 규정 직접 적용"],
        KWG: ["CRR (Verordnung (EU) 575/2013) — 자본요건 직접 규정"],
      };
      const lawUpper = ctx.law.toUpperCase();
      const euRules = euSupersedeMap[lawUpper];
      if (euRules) {
        return {
          passed: false,
          note: `EU 규정 우선 적용 가능성: ${euRules.join("; ")}`,
          recommendation: "국내법 분석 전 EU 규정의 직접 적용 여부를 먼저 확인하세요",
          severity: "warning",
        };
      }
      return { passed: true, note: "EU 규정 직접 적용 이슈 없음 (확인된 범위 내)", severity: "info" };
    },
  },
  {
    id: 7,
    category: "B. 법령 완전성",
    name: "폐지·대체 법률 확인",
    description: "분석 대상 법률이 폐지되었거나 다른 법률로 대체되었는지 확인",
    check: (ctx) => {
      const obsoleteLaws: Record<string, string> = {
        BUNDESDATENSCHUTZGESETZ_ALT: "BDSG 2018로 대체됨",
        TELEDIENSTEGESETZ: "TMG로 대체됨 (2007)",
        TMG: "DDG (Digitale-Dienste-Gesetz)로 대체됨 (2024-05-14 시행) — DDG를 사용하세요",
        MEDIENDIENSTE_STAATSVERTRAG: "각 주 미디어법으로 대체됨",
        HANDELSGESETZBUCH_DDR: "통일 후 HGB로 대체됨",
      };
      const lawUpper = ctx.law.toUpperCase();
      const obsolete = obsoleteLaws[lawUpper];
      if (obsolete) {
        return {
          passed: false,
          note: `폐지/대체 법률: ${obsolete}`,
          recommendation: "현행 법률을 사용하세요",
          severity: "error",
        };
      }
      return { passed: true, note: "현행 법률로 확인됨", severity: "info" };
    },
  },

  // ── C. 시간적 유효성 ──────────────────────────────────────────────────────
  {
    id: 8,
    category: "C. 시간적 유효성",
    name: "분석 날짜 명시",
    description: "분석 시점이 명시되어 있는지 확인 (법률은 빠르게 개정됨)",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      const datePattern = /\d{4}[-./]\d{2}[-./]\d{2}|\d{2}\.\d{2}\.\d{4}/;
      const hasDate = datePattern.test(ctx.analysis_text);
      return hasDate
        ? { passed: true, note: "날짜 명시 확인됨", severity: "info" }
        : {
            passed: false,
            note: "분석 날짜가 명시되지 않음",
            recommendation: "분석 기준일을 명시하세요 (예: '2025-01-01 기준')",
            severity: "warning",
          };
    },
  },
  {
    id: 9,
    category: "C. 시간적 유효성",
    name: "최근 개정 이력 확인 권고",
    description: "중요 법률은 최근 1년 내 개정 여부 확인 권고",
    check: (ctx) => {
      // 자주 개정되는 법률
      const frequentlyAmended = ["EStG", "KStG", "UStG", "AO", "BDSG", "KWG", "WpHG", "SGB"];
      const lawUpper = ctx.law.toUpperCase();
      const isFrequent = frequentlyAmended.includes(lawUpper);
      return isFrequent
        ? {
            passed: false,
            note: `${ctx.law}는 자주 개정되는 법률입니다`,
            recommendation: "BGBl. 최신 개정 이력을 확인하고 현행 버전 사용을 보장하세요",
            severity: "warning",
          }
        : { passed: true, note: "개정 빈도 낮음 — 일반적 주의 수준 적용", severity: "info" };
    },
  },
  {
    id: 10,
    category: "C. 시간적 유효성",
    name: "Übergangsregelung(경과 규정) 검토",
    description: "새 법률 시행 시 경과 규정이 분석에 반영되었는지 확인",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      const transitionKeywords = ["Übergangsregelung", "Übergangsvorschrift", "경과 규정", "부칙"];
      const hasTransition = transitionKeywords.some((kw) => ctx.analysis_text!.includes(kw));
      return {
        passed: true,
        note: hasTransition ? "경과 규정 검토됨" : "경과 규정 언급 없음 — 필요 시 확인 권고",
        severity: "info",
      };
    },
  },

  // ── D. 교차참조 일관성 ────────────────────────────────────────────────────
  {
    id: 11,
    category: "D. 교차참조 일관성",
    name: "인용 조문 형식 일관성",
    description: "§ 기호, 조문 번호, Abs., Nr. 형식이 일관성 있게 사용되었는지 확인",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      // 잘못된 형식 패턴 감지
      const badPatterns = [
        /Artikel\s+\d+\s+BGB/i,  // BGB는 조문(§), Artikel은 GG 등
        /§§\s*\d+\s+bis\s+\d+/i, // '§§ 1 bis 10' 대신 '§§ 1–10' 권장
      ];
      const issues = badPatterns.filter((p) => p.test(ctx.analysis_text!));
      if (issues.length > 0) {
        return {
          passed: false,
          note: "인용 형식 불일치 감지",
          recommendation: "BGB/EStG 등은 § 사용, GG는 Art. 사용",
          severity: "warning",
        };
      }
      return { passed: true, note: "인용 형식 일관성 양호", severity: "info" };
    },
  },
  {
    id: 12,
    category: "D. 교차참조 일관성",
    name: "핵심 연결 법률 누락 검토",
    description: "분석 법률과 필수 연결 법률이 검토되었는지 확인",
    check: (ctx) => {
      const mandatoryLinks: Record<string, string[]> = {
        BGB: ["EGBGB (도입법)", "ZPO (절차법)"],
        HGB: ["BGB (일반규정)", "AktG/GmbHG (회사법)"],
        BDSG: ["DSGVO (EU 기반)", "TTDSG (전기통신)"],
        KWG: ["CRR", "CRD IV", "MaRisk"],
        EStG: ["EStDV", "EStR (행정지침)"],
      };
      const lawUpper = ctx.law.toUpperCase();
      const links = mandatoryLinks[lawUpper];
      if (!links) {
        return { passed: true, note: "필수 연결 법률 정보 없음 — 수동 확인", severity: "info" };
      }
      return {
        passed: false,
        note: `${ctx.law} 분석 시 검토 권장 법률: ${links.join(", ")}`,
        recommendation: "위 연결 법률의 관련 조항도 함께 검토하세요",
        severity: "warning",
      };
    },
  },

  // ── E. 실무 적용성 ────────────────────────────────────────────────────────
  {
    id: 13,
    category: "E. 실무 적용성",
    name: "Ermessen·Beurteilungsspielraum 범위 명시",
    description: "행정청 재량(Ermessen) 또는 판단 여지(Beurteilungsspielraum)가 있는 경우 범위 명시 여부 확인",
    check: (ctx) => {
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      const hasErmessen = /Ermessen|Beurteilungsspielraum|재량/i.test(ctx.analysis_text);
      if (hasErmessen) {
        const hasScope = /gebundene|intendiertes|pflichtgemäß|범위/i.test(ctx.analysis_text);
        return hasScope
          ? { passed: true, note: "재량 범위 명시됨", severity: "info" }
          : {
              passed: false,
              note: "재량 언급 있으나 범위 미명시",
              recommendation: "재량의 종류(기속재량/자유재량)와 한계를 명시하세요",
              severity: "warning",
            };
      }
      return { passed: true, note: "재량 관련 특이사항 없음", severity: "info" };
    },
  },
  {
    id: 14,
    category: "E. 실무 적용성",
    name: "Verhältnismäßigkeit(비례원칙) 검토 여부",
    description: "공법 분야 분석 시 비례원칙 검토 포함 여부 확인",
    check: (ctx) => {
      const publicLawFields = ["BDSG", "VwVfG", "VwGO", "BImSchG", "KWG", "WpHG", "GwG"];
      const lawUpper = ctx.law.toUpperCase();
      if (!publicLawFields.includes(lawUpper)) {
        return { passed: true, note: "사법 분야 — 비례원칙 검토 불필요", severity: "info" };
      }
      if (!ctx.analysis_text) {
        return { passed: true, note: "분석 텍스트 미제공 — 건너뜀", severity: "info" };
      }
      const hasVP = /Verhältnismäßigkeit|비례원칙|geeignet|erforderlich|angemessen/i.test(ctx.analysis_text);
      return hasVP
        ? { passed: true, note: "비례원칙 검토됨", severity: "info" }
        : {
            passed: false,
            note: "공법 분야이나 비례원칙 검토 누락",
            recommendation: "적합성·필요성·상당성 3단계 비례원칙을 명시적으로 검토하세요",
            severity: "warning",
          };
    },
  },
];

// ── 도구 구현 ────────────────────────────────────────────────────────────────

export async function qualityGate(input: QualityGateInput): Promise<string> {
  try {
    const { law, section, analysis_text, strict } = input;

    const ctx: GateContext = { law, section, analysis_text, strict };

    const lines: string[] = [
      `[품질 게이트 검증 — ${law}${section ? ` § ${section}` : ""}]`,
      `모드: ${strict ? "엄격(Strict)" : "표준(Standard)"} | 기준일: ${new Date().toISOString().slice(0, 10)}`,
      "",
    ];

    let passCount = 0;
    let warnCount = 0;
    let failCount = 0;

    const gateResults: Array<{ gate: Gate; result: GateResult }> = [];

    for (const gate of GATES) {
      const result = gate.check(ctx);
      gateResults.push({ gate, result });
      if (result.passed) passCount++;
      else if (result.severity === "warning") warnCount++;
      else failCount++;
    }

    // ── 요약 헤더 ─────────────────────────────────────────────────────────────
    const total = GATES.length;
    const score = Math.round((passCount / total) * 100);
    const overallStatus =
      failCount > 0 ? "❌ FAIL" : warnCount > 2 ? "⚠️ WARNING" : "✅ PASS";

    lines.push(`종합 결과: ${overallStatus} (${score}점 / 100점)`);
    lines.push(`통과: ${passCount}/${total} | 경고: ${warnCount} | 실패: ${failCount}`);
    lines.push("");

    // ── 카테고리별 결과 ───────────────────────────────────────────────────────
    let currentCategory = "";
    for (const { gate, result } of gateResults) {
      if (gate.category !== currentCategory) {
        currentCategory = gate.category;
        lines.push(`━━ ${currentCategory} ${"━".repeat(Math.max(0, 40 - currentCategory.length))}`);
      }

      const icon = result.passed
        ? "✅"
        : result.severity === "error"
        ? "❌"
        : "⚠️";

      lines.push(`${icon} [${gate.id.toString().padStart(2, "0")}] ${gate.name}`);
      lines.push(`   ${result.note}`);
      if (result.recommendation) {
        lines.push(`   💡 권장: ${result.recommendation}`);
      }
      lines.push("");
    }

    // ── 최종 권고 ─────────────────────────────────────────────────────────────
    lines.push("─".repeat(50));
    if (failCount > 0) {
      lines.push("🚨 조치 필요 항목:");
      for (const { gate, result } of gateResults) {
        if (!result.passed && result.severity === "error") {
          lines.push(`  • [${gate.id}] ${gate.name}: ${result.recommendation ?? result.note}`);
        }
      }
      lines.push("");
    }

    if (score >= 90) lines.push("✨ 우수한 분석 품질입니다.");
    else if (score >= 70) lines.push("📋 일부 개선이 필요하나 실무 활용 가능한 수준입니다.");
    else lines.push("⚠️ 중요 항목이 누락되어 있습니다. 위 권장사항을 검토하세요.");

    return lines.join("\n");

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] Qualitäts-Gate 실행 중 오류: ${message}`;
  }
}
