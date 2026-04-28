#!/usr/bin/env node
/**
 * Smoke-test the built MCP stdio server.
 *
 * This intentionally uses a network-free tool call so CI can validate the
 * server protocol surface without depending on external legal data sources.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const EXPECTED_TOOL_COUNT = 33;

async function main() {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["dist/index.js"],
    stderr: "pipe",
  });

  const client = new Client({
    name: "german-law-mcp-smoke",
    version: "0.1.0",
  });

  try {
    await client.connect(transport);

    const { tools } = await client.listTools();
    const toolNames = new Set(tools.map((tool) => tool.name));

    if (tools.length !== EXPECTED_TOOL_COUNT) {
      throw new Error(`Expected ${EXPECTED_TOOL_COUNT} tools, got ${tools.length}`);
    }

    for (const required of ["search_law", "get_law_section", "lookup_legal_term", "risk_alert", "review_contract_clauses", "chain_full_research"]) {
      if (!toolNames.has(required)) {
        throw new Error(`Required tool missing from MCP listTools: ${required}`);
      }
    }

    const result = await client.callTool({
      name: "lookup_legal_term",
      arguments: { term: "Sachmangel", language: "ko" },
    });

    const text = result.content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join("\n");

    if (!text.includes("Sachmangel") || !text.includes("§ 434 BGB")) {
      throw new Error("lookup_legal_term smoke call did not return expected legal term content");
    }

    console.log(`MCP smoke passed: ${tools.length} tools listed and lookup_legal_term responded.`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
