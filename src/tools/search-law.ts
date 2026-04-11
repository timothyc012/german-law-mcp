/**
 * search_law — 독일 연방법률 키워드 검색
 *
 * NeuRIS API를 1순위로 사용하고, 결과가 없으면 GII 목차에서 약어 매칭을 시도한다.
 */

import { z } from "zod";
import { searchLegislation } from "../lib/neuris-client.js";
import { searchTocByAbbreviation } from "../lib/gii-client.js";

export const searchLawSchema = z.object({
  query: z.string().describe("검색어 (예: 'Kaufvertrag', 'Mietrecht', 'Datenschutz', 'BGB')"),
  size: z.number().min(1).max(50).optional().default(10).describe("결과 수 (기본 10, 최대 50)"),
});

export type SearchLawInput = z.infer<typeof searchLawSchema>;

export async function searchLaw(input: SearchLawInput): Promise<string> {
  const { query, size } = input;

  try {
    // 1차: NeuRIS 법령 검색
    const result = await searchLegislation(query, size);

    if (result.totalItems > 0) {
      const lines: string[] = [
        `[법령 검색결과: "${query}" — ${result.totalItems}건]`,
        "",
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
