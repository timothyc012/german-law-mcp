/**
 * review_contract — contract classifier + dispatcher.
 *
 * Active specialist execution is intentionally limited to rulebooks that are
 * implemented and tested. Planned routes are disclosed without pretending that
 * their specialist review tools exist yet.
 */

import { z } from "zod";
import {
  CONTRACT_ROUTES,
  activeContractRoutes,
  classifyContract,
  routeForContractType,
} from "../lib/contract-registry.js";
import type { ContractType } from "../lib/rulebooks/types.js";
import { reviewContractClauses } from "./review-contract-clauses.js";
import { reviewDpa } from "./review-dpa.js";
import { reviewEmployment } from "./review-employment.js";
import { reviewEula } from "./review-eula.js";
import { reviewGeneral } from "./review-general.js";
import { reviewLease } from "./review-lease.js";
import { reviewLicense } from "./review-license.js";
import { reviewMa } from "./review-ma.js";
import { reviewNda } from "./review-nda.js";
import { reviewServices } from "./review-services.js";

const contractTypeValues = ["NDA", "DPA", "Service", "License", "Employment", "Lease", "EULA", "MA", "General"] as const;

export const reviewContractSchema = z.object({
  text: z.string().min(20).max(120_000).describe("Vertragstext oder repräsentativer Auszug"),
  contract_type: z
    .enum(["auto", ...contractTypeValues])
    .default("auto")
    .describe("Optionaler Vertragstyp. auto klassifiziert den Text und dispatcht danach."),
  role: z
    .enum(["disclosing", "receiving", "mutual"])
    .default("receiving")
    .describe("Mandantenrolle für NDA-Reviews; andere Vertragstypen nutzen dies nur als Kontext."),
  jurisdictions: z
    .array(z.enum(["DE", "EU", "KR"]))
    .default(["DE", "EU", "KR"])
    .describe("Welche Rechtsordnungen im Review-Pfad berücksichtigt werden sollen"),
  language: z.enum(["de", "ko", "both"]).default("both").describe("Ausgabesprache"),
  german_agb_context: z
    .enum(["b2c", "b2b", "unknown"])
    .default("unknown")
    .describe("Kontext für den optionalen German AGB fallback"),
  include_fallback: z
    .boolean()
    .default(true)
    .describe("Bei planned/General-Routen eine verfügbare begrenzte Fallback-Prüfung ausgeben."),
});

export type ReviewContractInput = z.input<typeof reviewContractSchema>;

function declaredType(value: z.output<typeof reviewContractSchema>["contract_type"]): ContractType | undefined {
  return value === "auto" ? undefined : value;
}

function renderRouteTable(): string[] {
  const lines = ["── Contract Review Route Registry ──"];
  lines.push(`Active: ${activeContractRoutes().map((route) => `${route.contractType} → ${route.toolName}`).join(", ")}`);
  return lines;
}

function renderPlannedRoute(route: ReturnType<typeof routeForContractType>, input: z.output<typeof reviewContractSchema>): string[] {
  const lines: string[] = [];
  lines.push("── Route Status ──");
  lines.push(`Detected route: ${route.contractType} → ${route.toolName}`);
  lines.push(`Status: ${route.status.toUpperCase()} (${route.phase})`);
  lines.push(`Focus: ${route.focus}`);
  lines.push(`Available fallback: ${route.fallback}`);
  lines.push("");
  lines.push("Specialist MCP tool is not active yet. I am not running a pretend specialist rulebook.");

  if (input.include_fallback && route.fallback.includes("review_contract_clauses")) {
    lines.push("");
    lines.push("── Limited Fallback: German AGB quick screen ──");
  }
  return lines;
}

async function executeActiveRoute(
  contractType: ContractType,
  input: z.output<typeof reviewContractSchema>,
): Promise<string> {
  const reviewInput = {
    text: input.text,
    role: input.role,
    jurisdictions: input.jurisdictions,
    language: input.language,
  };

  switch (contractType) {
    case "NDA":
      return reviewNda(reviewInput);
    case "DPA":
      return reviewDpa(reviewInput);
    case "Service":
      return reviewServices(reviewInput);
    case "License":
      return reviewLicense(reviewInput);
    case "EULA":
      return reviewEula(reviewInput);
    case "Employment":
      return reviewEmployment(reviewInput);
    case "Lease":
      return reviewLease(reviewInput);
    case "MA":
      return reviewMa(reviewInput);
    case "General":
      return reviewGeneral(reviewInput);
  }
}

export async function reviewContract(rawInput: ReviewContractInput): Promise<string> {
  try {
    const input = reviewContractSchema.parse(rawInput);
    const classification = classifyContract(input.text, declaredType(input.contract_type));
    const route = routeForContractType(classification.contractType);

    const lines: string[] = [
      `[Contract Review Dispatcher | ${new Date().toISOString().slice(0, 10)}]`,
      `Detected contract type: ${classification.contractType}`,
      `Classifier confidence: ${classification.confidence}`,
      `Matched signals: ${classification.matchedSignals.length > 0 ? classification.matchedSignals.join(", ") : "none"}`,
      `Route: ${route.toolName} (${route.status})`,
      "",
      ...renderRouteTable(),
      "",
    ];

    if (route.status === "active") {
      lines.push(`── Active Specialist Execution: ${route.toolName} ──`);
      lines.push("");
      lines.push(await executeActiveRoute(route.contractType, input));
      return lines.join("\n");
    }

    lines.push(...renderPlannedRoute(route, input));

    if (input.include_fallback && (route.contractType === "General" || route.fallback.includes("review_contract_clauses"))) {
      lines.push(
        await reviewContractClauses({
          text: input.text,
          context: input.german_agb_context,
          language: input.language,
          includeSuggestions: true,
        }),
      );
    }

    lines.push("");
    lines.push("── Dispatcher-Payload (JSON) ──");
    lines.push("```json");
    lines.push(
      JSON.stringify(
        {
          classification,
          selectedRoute: route,
          activeRoutes: activeContractRoutes().map((activeRoute) => activeRoute.toolName),
          plannedRoutes: CONTRACT_ROUTES.filter((registeredRoute) => registeredRoute.status === "planned").map((plannedRoute) => plannedRoute.toolName),
          allRoutes: CONTRACT_ROUTES.map((registeredRoute) => ({
            contractType: registeredRoute.contractType,
            toolName: registeredRoute.toolName,
            status: registeredRoute.status,
            phase: registeredRoute.phase,
          })),
        },
        null,
        2,
      ),
    );
    lines.push("```");
    lines.push("");
    lines.push(
      "Hinweis: review_contract ist ein Dispatcher. Nur active specialist routes werden ausgeführt; planned routes werden offengelegt und müssen vor Aktivierung eigene Rulebooks, Smoke Tests und Dokumentation erhalten.",
    );

    return lines.join("\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `[오류] Contract Review Dispatcher fehlgeschlagen: ${msg}`;
  }
}
