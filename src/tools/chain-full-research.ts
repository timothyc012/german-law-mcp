/**
 * chain_full_research — Opinionated legal research report workflow.
 *
 * Produces a deterministic report shape by combining issue spotting with
 * optional live legislation/case-law searches and an optional quality gate.
 */

import { z } from "zod";
import { spotIssues } from "./spot-issues.js";
import { searchLaw } from "./search-law.js";
import { searchCaseLawTool } from "./search-case-law.js";
import { qualityGate } from "./quality-gate.js";

export const chainFullResearchSchema = z.object({
  topic: z.string().min(10).describe("Legal question, facts, or research topic"),
  primary_law: z.string().optional().describe("Optional primary law abbreviation for quality gate, e.g. BGB, ZPO, BDSG"),
  court: z.string().optional().describe("Optional federal court filter for case-law search, e.g. bgh, bverfg"),
  size: z.number().min(1).max(10).default(5).describe("Number of live search results per source"),
  include_live_sources: z.boolean().default(true).describe("Whether to call live legislation/case-law search tools"),
  include_quality_gate: z.boolean().default(true).describe("Whether to run quality_gate when primary_law is available"),
});

export type ChainFullResearchInput = z.infer<typeof chainFullResearchSchema>;

function section(title: string, body: string): string {
  return [`## ${title}`, "", body.trim() || "(no output)", ""].join("\n");
}

export async function chainFullResearch(input: ChainFullResearchInput): Promise<string> {
  try {
    const lines: string[] = [
      `# Legal Research Report`,
      "",
      `[chain_full_research] ${new Date().toISOString().slice(0, 10)}`,
      "",
      `**Topic:** ${input.topic}`,
      `**Primary law:** ${input.primary_law ?? "not specified"}`,
      `**Live sources:** ${input.include_live_sources ? "enabled" : "disabled"}`,
      "",
    ];

    const issueOutput = await spotIssues({
      sachverhalt: input.topic,
    });
    lines.push(section("1. Issue Spotting", issueOutput));

    let combinedForQuality = issueOutput;

    if (input.include_live_sources) {
      const lawOutput = await searchLaw({ query: input.topic, size: input.size });
      const caseOutput = await searchCaseLawTool({
        query: input.topic,
        court: input.court,
        size: input.size,
      });

      combinedForQuality = [combinedForQuality, lawOutput, caseOutput].join("\n\n");
      lines.push(section("2. Legislation Search", lawOutput));
      lines.push(section("3. Case-Law Search", caseOutput));
    } else {
      lines.push(section("2. Legislation Search", "Skipped because include_live_sources=false."));
      lines.push(section("3. Case-Law Search", "Skipped because include_live_sources=false."));
    }

    if (input.include_quality_gate && input.primary_law) {
      const qualityOutput = await qualityGate({
        law: input.primary_law,
        analysis_text: combinedForQuality,
        strict: false,
      });
      lines.push(section("4. Quality Gate", qualityOutput));
    } else {
      lines.push(section("4. Quality Gate", "Skipped because primary_law was not provided or include_quality_gate=false."));
    }

    lines.push("## 5. Next-Step Checklist");
    lines.push("");
    lines.push("- Verify decisive statutes with `get_law_section`.");
    lines.push("- Verify cited decisions with `verify_citation` or retrieve them with `get_case_text`.");
    lines.push("- Run `quality_gate` in strict mode before relying on the report externally.");
    lines.push("- Treat this report as research support, not final legal advice.");

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] chain_full_research fehlgeschlagen: ${message}`;
  }
}
