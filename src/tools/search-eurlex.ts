/**
 * search_eurlex — EUR-Lex에서 EU 법률 검색
 *
 * CELLAR SPARQL endpoint를 사용하여 EU 규정, 지침, 결정 등을 검색한다.
 * 독일법과 관련된 EU 법률을 찾을 때 사용한다.
 *
 * 예: "Datenschutz" → GDPR (DSGVO), "Verbraucher" → 소비자보호 지침
 */

import { z } from "zod";
import { searchEurLexWithResult as searchEurLex } from "../lib/eurlex-client.js";

export const searchEurLexSchema = z.object({
  query: z.string().describe("검색어 (독일어 권장, 예: 'Datenschutz', 'Verbraucherschutz', 'DSGVO')"),
  size: z.number().min(1).max(20).optional().default(10).describe("결과 수 (기본 10, 최대 20)"),
});

export type SearchEurLexInput = z.infer<typeof searchEurLexSchema>;

export async function searchEurLexTool(input: SearchEurLexInput): Promise<string> {
  const { query, size } = input;

  try {
    const result = await searchEurLex(query, size);

    if (result.totalItems === 0) {
      return [
        `[EUR-Lex 검색결과: "${query}" — 0건]`,
        ``,
        `검색 결과가 없습니다. 독일어 또는 영어 법률 용어로 검색해 보세요.`,
        `예: 'Datenschutz', 'Verbraucherschutz', 'Binnenmarkt'`,
      ].join("\n");
    }

    const lines: string[] = [
      `[VERIFIED — EUR-Lex CELLAR] ${new Date().toISOString().slice(0, 10)}`,
      `[EU법 검색결과: "${query}" — ${result.totalItems}건]`,
      ``,
    ];

    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i];
      lines.push(`${i + 1}. ${item.title}`);
      lines.push(`   CELEX: ${item.celex}`);
      if (item.date) {
        lines.push(`   일자: ${item.date}`);
      }
      lines.push(`   URL: ${item.url}`);
      lines.push(``);
    }

    lines.push(`get_eurlex_document 도구에 CELEX 번호를 전달하면 문서 본문을 조회할 수 있습니다.`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] EUR-Lex 검색 실패: ${message}`;
  }
}
