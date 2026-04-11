/**
 * search_all — 법령 + 판례 통합 검색
 *
 * NeuRIS의 /v1/document 엔드포인트를 사용하여
 * 법령과 판례를 동시에 검색한다.
 */

import { z } from "zod";
import { searchAll } from "../lib/neuris-client.js";

export const searchAllSchema = z.object({
  query: z.string().describe("검색어 (예: 'Datenschutz DSGVO', 'Mieterhöhung')"),
  size: z.number().min(1).max(50).optional().default(10).describe("결과 수 (기본 10, 최대 50)"),
});

export type SearchAllInput = z.infer<typeof searchAllSchema>;

export async function searchAllTool(input: SearchAllInput): Promise<string> {
  const { query, size } = input;

  try {
    const result = await searchAll(query, size);

    if (result.totalItems === 0) {
      return `[통합 검색결과: "${query}" — 0건]\n\n검색 결과가 없습니다. 다른 키워드로 검색해 보세요.`;
    }

    const lines: string[] = [
      `[통합 검색결과: "${query}" — ${result.totalItems}건]`,
      "",
    ];

    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i];
      const typeLabel = item.type === "Legislation" ? "법령"
        : item.type === "Decision" ? "판례"
        : item.type;

      lines.push(`${i + 1}. [${typeLabel}] ${item.name ?? "(제목 없음)"}`);
      lines.push(`   ID: ${item.id}`);

      for (const match of item.textMatches.slice(0, 2)) {
        if (match.text) {
          lines.push(`   매칭: "${truncate(match.text, 150)}"`);
        }
      }
      lines.push("");
    }

    lines.push("법령은 search_law / get_law_section으로, 판례는 search_case_law / get_case_text로 상세 조회하세요.");

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[통합 검색 오류] ${message}`;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
