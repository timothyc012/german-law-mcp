import type { ContractType } from "./rulebooks/types.js";

export type ContractRouteStatus = "active" | "planned";

export interface ContractRoute {
  contractType: ContractType;
  toolName: string;
  status: ContractRouteStatus;
  phase: string;
  focus: string;
  fallback: string;
}

export interface ContractClassification {
  contractType: ContractType;
  confidence: "high" | "medium" | "low";
  matchedSignals: string[];
}

export const CONTRACT_ROUTES: readonly ContractRoute[] = [
  {
    contractType: "NDA",
    toolName: "review_nda",
    status: "active",
    phase: "MVP",
    focus: "DE/EU/KR confidentiality, trade secrets, GDPR transfer triggers, governing law, remedies",
    fallback: "review_contract_clauses for German AGB risk screening",
  },
  {
    contractType: "DPA",
    toolName: "review_dpa",
    status: "active",
    phase: "Phase 2",
    focus: "GDPR Art. 28 processor terms, PIPA outsourcing, SCC/transfer issue spotting",
    fallback: "gdpr-expert workspace plus German AGB quick screen",
  },
  {
    contractType: "Service",
    toolName: "review_services",
    status: "active",
    phase: "Phase 3",
    focus: "BGB service/work-contract boundary, scope, acceptance, warranty, KR civil-law mandate/work rules",
    fallback: "review_contract_clauses for German AGB risk screening",
  },
  {
    contractType: "License",
    toolName: "review_license",
    status: "active",
    phase: "Phase 4",
    focus: "UrhG/MarkenG licensing scope, sublicensing, SaaS/IP restrictions, Korean copyright issues",
    fallback: "review_contract_clauses for German AGB risk screening",
  },
  {
    contractType: "EULA",
    toolName: "review_eula",
    status: "active",
    phase: "Phase 4",
    focus: "software-use restrictions, warranty disclaimers, AGB control, copyright and consumer terms",
    fallback: "review_contract_clauses for German AGB risk screening",
  },
  {
    contractType: "Employment",
    toolName: "review_employment",
    status: "active",
    phase: "Phase 5",
    focus: "KSchG, BUrlG, working time, non-compete, Korean labor standards",
    fallback: "risk_alert for deadlines plus review_contract_clauses for AGB-like clauses",
  },
  {
    contractType: "Lease",
    toolName: "review_lease",
    status: "active",
    phase: "Phase 5",
    focus: "BGB lease rules, deposits, terminations, repairs, Korean housing lease protection",
    fallback: "risk_alert for deadlines plus review_contract_clauses for AGB-like clauses",
  },
  {
    contractType: "MA",
    toolName: "review_ma",
    status: "active",
    phase: "Phase 6",
    focus: "corporate/M&A structure, conditions precedent, liability, disclosure schedules, merger rules",
    fallback: "chain_full_research for targeted issue research",
  },
  {
    contractType: "General",
    toolName: "review_general",
    status: "active",
    phase: "Phase 6 fallback",
    focus: "catch-all fallback for contracts not covered by a specialist rulebook",
    fallback: "review_contract_clauses for German AGB risk screening",
  },
] as const;

export function routeForContractType(contractType: ContractType): ContractRoute {
  return CONTRACT_ROUTES.find((route) => route.contractType === contractType) ?? CONTRACT_ROUTES[CONTRACT_ROUTES.length - 1]!;
}

const SIGNALS: Array<{ contractType: ContractType; label: string; pattern: RegExp; weight: number }> = [
  { contractType: "NDA", label: "nda/confidentiality", pattern: /\b(non[-\s]?disclosure|nda|confidential(?:ity)? agreement|geheimhaltungsvereinbarung|비밀유지|기밀유지)\b/i, weight: 5 },
  { contractType: "DPA", label: "dpa/processor", pattern: /\b(data processing agreement|dpa|processor|controller|auftragsverarbeitung|avv|art\.?\s*28\s*gdpr|dsgvo|개인정보 처리위탁|수탁자)\b/i, weight: 5 },
  { contractType: "Service", label: "service/work contract", pattern: /\b(statement of work|sow|services agreement|dienstleistungsvertrag|werkvertrag|auftragnehmer|service level|sla|용역|도급|위임)\b/i, weight: 4 },
  { contractType: "License", label: "license/ip", pattern: /\b(license agreement|licence agreement|lizenzvertrag|sublicen[cs]e|royalt(?:y|ies)|trademark license|markenlizenz|저작권 라이선스|상표 라이선스)\b/i, weight: 4 },
  { contractType: "EULA", label: "eula/software use", pattern: /\b(end user license|eula|software license|clickwrap|shrinkwrap|acceptable use|software usage|소프트웨어 사용권|최종사용자)\b/i, weight: 4 },
  { contractType: "Employment", label: "employment", pattern: /\b(employment agreement|arbeitsvertrag|employee|employer|probation|termination notice|non-compete|근로계약|근로자|사용자|해고|휴가)\b/i, weight: 4 },
  { contractType: "Lease", label: "lease/rent", pattern: /\b(lease agreement|rental agreement|mietvertrag|vermieter|mieter|security deposit|kaution|임대차|임대인|임차인|보증금)\b/i, weight: 4 },
  { contractType: "MA", label: "m&a/corporate transaction", pattern: /\b(share purchase agreement|asset purchase agreement|merger agreement|spa\b|apa\b|m&a|due diligence|closing condition|representations and warranties|인수합병|주식양수도|영업양수도)\b/i, weight: 4 },
];

export function classifyContract(text: string, declaredType?: ContractType): ContractClassification {
  if (declaredType) {
    return {
      contractType: declaredType,
      confidence: "high",
      matchedSignals: [`declared:${declaredType}`],
    };
  }

  const scores = new Map<ContractType, { score: number; signals: string[] }>();
  for (const signal of SIGNALS) {
    if (!signal.pattern.test(text)) continue;
    const current = scores.get(signal.contractType) ?? { score: 0, signals: [] };
    current.score += signal.weight;
    current.signals.push(signal.label);
    scores.set(signal.contractType, current);
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1].score - a[1].score);
  const [winner, details] = ranked[0] ?? [];
  if (!winner || !details) {
    return {
      contractType: "General",
      confidence: "low",
      matchedSignals: [],
    };
  }

  const runnerUp = ranked[1]?.[1].score ?? 0;
  const confidence = details.score >= 5 && details.score - runnerUp >= 2 ? "high" : "medium";
  return {
    contractType: winner,
    confidence,
    matchedSignals: details.signals,
  };
}

export function activeContractRoutes(): ContractRoute[] {
  return CONTRACT_ROUTES.filter((route) => route.status === "active");
}

export function plannedContractRoutes(): ContractRoute[] {
  return CONTRACT_ROUTES.filter((route) => route.status === "planned");
}
