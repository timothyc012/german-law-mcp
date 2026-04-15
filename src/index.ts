#!/usr/bin/env node

/**
 * German Law MCP Server
 *
 * 독일 연방법률 검색 및 조회를 위한 MCP 서버.
 * NeuRIS API + Gesetze im Internet + EUR-Lex를 데이터 소스로 사용한다.
 *
 * v0.2.0: EUR-Lex EU법 통합, 신구조문 비교, 개정이력, 위임법령 추적, 목차 조회
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// ── 기존 도구 ──
import { searchLawSchema, searchLaw } from "./tools/search-law.js";
import { getLawSectionSchema, getLawSection } from "./tools/get-law-section.js";
import { searchCaseLawSchema, searchCaseLawTool } from "./tools/search-case-law.js";
import { getCaseTextSchema, getCaseText } from "./tools/get-case-text.js";
import { searchAllSchema, searchAllTool } from "./tools/search-all.js";

// ── 신규 도구 ──
import { getLawAmendmentsSchema, getLawAmendments } from "./tools/get-law-amendments.js";
import { compareSectionsSchema, compareSections } from "./tools/compare-sections.js";
import { getLawTocSchema, getLawToc } from "./tools/get-law-toc.js";
import { searchEurLexSchema, searchEurLexTool } from "./tools/search-eurlex.js";
import { getEurLexDocumentSchema, getEurLexDocumentTool } from "./tools/get-eurlex-document.js";
import { findDelegatedLegislationSchema, findDelegatedLegislation } from "./tools/find-delegated-legislation.js";

const server = new McpServer({
  name: "german-law-mcp",
  version: "0.2.0",
  description: "German law search & analysis — legislation, case law, EUR-Lex, amendments, delegation tracking",
});

// ── 독일법 검색 ──

server.tool(
  "search_law",
  "Search German federal legislation by keyword. Returns matching laws with relevant text excerpts. Use German legal terms for best results (e.g., 'Kaufvertrag', 'Mietrecht', 'Datenschutz').",
  searchLawSchema.shape,
  async (params) => {
    const input = searchLawSchema.parse(params);
    const result = await searchLaw(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_law_section",
  "Retrieve a specific section (§) of a German law. Provide the law abbreviation (e.g., 'BGB', 'StGB', 'GG') and section number (e.g., '437', '823'). Returns the full text of that section.",
  getLawSectionSchema.shape,
  async (params) => {
    const input = getLawSectionSchema.parse(params);
    const result = await getLawSection(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "search_case_law",
  "Search German federal court decisions. Covers all 7 federal courts: BGH, BVerfG, BVerwG, BFH, BAG, BSG, BPatG (81,924 decisions total). Optionally filter by court.",
  searchCaseLawSchema.shape,
  async (params) => {
    const input = searchCaseLawSchema.parse(params);
    const result = await searchCaseLawTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_case_text",
  "Retrieve the full text of a court decision by its document number (e.g., 'JURE120015069'). Use search_case_law first to find the document number.",
  getCaseTextSchema.shape,
  async (params) => {
    const input = getCaseTextSchema.parse(params);
    const result = await getCaseText(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "search_all",
  "Unified search across both legislation and court decisions simultaneously. Useful when the topic is broad or you want to find both laws and related case law at once.",
  searchAllSchema.shape,
  async (params) => {
    const input = searchAllSchema.parse(params);
    const result = await searchAllTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── 신규: 개정이력 / 비교 / 목차 ──

server.tool(
  "get_law_amendments",
  "Retrieve amendment history (Änderungshistorie) of a German law. Shows when and by which legislation the law was last modified. Useful for tracking legal changes over time.",
  getLawAmendmentsSchema.shape,
  async (params) => {
    const input = getLawAmendmentsSchema.parse(params);
    const result = await getLawAmendments(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "compare_sections",
  "Compare two law sections side by side with diff output. Three modes: (1) Compare two sections of the same law, (2) Compare sections across different laws, (3) Compare user-provided old text with current text (Synopse/신구조문 비교).",
  compareSectionsSchema.shape,
  async (params) => {
    const input = compareSectionsSchema.parse(params);
    const result = await compareSections(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_law_toc",
  "Retrieve the table of contents (Inhaltsverzeichnis) of a German law. Shows the full structure: Bücher, Teile, Abschnitte, and individual sections (§§). Useful for understanding law structure before diving into specific sections.",
  getLawTocSchema.shape,
  async (params) => {
    const input = getLawTocSchema.parse(params);
    const result = await getLawToc(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── 신규: EUR-Lex EU법 ──

server.tool(
  "search_eurlex",
  "Search EU legislation on EUR-Lex (regulations, directives, decisions). Uses CELLAR SPARQL endpoint. Search in German for best results. Useful for finding EU law that applies in Germany (e.g., GDPR/DSGVO, consumer protection directives).",
  searchEurLexSchema.shape,
  async (params) => {
    const input = searchEurLexSchema.parse(params);
    const result = await searchEurLexTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

server.tool(
  "get_eurlex_document",
  "Retrieve the full text of an EU legal document by its CELEX number (e.g., '32016R0679' for GDPR). Use search_eurlex first to find the CELEX number. Returns the German language version.",
  getEurLexDocumentSchema.shape,
  async (params) => {
    const input = getEurLexDocumentSchema.parse(params);
    const result = await getEurLexDocumentTool(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── 신규: 위임법령 추적 ──

server.tool(
  "find_delegated_legislation",
  "Find delegated legislation (Verordnungen/Durchführungsverordnungen) related to a specific German law. Tracks the delegation chain: Gesetz → Rechtsverordnung → Verwaltungsvorschrift. Useful for understanding the full regulatory framework around a law.",
  findDelegatedLegislationSchema.shape,
  async (params) => {
    const input = findDelegatedLegislationSchema.parse(params);
    const result = await findDelegatedLegislation(input);
    return { content: [{ type: "text", text: result }] };
  },
);

// ── 서버 시작 ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
