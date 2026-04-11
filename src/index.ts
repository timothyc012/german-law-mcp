#!/usr/bin/env node

/**
 * German Law MCP Server
 *
 * 독일 연방법률 검색 및 조회를 위한 MCP 서버.
 * NeuRIS API + Gesetze im Internet을 데이터 소스로 사용한다.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { searchLawSchema, searchLaw } from "./tools/search-law.js";
import { getLawSectionSchema, getLawSection } from "./tools/get-law-section.js";
import { searchCaseLawSchema, searchCaseLawTool } from "./tools/search-case-law.js";
import { getCaseTextSchema, getCaseText } from "./tools/get-case-text.js";
import { searchAllSchema, searchAllTool } from "./tools/search-all.js";

const server = new McpServer({
  name: "german-law-mcp",
  version: "0.1.0",
  description: "German federal law search and retrieval — legislation and court decisions",
});

// ── 도구 등록 ──

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
  "Retrieve a specific section (\u00a7) of a German law. Provide the law abbreviation (e.g., 'BGB', 'StGB', 'GG') and section number (e.g., '437', '823'). Returns the full text of that section.",
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

// ── 서버 시작 ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
