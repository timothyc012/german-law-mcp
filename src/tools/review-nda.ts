/**
 * review_nda — NDA screening across DE / EU / KR rulebooks.
 *
 * MVP scope (architect-approved):
 *   - 11 standard NDA items × 3 jurisdictions
 *   - Receiving-side asymmetry weighting only (disclosing/mutual = v2)
 *   - Cross-border trigger detection emitted as JSON block for dispatcher consumption
 *   - Cross-examination across lanes lives in the tri-council skill, not here
 */

import { z } from "zod";
import { NDA_RULEBOOK } from "../lib/rulebooks/nda.js";
import {
  type ChecklistItem,
  type CrossBorderTriggers,
  type Jurisdiction,
  type JurisdictionRule,
  type Role,
  compilePattern,
  effectiveTrigger,
  emptyTriggers,
} from "../lib/rulebooks/types.js";

export const reviewNdaSchema = z.object({
  text: z.string().min(20).describe("NDA-Volltext zur Prüfung"),
  role: z
    .enum(["disclosing", "receiving", "mutual"])
    .default("receiving")
    .describe("Vertragsrolle des Mandanten (MVP: receiving-bias)"),
  jurisdictions: z
    .array(z.enum(["DE", "EU", "KR"]))
    .default(["DE", "EU", "KR"])
    .describe("Welche Rechtsordnungen geprüft werden sollen"),
  language: z.enum(["de", "ko", "both"]).default("both").describe("Ausgabesprache"),
});

export type ReviewNdaInput = z.input<typeof reviewNdaSchema>;
type ResolvedInput = z.output<typeof reviewNdaSchema>;

interface Finding {
  itemId: string;
  itemTitleKo: string;
  itemTitleDe: string;
  jurisdiction: Jurisdiction;
  rule: JurisdictionRule;
  status: "present" | "absent";
  clauseExcerpt?: string;
  weight: number;
}

const FOREIGN_LAW_PATTERNS = [
  /law\s+of\s+(?:the\s+state\s+of\s+)?(new\s+york|california|delaware|texas|nevada)/i,
  /\bunder\s+(?:english|welsh|swiss|singapore|hong\s*kong|japanese|chinese|us|united\s+states)\s+law\b/i,
  /recht\s+(?:der|des)\s+(?:staates?\s+)?(usa|schweiz|england|japan|china|singapur|hongkong|delaware|new\s*york|california|texas)/i,
  /(영국|미국|일본|중국|싱가포르|홍콩|스위스|델라웨어|뉴욕|캘리포니아)\s*법/,
];

const FOREIGN_SEAT_PATTERNS = [
  /seat\s+of\s+arbitration\s+(?:shall\s+be\s+|is\s+)?(london|new\s+york|singapore|hong\s*kong|geneva|paris|stockholm|zurich)/i,
  /schiedsort\s+(?:ist\s+|liegt\s+in\s+)?(london|new\s+york|singapore|singapur|hongkong|hong\s*kong|genf|geneva|paris|stockholm|zürich|zurich)/i,
  /중재지[는은]?\s*(런던|뉴욕|싱가포르|홍콩|제네바|파리|스톡홀름|취리히)/,
];

const PRIMARY_LAW_HINTS: Array<{ pattern: RegExp; jur: Jurisdiction }> = [
  { pattern: /deutsches\s+recht|german\s+law|recht\s+der\s+bundesrepublik|bgb\b/i, jur: "DE" },
  { pattern: /\beu\s+law|union(s)?recht|gdpr|dsgvo|rome\s+i|verordnung\s+\(eu\)/i, jur: "EU" },
  { pattern: /korean\s+law|recht\s+der\s+republik\s+korea|대한민국\s*법|한국\s*법|민법|상법/i, jur: "KR" },
];

const PARTY_HINTS: Array<{ pattern: RegExp; jur: Jurisdiction }> = [
  { pattern: /\b(gmbh|ag|kg|ohg|ug)\b/i, jur: "DE" },
  { pattern: /\b(s\.?a\.?|s\.?r\.?l\.?|b\.?v\.?|n\.?v\.?|société|gesellschaft|spa|sas)\b/i, jur: "EU" },
  { pattern: /(주식회사|유한회사|합명회사|합자회사|\bco\.,\s*ltd\b)/i, jur: "KR" },
];

function splitClauses(text: string): string[] {
  return text
    .split(/\n{2,}|(?:^|\n)\s*(?:\d+\.|§\s*\d+|[a-z]\)|제\s*\d+\s*조)\s+/)
    .map((c) => c.replace(/\s+/g, " ").trim())
    .filter((c) => c.length > 0);
}

function detectPresence(item: ChecklistItem, clauses: string[]): { present: boolean; excerpt?: string } {
  const pattern = compilePattern(item);
  if (!pattern) {
    return { present: false };
  }
  for (const clause of clauses) {
    if (pattern.test(clause)) {
      const excerpt = clause.length > 220 ? `${clause.slice(0, 220)}...` : clause;
      return { present: true, excerpt };
    }
  }
  return { present: false };
}

function asymmetryWeight(item: ChecklistItem, role: Role): number {
  const a = item.asymmetry?.[role];
  return a?.weight ?? 0;
}

function detectCrossBorder(text: string, items: ChecklistItem[], clauses: string[]): CrossBorderTriggers {
  const triggers = emptyTriggers();

  const foreignLawHit = FOREIGN_LAW_PATTERNS.some((p) => p.test(text));
  if (foreignLawHit) triggers.foreignGoverningLaw = true;

  const foreignSeatHit = FOREIGN_SEAT_PATTERNS.some((p) => p.test(text));
  if (foreignSeatHit) triggers.foreignSeatArbitration = true;

  const dataItem = items.find((i) => i.id === "data_protection");
  if (dataItem) {
    const { present } = detectPresence(dataItem, clauses);
    triggers.gdprDataTransfer = present;
  }

  const partyJurs = new Set<Jurisdiction>();
  for (const hint of PARTY_HINTS) {
    if (hint.pattern.test(text)) partyJurs.add(hint.jur);
  }
  triggers.multiJurisdictionParties = partyJurs.size >= 2;

  const lawHits = PRIMARY_LAW_HINTS.filter((h) => h.pattern.test(text));
  if (lawHits.length === 1) {
    triggers.primaryLawCandidate = lawHits[0]!.jur;
  } else if (foreignLawHit && lawHits.length === 0) {
    triggers.primaryLawCandidate = null;
  }

  return triggers;
}

function renderFinding(f: Finding, lang: ResolvedInput["language"]): string[] {
  const lines: string[] = [];
  const flag = f.status === "absent" ? "MISSING" : "PRESENT";
  const weightTag = f.weight > 0 ? ` [+${f.weight} for receiving]` : f.weight < 0 ? ` [${f.weight} for receiving]` : "";
  lines.push(`- [${f.rule.level.toUpperCase()} | ${f.jurisdiction} | ${flag}]${weightTag} ${f.rule.norm}`);

  if (lang === "de" || lang === "both") {
    if (f.rule.reason.de) lines.push(`  Grund: ${f.rule.reason.de}`);
    if (f.rule.suggestion.de) lines.push(`  Richtung: ${f.rule.suggestion.de}`);
  }
  if (lang === "ko" || lang === "both") {
    lines.push(`  이유: ${f.rule.reason.ko}`);
    lines.push(`  방향: ${f.rule.suggestion.ko}`);
  }
  if (f.clauseExcerpt) {
    lines.push(`  발췌: "${f.clauseExcerpt}"`);
  }
  if (f.rule.citationAnchor) {
    lines.push(`  Anchor: ${f.rule.citationAnchor} (verify_citation 권장)`);
  }
  return lines;
}

export async function reviewNda(rawInput: ReviewNdaInput): Promise<string> {
  try {
    const input = reviewNdaSchema.parse(rawInput);
    const clauses = splitClauses(input.text);
    const findings: Finding[] = [];

    for (const item of NDA_RULEBOOK.items) {
      const { present, excerpt } = detectPresence(item, clauses);
      const status = present ? "present" : "absent";

      for (const jur of input.jurisdictions) {
        const rules = item.rules[jur];
        if (!rules) continue;
        for (const rule of rules) {
          const trig = effectiveTrigger(rule);
          let fires = false;
          if (trig === "present" && status === "present") fires = true;
          if (trig === "absent" && status === "absent") fires = true;
          if (typeof trig === "object" && trig.roles.includes(input.role)) fires = true;
          if (!fires) continue;
          findings.push({
            itemId: item.id,
            itemTitleKo: item.titleKo,
            itemTitleDe: item.titleDe,
            jurisdiction: jur,
            rule,
            status,
            clauseExcerpt: excerpt,
            weight: asymmetryWeight(item, input.role),
          });
        }
      }
    }

    const levelRank = { hoch: 3, mittel: 2, niedrig: 1 } as const;
    findings.sort((a, b) => {
      const lr = levelRank[b.rule.level] - levelRank[a.rule.level];
      if (lr !== 0) return lr;
      return b.weight - a.weight;
    });

    const crossBorder = detectCrossBorder(input.text, NDA_RULEBOOK.items, clauses);

    const high = findings.filter((f) => f.rule.level === "hoch").length;
    const medium = findings.filter((f) => f.rule.level === "mittel").length;
    const low = findings.filter((f) => f.rule.level === "niedrig").length;
    const overall = high > 0 ? "HOCH" : medium > 0 ? "MITTEL" : low > 0 ? "NIEDRIG" : "—";

    const lines: string[] = [];
    lines.push(`[NDA-Review — Rulebook v${NDA_RULEBOOK.version} | ${new Date().toISOString().slice(0, 10)}]`);
    lines.push(`Rolle: ${input.role} | Jurisdiktionen: ${input.jurisdictions.join(", ")}`);
    lines.push(`Gesamtampel: ${overall} (${high} hoch, ${medium} mittel, ${low} niedrig)`);
    lines.push("");

    const presentCount = NDA_RULEBOOK.items.filter((it) => detectPresence(it, clauses).present).length;
    lines.push(`Checkliste: ${presentCount}/${NDA_RULEBOOK.items.length} Punkte erkannt`);
    lines.push("");

    const byItem = new Map<string, Finding[]>();
    for (const f of findings) {
      const arr = byItem.get(f.itemId) ?? [];
      arr.push(f);
      byItem.set(f.itemId, arr);
    }

    if (findings.length === 0) {
      lines.push("Keine kritischen Befunde — aber bitte vollständige juristische Prüfung nicht ersetzen.");
    } else {
      for (const item of NDA_RULEBOOK.items) {
        const fs = byItem.get(item.id);
        if (!fs || fs.length === 0) continue;
        lines.push(`── ${item.titleKo} / ${item.titleDe} ──`);
        for (const f of fs) {
          lines.push(...renderFinding(f, input.language));
          lines.push("");
        }
      }
    }

    const triggerEntries = Object.entries(crossBorder).filter(([, v]) => v === true || (typeof v === "string"));
    lines.push("── Cross-Border Trigger ──");
    if (triggerEntries.length === 0) {
      lines.push("Keine Cross-Border-Trigger erkannt — Single-jurisdiction Pfad ausreichend.");
    } else {
      for (const [k, v] of triggerEntries) {
        lines.push(`  ${k}: ${v}`);
      }
      lines.push("→ tri-council Skill kann ausgelöst werden (foreignGoverningLaw / gdprDataTransfer / multiJurisdictionParties / foreignSeatArbitration).");
    }
    lines.push("");

    lines.push("── Dispatcher-Payload (JSON) ──");
    lines.push("```json");
    lines.push(
      JSON.stringify(
        {
          rulebookVersion: NDA_RULEBOOK.version,
          role: input.role,
          jurisdictions: input.jurisdictions,
          summary: { high, medium, low, overall },
          checklistCoverage: { present: presentCount, total: NDA_RULEBOOK.items.length },
          crossBorderTriggers: crossBorder,
          findings: findings.map((f) => ({
            itemId: f.itemId,
            jurisdiction: f.jurisdiction,
            norm: f.rule.norm,
            level: f.rule.level,
            status: f.status,
            weight: f.weight,
            citationAnchor: f.rule.citationAnchor ?? null,
          })),
        },
        null,
        2,
      ),
    );
    lines.push("```");
    lines.push("");
    lines.push(
      "Hinweis: Dieses Tool ist eine NDA-Triage über drei Rechtsordnungen. Endgültige Wirksamkeit erfordert konkrete Vertragsumstände, individualvertragliche Abreden und aktuelle Rechtsprechung.",
    );

    return lines.join("\n");
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return `[오류] NDA-Review fehlgeschlagen: ${msg}`;
  }
}
