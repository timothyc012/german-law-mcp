#!/usr/bin/env node

/**
 * German Law MCP Server
 *
 * 독일 연방법률 검색 및 조회를 위한 MCP 서버.
 * NeuRIS API + Gesetze im Internet을 데이터 소스로 사용한다.
 *
 * 도구 목록 (22개):
 * ── 기본 검색 ──────────────────────────────────────────
 *  1. search_law          — 법률 키워드 검색 (GII)
 *  2. get_law_section     — 특정 조문 전문 조회
 *  3. search_case_law     — 연방법원 판례 검색 (NeuRIS)
 *  4. get_case_text       — 판례 전문 조회
 *  5. search_all          — 법률+판례 통합 검색
 * ── 실무 계산 ──────────────────────────────────────────
 *  6. calculate_rvg       — 변호사 수임료 계산 (RVG)
 *  7. calculate_frist     — 소송 기한 계산 (ZPO)
 * ── 검증 / 이력 ────────────────────────────────────────
 *  8. verify_citation     — 판례 인용 검증 (환각 방지)
 *  9. get_norm_version    — 법령 역사적 버전 조회
 * ── 심층 분석 ──────────────────────────────────────────
 * 10. gutachten_scaffold  — 법률 감정서 구조 자동 생성
 * 11. spot_issues         — 사실관계 법적 이슈 스포터
 * 12. analyze_case        — 판례 심층 분석 (리드자츠, 규범망)
 * 13. get_norm_context    — 법령 맥락 조회 (인접·관련 조문)
 * 14. search_state_courts — OLG/LG 판례 검색 (openjur.de)
 * 15. analyze_scenario    — 시나리오 기반 청구원인 분석
 * 16. compare_de_eu       — 독일-EU법 교차비교
 * ── 품질 / 고급 분석 (Phase 4) ─────────────────────────
 * 17. get_delegation_chain — 3단계 위임 체계 추적 (법률→시행령→행정규칙)
 * 18. search_with_grade    — 소스 신뢰도 등급(A-D) 포함 통합 검색
 * 19. extract_cross_refs   — 조문 교차참조 추출 (타 법률·EU법령 링크)
 * 20. quality_gate         — 14단계 법률 분석 품질 자동 검증
 * ── 주법 (Phase 5) ─────────────────────────────────────
 * 21. search_state_law     — 16개 주 주요 법령 검색 (약어·분야·주코드)
 * 22. get_state_law_section — 주법 조문 조회 (Bayern 실시간 파싱)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// 기본 검색 도구
import { searchLawSchema, searchLaw } from "./tools/search-law.js";
import { getLawSectionSchema, getLawSection } from "./tools/get-law-section.js";
import { searchCaseLawSchema, searchCaseLawTool } from "./tools/search-case-law.js";
import { getCaseTextSchema, getCaseText } from "./tools/get-case-text.js";
import { searchAllSchema, searchAllTool } from "./tools/search-all.js";

// 실무 계산 도구
import { calculateRvgSchema, calculateRvg } from "./tools/calculate-rvg.js";
import { calculateFristSchema, calculateFrist } from "./tools/calculate-frist.js";

// 검증 / 이력 도구
import { verifyCitationSchema, verifyCitation } from "./tools/verify-citation.js";
import { getNormVersionSchema, getNormVersion } from "./tools/get-norm-version.js";

// 심층 분석 도구 (Phase 2)
import { gutachtenScaffoldSchema, gutachtenScaffold } from "./tools/gutachten-scaffold.js";
import { spotIssuesSchema, spotIssues } from "./tools/spot-issues.js";
import { analyzeCaseSchema, analyzeCase } from "./tools/analyze-case.js";
import { getNormContextSchema, getNormContext } from "./tools/get-norm-context.js";

// 확장 도구 (Phase 3)
import { searchStateCourtsSchema, searchStateCourts } from "./tools/search-state-courts.js";
import { analyzeScenarioSchema, analyzeScenario } from "./tools/analyze-scenario.js";
import { compareDeEuSchema, compareDeEu } from "./tools/compare-de-eu.js";

// 품질 / 고급 분석 도구 (Phase 4)
import { getDelegationChainSchema, getDelegationChain } from "./tools/get-delegation-chain.js";
import { searchWithGradeSchema, searchWithGrade } from "./tools/search-with-grade.js";
import { extractCrossRefsSchema, extractCrossRefs } from "./tools/extract-cross-refs.js";
import { qualityGateSchema, qualityGate } from "./tools/quality-gate.js";

// 주법 도구 (Phase 5)
import { searchStateLawSchema, searchStateLaw } from "./tools/search-state-law.js";
import { getStateLawSectionSchema, getStateLawSectionTool } from "./tools/get-state-law-section.js";

const server = new McpServer({
  name: "german-law-mcp",
  version: "0.5.0",
  description:
    "German law MCP server — 22 tools covering federal legislation, court decisions, " +
    "fee calculation, deadline computation, citation verification, legal analysis, " +
    "German-EU law comparison, delegation chain tracing, source grading, " +
    "cross-reference extraction, 14-gate quality validation, " +
    "and state law (Landesrecht) for all 16 German states. " +
    "Data: NeuRIS (81,924 federal decisions) + gesetze-im-internet.de + " +
    "gesetze-bayern.de (live parsing) + openjur.de (state courts).",
});

// ── [1] 기본 검색 도구 ─────────────────────────────────────────────────────

server.registerTool(
  "search_law",
  {
    description:
      "Search German federal legislation by keyword. Returns matching laws with relevant text excerpts. " +
      "Use German legal terms for best results (e.g., 'Kaufvertrag', 'Mietrecht', 'Datenschutz', 'BGB').",
    inputSchema: searchLawSchema.shape,
  },
  async (params) => {
    const input = searchLawSchema.parse(params);
    const result = await searchLaw(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "get_law_section",
  {
    description:
      "Retrieve a specific section (§) of a German law. " +
      "Provide the law abbreviation (e.g., 'BGB', 'StGB', 'GG') and section number (e.g., '437', '823'). " +
      "Returns the full text of that section.",
    inputSchema: getLawSectionSchema.shape,
  },
  async (params) => {
    const input = getLawSectionSchema.parse(params);
    const result = await getLawSection(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "search_case_law",
  {
    description:
      "Search German federal court decisions. Covers all 7 federal courts: " +
      "BGH, BVerfG, BVerwG, BFH, BAG, BSG, BPatG (81,924 decisions total). Optionally filter by court.",
    inputSchema: searchCaseLawSchema.shape,
  },
  async (params) => {
    const input = searchCaseLawSchema.parse(params);
    const result = await searchCaseLawTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "get_case_text",
  {
    description:
      "Retrieve the full text of a court decision by its document number (e.g., 'JURE120015069'). " +
      "Use search_case_law first to find the document number.",
    inputSchema: getCaseTextSchema.shape,
  },
  async (params) => {
    const input = getCaseTextSchema.parse(params);
    const result = await getCaseText(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "search_all",
  {
    description:
      "Unified search across both legislation and court decisions simultaneously. " +
      "Useful when the topic is broad or you want to find both laws and related case law at once.",
    inputSchema: searchAllSchema.shape,
  },
  async (params) => {
    const input = searchAllSchema.parse(params);
    const result = await searchAllTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── [2] 실무 계산 도구 ─────────────────────────────────────────────────────

server.registerTool(
  "calculate_rvg",
  {
    description:
      "Berechnet Rechtsanwaltsgebühren nach dem RVG (Rechtsanwaltsvergütungsgesetz). " +
      "Gibt Gebührenrahmen, konkrete Beträge und Mehrwertsteuer für den angegebenen Streitwert aus.",
    inputSchema: calculateRvgSchema.shape,
  },
  async (params) => {
    const input = calculateRvgSchema.parse(params);
    const result = await calculateRvg(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "calculate_frist",
  {
    description:
      "Berechnet Prozessfristen nach der ZPO (Zivilprozessordnung). " +
      "Berücksichtigt Fristtyp (Tage/Wochen/Monate), Sonn-/Feiertage und § 222 ZPO i.V.m. § 193 BGB.",
    inputSchema: calculateFristSchema.shape,
  },
  async (params) => {
    const input = calculateFristSchema.parse(params);
    const result = await calculateFrist(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── [3] 검증 / 이력 도구 ──────────────────────────────────────────────────

server.registerTool(
  "verify_citation",
  {
    description:
      "Prüft deutsche Rechtsprechungszitate auf Existenz (Halluzinationsschutz). " +
      "Unterstützt: Aktenzeichen (BGH IX ZR 123/22), Zeitschriften (BGH NJW 2023, 1234), " +
      "Amtliche Sammlungen (BGHZ 150, 248), BeckRS, NeuRIS-Dokumentnummern (JURE...).",
    inputSchema: verifyCitationSchema.shape,
  },
  async (params) => {
    const input = verifyCitationSchema.parse(params);
    const result = await verifyCitation(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "get_norm_version",
  {
    description:
      "Ruft den historischen Stand eines deutschen Gesetzes zu einem Stichtag ab. " +
      "Nutzt gesetze-im-internet.de (aktuell) + Wayback Machine (historisch). " +
      "Beispiel: '§ 13 TMG am 24.05.2018', '§ 312d BGB vor 2014'.",
    inputSchema: getNormVersionSchema.shape,
  },
  async (params) => {
    const input = getNormVersionSchema.parse(params);
    const result = await getNormVersion(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── [4] 심층 분석 도구 (Phase 2) ──────────────────────────────────────────

server.registerTool(
  "gutachten_scaffold",
  {
    description:
      "Erstellt ein vollständiges Rechtsgutachten-Gerüst im Gutachtenstil (deutsche juristische Methodik). " +
      "Eingabe: Sachverhalt + Rechtsfrage. Ausgabe: strukturiertes Gerüst mit Obersatz, Voraussetzungen, " +
      "Subsumtion und Ergebnis je Anspruchsgrundlage — bereit zur Ausfüllung.",
    inputSchema: gutachtenScaffoldSchema.shape,
  },
  async (params) => {
    const input = gutachtenScaffoldSchema.parse(params);
    const result = await gutachtenScaffold(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "spot_issues",
  {
    description:
      "Analysiert einen deutschen Rechtssachverhalt und identifiziert juristische Kernprobleme. " +
      "Erkennt Rechtsgebiete, benennt Anspruchsgrundlagen, priorisiert nach Relevanz und zeigt " +
      "kritische Fristen + Verjährungsrisiken. Ideal als erster Schritt vor gutachten_scaffold.",
    inputSchema: spotIssuesSchema.shape,
  },
  async (params) => {
    const input = spotIssuesSchema.parse(params);
    const result = await spotIssues(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "analyze_case",
  {
    description:
      "Tiefenanalyse eines BGH/BVerfG-Urteils aus NeuRIS. Extrahiert Leitsätze, Tenor, " +
      "Normenkette, Entscheidungsgründe-Auszug und bewertet die Praxisrelevanz. " +
      "Sucht optional ähnliche Urteile. Eingabe: NeuRIS-Dokumentnummer (aus search_case_law).",
    inputSchema: analyzeCaseSchema.shape,
  },
  async (params) => {
    const input = analyzeCaseSchema.parse(params);
    const result = await analyzeCase(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "get_norm_context",
  {
    description:
      "Gibt den vollständigen Normenkontext eines deutschen Paragraphen zurück: " +
      "aktueller Normtext, benachbarte Paragraphen, verwandte Normen, typische Anwendungsfälle, " +
      "Kommentar-Hinweise und BGH-Leitentscheidungen. " +
      "Beispiel: get_norm_context({ gesetz: 'BGB', paragraph: '437' })",
    inputSchema: getNormContextSchema.shape,
  },
  async (params) => {
    const input = getNormContextSchema.parse(params);
    const result = await getNormContext(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── [5] 확장 도구 (Phase 3) ───────────────────────────────────────────────

server.registerTool(
  "search_state_courts",
  {
    description:
      "Durchsucht OLG- und LG-Urteile über openjur.de — Deutschlands größte freie Urteilsdatenbank. " +
      "Ergänzt search_case_law (Bundesgerichte) um Berufungs- und Erstinstanzentscheidungen. " +
      "Filterbar nach Gericht, Zeitraum und Instanz.",
    inputSchema: searchStateCourtsSchema.shape,
  },
  async (params) => {
    const input = searchStateCourtsSchema.parse(params);
    const result = await searchStateCourts(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "analyze_scenario",
  {
    description:
      "Analysiert einen deutschen Rechtssachverhalt und ermittelt systematisch: " +
      "Rechtsgebiete, Anspruchsgrundlagen mit Erfolgschancen-Ampel, Verteidigungsargumente, " +
      "Beweismittel und empfohlenen Verfahrensweg. " +
      "Perspektive wählbar: Kläger / Beklagter / neutral. Kein Rechtsrat — Orientierungshilfe.",
    inputSchema: analyzeScenarioSchema.shape,
  },
  async (params) => {
    const input = analyzeScenarioSchema.parse(params);
    const result = await analyzeScenario(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "compare_de_eu",
  {
    description:
      "Vergleicht deutsches Recht mit EU-Recht zu einem Thema. " +
      "Zeigt: EU-Rechtsakt, deutsche Umsetzungsnorm, Abweichungen, Anwendungsvorrang, " +
      "EuGH-Leitentscheidungen und praktische Konsequenzen. " +
      "Themen: Datenschutz, Kaufrecht, Arbeitszeit, Produkthaftung, Kartellrecht.",
    inputSchema: compareDeEuSchema.shape,
  },
  async (params) => {
    const input = compareDeEuSchema.parse(params);
    const result = await compareDeEu(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── [6] 품질 / 고급 분석 도구 (Phase 4) ──────────────────────────────────

server.registerTool(
  "get_delegation_chain",
  {
    description:
      "독일법 3단계 위임 체계 추적. 법률(Gesetz) → 시행령(Rechtsverordnung) → 행정규칙(Verwaltungsvorschrift) 구조를 반환. " +
      "특정 조문의 위임 조항(Ermächtigungsnorm) 감지 포함. 지원 법률: BDSG, KWG, EStG, UStG, AO, UWG, GmbHG, AktG 등.",
    inputSchema: getDelegationChainSchema.shape,
  },
  async (params) => {
    const input = getDelegationChainSchema.parse(params);
    const result = await getDelegationChain(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "search_with_grade",
  {
    description:
      "Search German legislation and case law with source reliability grades (A–D). " +
      "Grade A: federal legislation (BGBl). Grade B: federal court decisions (BGH/BVerfG). " +
      "Grade C: state court decisions. Grade D: administrative guidelines. " +
      "Filter results by minimum grade. Searches legislation + case law in parallel.",
    inputSchema: searchWithGradeSchema.shape,
  },
  async (params) => {
    const input = searchWithGradeSchema.parse(params);
    const result = await searchWithGrade(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "extract_cross_refs",
  {
    description:
      "교차참조 추출: 독일 법령 조문에서 다른 법률·조항·EU법령 참조를 자동 추출. " +
      "타입별 분류: 동일 법률 내(internal), 타 법률(external), EU 규정/지침(eu), 기본법(grundgesetz). " +
      "결과에 참조 맥락(context) 포함. 법령 연구 및 의존성 분석에 활용.",
    inputSchema: extractCrossRefsSchema.shape,
  },
  async (params) => {
    const input = extractCrossRefsSchema.parse(params);
    const result = await extractCrossRefs(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "quality_gate",
  {
    description:
      "14-gate legal analysis quality validator for German law. " +
      "Categories: A) Source reliability (gates 1-3), B) Legislative completeness (4-7), " +
      "C) Temporal validity (8-10), D) Cross-reference consistency (11-12), " +
      "E) Practical applicability (13-14). " +
      "Returns pass/fail per gate with recommendations. Strict mode available.",
    inputSchema: qualityGateSchema.shape,
  },
  async (params) => {
    const input = qualityGateSchema.parse(params);
    const result = await qualityGate(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── [7] 주법 도구 (Phase 5) ────────────────────────────────────────────────

server.registerTool(
  "search_state_law",
  {
    description:
      "독일 주법(Landesrecht) 검색 — 16개 주의 주요 법령을 약어·분야·주코드로 검색. " +
      "지원 분야: police(경찰), building(건축), data(데이터보호), education(교육), " +
      "local(지방자치), press(언론), environ(환경), transport(교통), admin(행정절차). " +
      "지원 주: BY(Bayern), BE(Berlin), HH(Hamburg), HE(Hessen), BW(Baden-Württemberg), " +
      "NW(NRW), NI(Niedersachsen), SN(Sachsen) 외 8개 주.",
    inputSchema: searchStateLawSchema.shape,
  },
  async (params) => {
    const input = searchStateLawSchema.parse(params);
    const result = await searchStateLaw(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.registerTool(
  "get_state_law_section",
  {
    description:
      "독일 주법 조문 조회. Bayern(BY)는 gesetze-bayern.de에서 실시간 HTML 파싱으로 " +
      "조문 원문을 직접 반환. 그 외 주는 법령 정보와 포털 직접 접근 URL을 반환. " +
      "Bayern 예: state='BY', law='BayBO', section='13' → 건축허가 조문 원문. " +
      "Berlin 예: state='BE', law='ASOG' → 베를린 경찰법 URL 안내.",
    inputSchema: getStateLawSectionSchema.shape,
  },
  async (params) => {
    const input = getStateLawSectionSchema.parse(params);
    const result = await getStateLawSectionTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── 서버 시작 ──────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
