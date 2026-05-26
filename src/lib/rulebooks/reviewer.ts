import {
  type ChecklistItem,
  type ContractRulebook,
  type Jurisdiction,
  type JurisdictionRule,
  type RiskLevel,
  type Role,
  compilePattern,
  effectiveTrigger,
} from "./types.js";

export interface GenericContractReviewInput {
  text: string;
  role: Role;
  jurisdictions: Jurisdiction[];
  language: "de" | "ko" | "both";
}

interface Finding {
  item: ChecklistItem;
  jurisdiction: Jurisdiction;
  rule: JurisdictionRule;
  status: "present" | "absent";
  clauseExcerpt?: string;
  weight: number;
}

function splitClauses(text: string): string[] {
  return text
    .split(/\n{2,}|(?:^|\n)\s*(?:\d+\.|§\s*\d+|[a-z]\)|제\s*\d+\s*조)\s+/)
    .map((clause) => clause.replace(/\s+/g, " ").trim())
    .filter((clause) => clause.length > 0);
}

function detectPresence(item: ChecklistItem, clauses: string[]): { present: boolean; excerpt?: string } {
  const pattern = compilePattern(item);
  if (!pattern) {
    return { present: false };
  }

  for (const clause of clauses) {
    if (pattern.test(clause)) {
      return {
        present: true,
        excerpt: clause.length > 220 ? `${clause.slice(0, 220)}...` : clause,
      };
    }
  }

  return { present: false };
}

function asymmetryWeight(item: ChecklistItem, role: Role): number {
  return item.asymmetry?.[role]?.weight ?? 0;
}

function levelRank(level: RiskLevel): number {
  return level === "hoch" ? 3 : level === "mittel" ? 2 : 1;
}

function renderFinding(finding: Finding, language: GenericContractReviewInput["language"]): string[] {
  const lines: string[] = [];
  const flag = finding.status === "absent" ? "MISSING" : "PRESENT";
  const weightTag = finding.weight > 0 ? ` [+${finding.weight}]` : finding.weight < 0 ? ` [${finding.weight}]` : "";
  lines.push(`- [${finding.rule.level.toUpperCase()} | ${finding.jurisdiction} | ${flag}]${weightTag} ${finding.rule.norm}`);

  if (language === "de" || language === "both") {
    if (finding.rule.reason.de) lines.push(`  Grund: ${finding.rule.reason.de}`);
    if (finding.rule.suggestion.de) lines.push(`  Richtung: ${finding.rule.suggestion.de}`);
  }
  if (language === "ko" || language === "both") {
    lines.push(`  이유: ${finding.rule.reason.ko}`);
    lines.push(`  방향: ${finding.rule.suggestion.ko}`);
  }
  if (finding.clauseExcerpt) {
    lines.push(`  발췌: "${finding.clauseExcerpt}"`);
  }
  if (finding.rule.citationAnchor) {
    lines.push(`  Anchor: ${finding.rule.citationAnchor} (verify_citation / source check 권장)`);
  }

  return lines;
}

export async function reviewRulebook(
  rulebook: ContractRulebook,
  input: GenericContractReviewInput,
): Promise<string> {
  const clauses = splitClauses(input.text);
  const findings: Finding[] = [];

  for (const item of rulebook.items) {
    const { present, excerpt } = detectPresence(item, clauses);
    const status = present ? "present" : "absent";

    for (const jurisdiction of input.jurisdictions) {
      const rules = item.rules[jurisdiction];
      if (!rules) continue;

      for (const rule of rules) {
        const trigger = effectiveTrigger(rule);
        let fires = false;
        if (trigger === "present" && status === "present") fires = true;
        if (trigger === "absent" && status === "absent") fires = true;
        if (typeof trigger === "object" && trigger.roles.includes(input.role)) fires = true;
        if (!fires) continue;

        findings.push({
          item,
          jurisdiction,
          rule,
          status,
          clauseExcerpt: excerpt,
          weight: asymmetryWeight(item, input.role),
        });
      }
    }
  }

  findings.sort((a, b) => {
    const level = levelRank(b.rule.level) - levelRank(a.rule.level);
    if (level !== 0) return level;
    return b.weight - a.weight;
  });

  const high = findings.filter((finding) => finding.rule.level === "hoch").length;
  const medium = findings.filter((finding) => finding.rule.level === "mittel").length;
  const low = findings.filter((finding) => finding.rule.level === "niedrig").length;
  const overall = high > 0 ? "HOCH" : medium > 0 ? "MITTEL" : low > 0 ? "NIEDRIG" : "—";
  const presentCount = rulebook.items.filter((item) => detectPresence(item, clauses).present).length;

  const lines: string[] = [];
  lines.push(`[${rulebook.contractType}-Review — Rulebook v${rulebook.version} | ${new Date().toISOString().slice(0, 10)}]`);
  lines.push(`Rolle: ${input.role} | Jurisdiktionen: ${input.jurisdictions.join(", ")}`);
  lines.push(`Gesamtampel: ${overall} (${high} hoch, ${medium} mittel, ${low} niedrig)`);
  lines.push(`Checkliste: ${presentCount}/${rulebook.items.length} Punkte erkannt`);
  lines.push("");

  const byItem = new Map<string, Finding[]>();
  for (const finding of findings) {
    const current = byItem.get(finding.item.id) ?? [];
    current.push(finding);
    byItem.set(finding.item.id, current);
  }

  if (findings.length === 0) {
    lines.push("Keine hinterlegten Hochrisiko-Muster erkannt. Das ist keine Vollprüfung.");
  } else {
    for (const item of rulebook.items) {
      const itemFindings = byItem.get(item.id);
      if (!itemFindings || itemFindings.length === 0) continue;
      lines.push(`── ${item.titleKo} / ${item.titleDe} ──`);
      for (const finding of itemFindings) {
        lines.push(...renderFinding(finding, input.language));
        lines.push("");
      }
    }
  }

  lines.push("── Dispatcher-Payload (JSON) ──");
  lines.push("```json");
  lines.push(
    JSON.stringify(
      {
        rulebookVersion: rulebook.version,
        contractType: rulebook.contractType,
        role: input.role,
        jurisdictions: input.jurisdictions,
        summary: { high, medium, low, overall },
        checklistCoverage: { present: presentCount, total: rulebook.items.length },
        findings: findings.map((finding) => ({
          itemId: finding.item.id,
          jurisdiction: finding.jurisdiction,
          norm: finding.rule.norm,
          level: finding.rule.level,
          status: finding.status,
          citationAnchor: finding.rule.citationAnchor ?? null,
        })),
      },
      null,
      2,
    ),
  );
  lines.push("```");
  lines.push("");
  lines.push(
    "Hinweis: Dieses Tool ist eine mehrjurisdiktionale Vertrags-Triage. Es ersetzt keine vollständige Prüfung durch qualifizierte Beratung und muss bei echten Entscheidungen mit aktuellen Primärquellen verifiziert werden.",
  );

  return lines.join("\n");
}

