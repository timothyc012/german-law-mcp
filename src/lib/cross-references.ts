/**
 * cross-references.ts — 독일법 교차참조 추출 엔진
 *
 * general-legal-research (kipeum86) 의 legal_store.py 교차참조 추출 로직을
 * 독일법 패턴에 맞게 TypeScript로 이식.
 *
 * 지원 패턴:
 *   § 823 BGB                   — 조문 + 법령 약어
 *   § 823 Abs. 1 BGB            — 조문 + 항
 *   §§ 823, 826 BGB             — 복수 조문
 *   Art. 6 Abs. 1 lit. a DSGVO  — EU 규정
 *   Art. 20 Abs. 3 GG           — 기본법
 *   BGB § 823                   — 역순
 *   BGH, Urt. v. 12.03.2023 – IX ZR 123/22 — 판례
 *   BGHZ 150, 248               — 공식 판례집
 */

export interface CrossReference {
  type: "statute" | "caselaw" | "eu_regulation";
  law: string;           // BGB, GG, DSGVO …
  section?: string;      // 823
  absatz?: string;       // 1
  litera?: string;       // a
  satz?: string;         // 1
  display: string;       // 원문 그대로
  normalized: string;    // 정규화된 형태 (§ 823 Abs. 1 BGB)
}

// ── 독일법 약어 목록 (교차참조 추출용) ──────────────────────────────────────

const KNOWN_LAW_ABBREVIATIONS = new Set([
  // 민사
  "BGB", "HGB", "ZPO", "GBO", "InsO", "FamFG", "BeurkG",
  // 형사
  "StGB", "StPO", "OWiG", "JGG",
  // 공법
  "GG", "VwGO", "VwVfG", "BVerfGG", "GewO", "BauGB", "BauNVO",
  // 노동
  "ArbGG", "BetrVG", "KSchG", "ArbZG", "MuSchG", "BEEG", "AGG",
  // 세금
  "AO", "EStG", "KStG", "UStG", "GewStG", "GrStG", "ErbStG", "BewG",
  // 지식재산
  "PatG", "MarkenG", "UrhG", "DesignG", "GebrMG",
  // 경쟁/소비자
  "UWG", "GWB", "PAngV", "PreisAngV", "AGBG",
  // 금융/보험
  "KWG", "VAG", "WpHG", "BörsenG", "VVG", "KAGB",
  // 데이터/IT
  "BDSG", "TMG", "TKG", "NetzDG", "IT-SiG",
  // EU (독일 적용)
  "DSGVO", "DSGVO-DurchführungsVO", "DS-GVO",
  // 사회보장
  "SGB", "SGBI", "SGBII", "SGBIII", "SGBIV", "SGBV", "SGBVI",
  "SGBVII", "SGBVIII", "SGBIX", "SGBX", "SGBXI", "SGBXII",
  // 기타 주요 법률
  "EGBGB", "EGGVG", "GVG", "RPflG", "BRAO", "StBerG", "WPO",
  "AktG", "GmbHG", "GenG", "PartGG", "UmwG", "WEG",
  "BNotO", "GNotKG", "RVG", "GKG", "FamGKG",
]);

// ── 정규식 패턴 ──────────────────────────────────────────────────────────────

// § 823 BGB  /  § 823 Abs. 1 BGB  /  § 823 Abs. 1 Satz 2 BGB
const STATUTE_PATTERN =
  /§{1,2}\s*(\d+[a-z]?(?:\s*,\s*\d+[a-z]?)*)\s*(?:Abs\.\s*(\d+))?\s*(?:Satz\s*(\d+))?\s*(?:Nr\.\s*(\d+))?\s*(?:lit\.\s*([a-z]))?\s*([A-Z][A-Za-z]{1,20}(?:G|O|V|Gesetz)?)/g;

// BGB § 823  — 역순
const STATUTE_REVERSE_PATTERN =
  /([A-Z][A-Za-z]{1,20}(?:G|O|V|Gesetz)?)\s*§{1,2}\s*(\d+[a-z]?)/g;

// Art. 6 DSGVO  /  Art. 6 Abs. 1 lit. a DSGVO
const EU_ARTICLE_PATTERN =
  /Art\.\s*(\d+[a-z]?)\s*(?:Abs\.\s*(\d+))?\s*(?:lit\.\s*([a-z]))?\s*([A-Z][A-Za-z\-]{2,30}(?:VO|Richtlinie|Verordnung)?)/g;

// Art. 20 GG  — 기본법 조항
const GG_ARTICLE_PATTERN =
  /Art\.\s*(\d+[a-z]?)\s*(?:Abs\.\s*(\d+))?\s*(?:Satz\s*(\d+))?\s*(GG)\b/g;

// BGH, Urt. v. 12.03.2023 – IX ZR 123/22
const CASE_PATTERN =
  /\b(BGH|BVerfG|BAG|BFH|BSG|BVerwG|BPatG)\s*[,\s]\s*(?:Urt\.|Beschl\.|Bes\.|B\.)?\s*v\.\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*[–\-–]\s*([A-Z]+\s+[A-Za-z]+\s*\d+\/\d+)/g;

// BGHZ 150, 248  /  BGHSt 65, 123
const OFFICIAL_REPORTER_PATTERN =
  /\b(BGHZ|BGHSt|BVerfGE|BAGE|BFHE|BVerwGE)\s+(\d+)\s*,\s*(\d+)/g;

// ── 추출 함수 ────────────────────────────────────────────────────────────────

/**
 * 텍스트에서 모든 독일법 교차참조를 추출한다.
 */
export function extractCrossReferences(text: string): CrossReference[] {
  const refs: CrossReference[] = [];
  const seen = new Set<string>();

  function addRef(ref: CrossReference) {
    if (!seen.has(ref.normalized)) {
      seen.add(ref.normalized);
      refs.push(ref);
    }
  }

  // 1. § X Law 패턴
  for (const m of text.matchAll(STATUTE_PATTERN)) {
    const sections = m[1].split(/\s*,\s*/);
    const absatz = m[2];
    const satz = m[3];
    const litera = m[5];
    const law = m[6];

    if (!KNOWN_LAW_ABBREVIATIONS.has(law)) continue;

    for (const section of sections) {
      const normalized = buildNormalized("statute", law, section.trim(), absatz, satz, litera);
      addRef({
        type: "statute",
        law,
        section: section.trim(),
        absatz,
        litera,
        satz,
        display: m[0].trim(),
        normalized,
      });
    }
  }

  // 2. Law § X 역순 패턴
  for (const m of text.matchAll(STATUTE_REVERSE_PATTERN)) {
    const law = m[1];
    const section = m[2];
    if (!KNOWN_LAW_ABBREVIATIONS.has(law)) continue;
    const normalized = buildNormalized("statute", law, section);
    addRef({ type: "statute", law, section, display: m[0].trim(), normalized });
  }

  // 3. Art. X EU Regulation 패턴
  for (const m of text.matchAll(EU_ARTICLE_PATTERN)) {
    const section = m[1];
    const absatz = m[2];
    const litera = m[3];
    const law = m[4];
    const normalized = buildNormalized("eu_regulation", law, section, absatz, undefined, litera);
    addRef({
      type: "eu_regulation",
      law,
      section,
      absatz,
      litera,
      display: m[0].trim(),
      normalized,
    });
  }

  // 4. Art. X GG 패턴
  for (const m of text.matchAll(GG_ARTICLE_PATTERN)) {
    const section = m[1];
    const absatz = m[2];
    const satz = m[3];
    const law = m[4];
    const normalized = buildNormalized("statute", law, section, absatz, satz);
    addRef({ type: "statute", law, section, absatz, satz, display: m[0].trim(), normalized });
  }

  // 5. 판례 패턴 (Court + Date + Aktenzeichen)
  for (const m of text.matchAll(CASE_PATTERN)) {
    const court = m[1];
    const date = m[2];
    const az = m[3];
    const normalized = `${court} ${date} ${az}`;
    addRef({
      type: "caselaw",
      law: court,
      section: az,
      display: m[0].trim(),
      normalized,
    });
  }

  // 6. 공식 판례집 패턴 (BGHZ, BGHSt 등)
  for (const m of text.matchAll(OFFICIAL_REPORTER_PATTERN)) {
    const reporter = m[1];
    const band = m[2];
    const seite = m[3];
    const normalized = `${reporter} ${band}, ${seite}`;
    addRef({
      type: "caselaw",
      law: reporter,
      section: `${band}, ${seite}`,
      display: m[0].trim(),
      normalized,
    });
  }

  return refs;
}

/**
 * 정규화된 인용 형태 생성
 * 예: § 823 Abs. 1 BGB
 */
function buildNormalized(
  type: CrossReference["type"],
  law: string,
  section?: string,
  absatz?: string,
  satz?: string,
  litera?: string,
): string {
  if (type === "eu_regulation") {
    let s = `Art. ${section}`;
    if (absatz) s += ` Abs. ${absatz}`;
    if (litera) s += ` lit. ${litera}`;
    s += ` ${law}`;
    return s;
  }
  let s = `§ ${section}`;
  if (absatz) s += ` Abs. ${absatz}`;
  if (satz) s += ` Satz ${satz}`;
  if (litera) s += ` lit. ${litera}`;
  s += ` ${law}`;
  return s;
}

/**
 * 교차참조 목록을 텍스트로 포매팅
 */
export function formatCrossReferences(refs: CrossReference[]): string {
  if (refs.length === 0) return "교차참조 없음";

  const statutes = refs.filter((r) => r.type === "statute");
  const euRefs = refs.filter((r) => r.type === "eu_regulation");
  const cases = refs.filter((r) => r.type === "caselaw");

  const lines: string[] = [];

  if (statutes.length > 0) {
    lines.push("📚 법령 교차참조:");
    for (const r of statutes) lines.push(`  • ${r.normalized}`);
  }
  if (euRefs.length > 0) {
    lines.push("🇪🇺 EU 규정 교차참조:");
    for (const r of euRefs) lines.push(`  • ${r.normalized}`);
  }
  if (cases.length > 0) {
    lines.push("⚖️ 판례 교차참조:");
    for (const r of cases) lines.push(`  • ${r.normalized}`);
  }

  return lines.join("\n");
}
