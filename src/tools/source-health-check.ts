/**
 * source_health_check — external source availability summary.
 *
 * Checks the legal data sources this MCP server depends on. The tool is a
 * diagnostic aid for LLMs and maintainers, not a legal data source itself.
 */

import { z } from "zod";
import { fetchWithRetry } from "../lib/http-client.js";

export const sourceHealthCheckSchema = z.object({
  live: z.boolean().optional().default(true).describe("Whether to perform live HTTP checks. false returns configured source metadata only."),
  timeoutMs: z.number().int().min(1000).max(15000).optional().default(5000).describe("Per-source timeout for live checks."),
});

export type SourceHealthCheckInput = z.input<typeof sourceHealthCheckSchema>;

interface SourceTarget {
  id: string;
  label: string;
  url: string;
  role: string;
}

const SOURCES: SourceTarget[] = [
  {
    id: "neuris",
    label: "NeuRIS",
    url: "https://testphase.rechtsinformationen.bund.de/v1/case-law/courts",
    role: "Federal case-law and legislation search API",
  },
  {
    id: "gii",
    label: "Gesetze im Internet",
    url: "https://www.gesetze-im-internet.de/bgb/__433.html",
    role: "Federal statute text",
  },
  {
    id: "eurlex",
    label: "EUR-Lex CELLAR",
    url: "https://publications.europa.eu/webapi/rdf/sparql",
    role: "EU law metadata endpoint",
  },
  {
    id: "bayern",
    label: "gesetze-bayern.de",
    url: "https://www.gesetze-bayern.de/Content/Document/BayBO-1",
    role: "Bayern state-law text",
  },
  {
    id: "openjur",
    label: "openjur.de",
    url: "https://openjur.de",
    role: "State-court case-law fallback",
  },
];

export async function sourceHealthCheck(input: SourceHealthCheckInput): Promise<string> {
  try {
    const { live, timeoutMs } = sourceHealthCheckSchema.parse(input);
    const lines: string[] = [
      `[Source Health Check] ${new Date().toISOString()}`,
      `Mode: ${live ? "live HTTP checks" : "configured metadata only"}`,
      "",
    ];

    const results = live
      ? await Promise.all(SOURCES.map((source) => checkSource(source, timeoutMs)))
      : SOURCES.map((source) => ({ source, status: "SKIPPED", detail: "live=false" }));

    for (const result of results) {
      lines.push(`- ${result.source.label} (${result.source.id}): ${result.status}`);
      lines.push(`  Role: ${result.source.role}`);
      lines.push(`  URL: ${result.source.url}`);
      lines.push(`  Detail: ${result.detail}`);
    }

    const failures = results.filter((result) => result.status === "DOWN").length;
    const degraded = results.filter((result) => result.status === "DEGRADED").length;
    lines.push("");
    lines.push(`Summary: ${failures === 0 && degraded === 0 ? "OK" : failures > 0 ? "ATTENTION" : "DEGRADED"} (${failures} down, ${degraded} degraded)`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] Source health check failed: ${message}`;
  }
}

async function checkSource(source: SourceTarget, timeoutMs: number): Promise<{
  source: SourceTarget;
  status: "OK" | "DEGRADED" | "DOWN";
  detail: string;
}> {
  const startedAt = Date.now();

  try {
    const response = await fetchWithRetry(
      source.url,
      { headers: { Accept: "text/html,application/json;q=0.9,*/*;q=0.8" } },
      { timeoutMs, retries: 0, source: source.label },
    );
    const elapsed = Date.now() - startedAt;

    if (response.ok) {
      return { source, status: "OK", detail: `HTTP ${response.status} in ${elapsed}ms` };
    }
    if (response.status >= 400 && response.status < 500) {
      return { source, status: "DEGRADED", detail: `HTTP ${response.status} in ${elapsed}ms` };
    }
    return { source, status: "DOWN", detail: `HTTP ${response.status} in ${elapsed}ms` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { source, status: "DOWN", detail: message };
  }
}
