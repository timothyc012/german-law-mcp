/**
 * search_law — 독일 연방법률 키워드 검색
 *
 * NeuRIS API를 1순위로 사용하고, 결과가 없으면 GII 목차에서 약어 매칭을 시도한다.
 * Concept Map은 항상 상단에 표시되어 법률 개념 컨텍스트를 제공한다.
 */

import { z } from "zod";
import { searchLegislation } from "../lib/neuris-client.js";
import { searchTocByAbbreviation } from "../lib/gii-client.js";
import { searchConceptMap } from "../lib/concept-map.js";
import { expandLegalQuery, type QueryExpansion } from "../lib/query-expansion.js";

export const searchLawSchema = z.object({
  query: z.string().describe("검색어 (예: 'Kaufvertrag', 'Mietrecht', 'Datenschutz', 'BGB')"),
  size: z.number().min(1).max(50).optional().default(10).describe("결과 수 (기본 10, 최대 50)"),
  expandQuery: z.boolean().optional().default(true).describe("결과가 없을 때 일상어를 독일어 법률 용어로 확장해 재검색할지 여부."),
});

export type SearchLawInput = z.input<typeof searchLawSchema>;

function buildConceptSection(query: string): string[] {
  const matches = searchConceptMap(query);
  if (matches.length === 0) return [];
  return [
    "━━━ 법률 개념 사전 (Concept Map) ━━━",
    "",
    ...matches.slice(0, 5).map((m, i) =>
      `${i + 1}. ${m.entry.norm} — ${m.entry.description}\n   분야: ${m.entry.category} | 매칭: "${m.matchedKeyword}" (${(m.score * 100).toFixed(0)}%)`
    ),
    "",
  ];
}

function buildExpansionSection(expansion: QueryExpansion, usedForSearch: boolean): string[] {
  if (!expansion.wasExpanded) return [];
  return [
    "━━━ 검색어 확장 (Query Expansion) ━━━",
    "",
    `원문: ${expansion.originalQuery}`,
    `확장 검색어: ${expansion.expandedQuery}`,
    `확장 근거: ${expansion.reasons.join(", ")}`,
    usedForSearch ? "적용: 원문 검색 결과가 없어 확장 검색을 사용했습니다." : "적용: 원문 검색 결과가 있어 확장 검색은 실행하지 않았습니다.",
    "",
  ];
}

export async function searchLaw(input: SearchLawInput): Promise<string> {
  const { query, size, expandQuery } = searchLawSchema.parse(input);

  try {
    // Concept Map은 항상 상단에 표시
    const expansion = expandQuery ? expandLegalQuery(query) : null;
    const conceptSection = buildConceptSection(expansion?.expandedQuery ?? query);

    // 1차: NeuRIS 법령 검색
    let result = await searchLegislation(query, size);
    let searchQuery = query;
    let usedExpansion = false;

    if (result.totalItems === 0 && expansion?.wasExpanded) {
      result = await searchLegislation(expansion.expandedQuery, size);
      searchQuery = expansion.expandedQuery;
      usedExpansion = true;
    }

    if (result.totalItems > 0) {
      const lines: string[] = [
        `[VERIFIED — NeuRIS API] ${new Date().toISOString().slice(0, 10)}`,
        `[법령 검색결과: "${query}" — ${result.totalItems}건]`,
        searchQuery !== query ? `[실제 검색어: "${searchQuery}"]` : "",
        "",
        ...(expansion ? buildExpansionSection(expansion, usedExpansion) : []),
        ...conceptSection,
      ];

      for (let i = 0; i < result.items.length; i++) {
        const item = result.items[i];
        lines.push(`${i + 1}. ${item.name}`);
        if (item.abbreviation) {
          lines.push(`   약어: ${item.abbreviation}${item.status ? ` | 상태: ${item.status === "InForce" ? "현행" : item.status}` : ""}`);
        }
        if (item.eli) {
          lines.push(`   ELI: ${item.eli}`);
        }
        // 텍스트 매칭 (최대 3개)
        for (const match of item.textMatches.slice(0, 3)) {
          if (match.name && match.text) {
            lines.push(`   매칭: ${match.name} — "${truncate(match.text, 120)}"`);
          }
        }
        lines.push("");
      }

      return lines.join("\n");
    }

    // 2차: GII 목차에서 약어/이름 검색
    const tocEntry = await searchTocByAbbreviation(query);
    if (tocEntry) {
      return [
        `[VERIFIED — GII 목차매칭] ${new Date().toISOString().slice(0, 10)}`,
        `[법령 검색결과: "${query}" — GII 매칭 1건]`,
        "",
        `1. ${tocEntry.title}`,
        `   GII slug: ${tocEntry.slug}`,
        `   XML: ${tocEntry.xmlUrl}`,
        "",
        `NeuRIS에서는 검색 결과가 없었으나 Gesetze im Internet에서 발견되었습니다.`,
        `get_law_section 도구로 구체적인 조문을 조회하세요.`,
      ].join("\n");
    }

    // 3차: Concept Map만 결과가 있는 경우
    if (conceptSection.length > 0) {
      const lines: string[] = [
        `[법령 검색결과: "${query}" — NeuRIS/GII 결과 없음, 개념 매핑 결과]`,
        "",
        "NeuRIS 법령 검색과 GII 목차에서 결과를 찾지 못했습니다.",
        "법률 개념 사전에서 다음 관련 조문을 찾았습니다:",
        "",
        ...(expansion ? buildExpansionSection(expansion, usedExpansion) : []),
        ...conceptSection,
        "💡 get_law_section 도구로 구체적인 조문을 조회하세요.",
      ];
      return lines.join("\n");
    }

    return `[법령 검색결과: "${query}" — 0건]\n\n검색 결과가 없습니다. 다른 키워드나 독일어 법률 용어로 검색해 보세요.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[검색 오류] ${message}`;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
