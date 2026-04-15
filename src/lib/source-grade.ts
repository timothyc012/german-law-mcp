/**
 * source-grade.ts — 소스 신뢰도 등급 체계 (A–D)
 *
 * general-legal-research (kipeum86) 의 소스 등급 체계를 독일법에 맞게 이식.
 *
 * 등급 정의:
 *   A — 1차 법령 원문 (gesetze-im-internet.de, NeuRIS, EUR-Lex 원문)
 *   B — 공식 해설/공보 (BT-Drucksache, BGBl, BVerfG/BGH 공식 사이트)
 *   C — 공신력 있는 2차 자료 (법학 교과서, 주석서, 로펌 공식 뉴스레터)
 *   D — 미검증 / 일반 인터넷 (Wikipedia, 블로그, 요약 사이트)
 */

export type SourceGrade = "A" | "B" | "C" | "D";

export interface GradedSource {
  url: string;
  title?: string;
  grade: SourceGrade;
  gradeReason: string;
  verifiedAt: string;
}

// ── 도메인 기반 등급 규칙 ──────────────────────────────────────────────────

/** Grade-A 도메인: 1차 법령 원문 */
const GRADE_A_DOMAINS: string[] = [
  "gesetze-im-internet.de",
  "rechtsinformationen.bund.de",  // NeuRIS
  "eur-lex.europa.eu",
  "bundesverfassungsgericht.de",
  "bundesgerichtshof.de",
  "bundesverwaltungsgericht.de",
  "bsg.bund.de",                  // Bundessozialgericht
  "bag.bund.de",                  // Bundesarbeitsgericht
  "bfh.bund.de",                  // Bundesfinanzhof
  "bpatg.de",                     // Bundespatentgericht
  "openjur.de",                   // OLG/LG 공개 판례
  "dejure.org",                   // 검증된 법령 DB
  "lexetius.com",                 // 공개 판례 아카이브
];

/** Grade-B 도메인: 공식 해설 / 정부 공보 */
const GRADE_B_DOMAINS: string[] = [
  "bmj.de",                       // 연방법무부
  "bmwk.de",                      // 연방경제부
  "bafin.de",                     // 금융감독청
  "bundestag.de",                 // 연방의회 (BT-Drucksache)
  "bundesrat.de",
  "bundesanzeiger.de",            // 연방공보
  "bgbl.de",                      // BGBl (연방법률공보)
  "datenschutzkonferenz-online.de", // DSK
  "bfdi.bund.de",                 // 연방개인정보보호관
  "bka.de",
  "dguv.de",                      // 산재보험
  "din.de",                       // DIN 표준
];

/** Grade-C 도메인: 공신력 있는 2차 자료 */
const GRADE_C_DOMAINS: string[] = [
  "beck-online.de",
  "juris.de",
  "wolterskluwer.com",
  "otto-schmidt.de",
  "nwb.de",
  "haufe.de",
  "lto.de",                       // Legal Tribune Online
  "anwaltsblatt.de",
  "nzz.ch",
  "faz.net",
  "recht.de",
];

// ── 등급 부여 함수 ─────────────────────────────────────────────────────────

/**
 * URL을 분석해 소스 등급을 반환한다.
 */
export function gradeSource(url: string, title?: string): GradedSource {
  const lower = url.toLowerCase();

  // Grade A 체크
  for (const domain of GRADE_A_DOMAINS) {
    if (lower.includes(domain)) {
      return {
        url,
        title,
        grade: "A",
        gradeReason: `1차 법령 원문 출처 (${domain})`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  // Grade B 체크
  for (const domain of GRADE_B_DOMAINS) {
    if (lower.includes(domain)) {
      return {
        url,
        title,
        grade: "B",
        gradeReason: `공식 정부/감독기관 출처 (${domain})`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  // Grade C 체크
  for (const domain of GRADE_C_DOMAINS) {
    if (lower.includes(domain)) {
      return {
        url,
        title,
        grade: "C",
        gradeReason: `공신력 있는 법학 출판사/미디어 (${domain})`,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  // Grade D — 미분류
  return {
    url,
    title,
    grade: "D",
    gradeReason: "미검증 출처 — 1차 원문으로 직접 확인 필요",
    verifiedAt: new Date().toISOString(),
  };
}

/**
 * 여러 소스를 등급화하고 등급 순으로 정렬한다.
 */
export function gradeSources(sources: Array<{ url: string; title?: string }>): GradedSource[] {
  const gradeOrder: Record<SourceGrade, number> = { A: 0, B: 1, C: 2, D: 3 };
  return sources
    .map((s) => gradeSource(s.url, s.title))
    .sort((a, b) => gradeOrder[a.grade] - gradeOrder[b.grade]);
}

/**
 * 소스 등급 요약 텍스트 생성
 */
export function formatGradedSource(s: GradedSource): string {
  const badge =
    s.grade === "A" ? "🟢 [A급]" :
    s.grade === "B" ? "🔵 [B급]" :
    s.grade === "C" ? "🟡 [C급]" :
                      "🔴 [D급]";
  const title = s.title ? ` ${s.title}` : "";
  return `${badge}${title}\n   출처: ${s.url}\n   근거: ${s.gradeReason}`;
}

/**
 * 소스 세탁(Source Laundering) 탐지:
 * 텍스트에 법령 조문 인용 없이 결론만 있는 경우 경고를 반환한다.
 */
export function detectSourceLaundering(text: string, sourceUrl: string): string | null {
  const isSecondarySource =
    gradeSource(sourceUrl).grade === "C" || gradeSource(sourceUrl).grade === "D";

  if (!isSecondarySource) return null;

  // 독일법 1차 인용 패턴 확인
  const primaryCitationPatterns = [
    /§\s*\d+/,                          // § 823
    /Art\.\s*\d+/,                      // Art. 6
    /Abs\.\s*\d+/,                      // Abs. 2
    /Nr\.\s*\d+/,                       // Nr. 1
    /\b(?:BGH|BVerfG|BAG|BFH|BSG|BVerwG)\s*[,\-]/i, // BGH, Urt.
    /\bBGHZ\s+\d+/i,                    // BGHZ 150
    /\bBGBl\b/i,                        // BGBl.
    /\bBT-Drucks\b/i,                   // BT-Drucksache
  ];

  const hasPrimaryCitation = primaryCitationPatterns.some((p) => p.test(text));

  if (!hasPrimaryCitation) {
    return `⚠️ 소스 세탁 의심: 2차 출처(${sourceUrl})에 1차 법령/판례 인용이 없습니다. 원문 출처를 직접 확인하세요.`;
  }

  return null;
}
