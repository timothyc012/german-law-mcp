/**
 * Generic rulebook schema for contract-type review tools (NDA, DPA, Service, ...).
 *
 * Design constraints (architect):
 * - RegExp is stored as patternStr + patternFlags so the rulebook is JSON-serializable
 *   for future YAML/JSON export. Compile at runtime via compilePattern().
 * - Each ChecklistItem holds N rules per jurisdiction (DE/EU/KR), keyed independently
 *   so new jurisdictions extend the matrix without touching existing items.
 * - triggerWhen lets a rule fire on absence as well as presence (e.g., "no governing-law
 *   clause" is itself a finding).
 */

export type Jurisdiction = "DE" | "EU" | "KR";
export type Role = "disclosing" | "receiving" | "mutual";
export type RiskLevel = "hoch" | "mittel" | "niedrig";
export type ContractType = "NDA" | "DPA" | "Service" | "License" | "Employment" | "Lease" | "EULA" | "MA" | "General";

export interface BilingualText {
  de?: string;
  ko: string;
  en?: string;
}

export type RuleTrigger =
  | "present"
  | "absent"
  | { roles: Role[] };

export interface JurisdictionRule {
  norm: string;
  level: RiskLevel;
  reason: BilingualText;
  suggestion: BilingualText;
  /** Anchor for verify_citation / verify_bmf_citation downstream (norm id, CELEX, 법령일련번호). */
  citationAnchor?: string;
  /** Defaults to "present" if omitted. */
  triggerWhen?: RuleTrigger;
}

export interface ChecklistItem {
  id: string;
  titleKo: string;
  titleDe: string;
  /** RegExp source string. Empty/undefined means the item is LLM-only (no pattern detection). */
  patternStr?: string;
  /** RegExp flags, default "is". */
  patternFlags?: string;
  rules: Partial<Record<Jurisdiction, JurisdictionRule[]>>;
  /** Role-asymmetric weighting. Higher weight = more severe for that role. */
  asymmetry?: Partial<Record<Role, { weight: number; note: BilingualText }>>;
  /** If true, this item's presence/absence feeds a cross-border trigger flag. */
  crossBorderSignal?: keyof CrossBorderTriggers;
}

export interface ContractRulebook {
  contractType: ContractType;
  version: string;
  items: ChecklistItem[];
}

export interface CrossBorderTriggers {
  foreignGoverningLaw: boolean;
  multiJurisdictionParties: boolean;
  gdprDataTransfer: boolean;
  foreignSeatArbitration: boolean;
  primaryLawCandidate: Jurisdiction | null;
}

export function compilePattern(item: ChecklistItem): RegExp | null {
  if (!item.patternStr) return null;
  const flags = item.patternFlags ?? "is";
  return new RegExp(item.patternStr, flags);
}

export function emptyTriggers(): CrossBorderTriggers {
  return {
    foreignGoverningLaw: false,
    multiJurisdictionParties: false,
    gdprDataTransfer: false,
    foreignSeatArbitration: false,
    primaryLawCandidate: null,
  };
}

export function effectiveTrigger(rule: JurisdictionRule): RuleTrigger {
  return rule.triggerWhen ?? "present";
}
