import { searchConceptMap } from "./concept-map.js";

export interface QueryExpansion {
  originalQuery: string;
  expandedQuery: string;
  terms: string[];
  reasons: string[];
  wasExpanded: boolean;
}

interface ExpansionRule {
  patterns: string[];
  terms: string[];
  reason: string;
}

const COLLOQUIAL_RULES: ExpansionRule[] = [
  {
    patterns: ["중고차", "차 고장", "자동차 고장", "차 샀", "auto kaputt", "gebrauchtwagen kaputt"],
    terms: ["Gebrauchtwagen", "Sachmangel", "Gewährleistung", "Nacherfüllung", "Rücktritt", "Kaufvertrag", "§ 434 BGB", "§ 437 BGB"],
    reason: "used-car defect colloquial query",
  },
  {
    patterns: ["환불", "반품", "돈 돌려", "kaufpreis zurück", "rückgabe"],
    terms: ["Rücktritt", "Rückgewähr", "Minderung", "Nacherfüllung", "§ 323 BGB", "§ 346 BGB", "§ 441 BGB"],
    reason: "refund or return colloquial query",
  },
  {
    patterns: ["월세", "집주인", "보증금", "곰팡이", "누수", "wohnung schimmel", "miete kürzen"],
    terms: ["Mietvertrag", "Mietminderung", "Mietkaution", "Kündigung", "§ 535 BGB", "§ 536 BGB", "§ 551 BGB"],
    reason: "rental dispute colloquial query",
  },
  {
    patterns: ["해고", "부당해고", "직장 잘림", "회사에서 잘", "kündigung arbeit", "chef kündigt"],
    terms: ["Kündigungsschutz", "Arbeitsvertrag", "Kündigungsschutzklage", "außerordentliche Kündigung", "§ 1 KSchG", "§ 4 KSchG", "§ 626 BGB"],
    reason: "employment termination colloquial query",
  },
  {
    patterns: ["개인정보", "데이터 삭제", "정보 유출", "데이터 유출", "datenleck", "daten löschen"],
    terms: ["DSGVO", "personenbezogene Daten", "Auskunftsrecht", "Löschung", "Datenpanne", "Art. 15 DSGVO", "Art. 17 DSGVO", "Art. 33 DSGVO"],
    reason: "data protection colloquial query",
  },
  {
    patterns: ["돈 못 받", "대금 미지급", "연체", "월급 못 받", "nicht gezahlt", "zahlung offen"],
    terms: ["Verzug", "Mahnung", "Schadensersatz", "Zahlungspflicht", "§ 286 BGB", "§ 288 BGB", "§ 280 BGB"],
    reason: "payment delay colloquial query",
  },
];

export function expandLegalQuery(query: string): QueryExpansion {
  const normalized = normalize(query);
  const terms: string[] = [];
  const reasons: string[] = [];

  for (const rule of COLLOQUIAL_RULES) {
    if (rule.patterns.some((pattern) => normalized.includes(normalize(pattern)))) {
      terms.push(...rule.terms);
      reasons.push(rule.reason);
    }
  }

  const conceptMatches = searchConceptMap(query);
  for (const match of conceptMatches.slice(0, 3)) {
    terms.push(match.matchedKeyword, match.entry.description, match.entry.norm);
    reasons.push(`concept map: ${match.entry.norm}`);
  }

  const uniqueTerms = uniqueMeaningfulTerms(terms, query);
  const expandedQuery = uniqueTerms.length > 0
    ? `${query} ${uniqueTerms.join(" ")}`
    : query;

  return {
    originalQuery: query,
    expandedQuery,
    terms: uniqueTerms,
    reasons: [...new Set(reasons)],
    wasExpanded: expandedQuery !== query,
  };
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function uniqueMeaningfulTerms(terms: string[], originalQuery: string): string[] {
  const normalizedOriginal = normalize(originalQuery);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const term of terms) {
    const cleaned = term.replace(/\s+/g, " ").trim();
    const key = normalize(cleaned);
    if (!cleaned || seen.has(key) || normalizedOriginal.includes(key)) {
      continue;
    }
    seen.add(key);
    result.push(cleaned);
  }

  return result.slice(0, 16);
}
