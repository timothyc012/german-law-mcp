/**
 * get_eurlex_document — EUR-Lex 문서 본문 조회
 *
 * CELEX 번호로 EU 법률 문서의 독일어 본문을 가져온다.
 * search_eurlex 결과의 CELEX 번호를 입력으로 사용한다.
 *
 * CELEX 번호 예시:
 *   32016R0679 → GDPR (DSGVO)
 *   32011L0083 → 소비자권리지침
 *   32019L1023 → 기업구조조정지침
 */

import { z } from "zod";
import { getEurLexDocument } from "../lib/eurlex-client.js";

export const getEurLexDocumentSchema = z.object({
  celex: z.string().describe("CELEX 문서번호 (예: '32016R0679'). search_eurlex 결과에서 획득."),
});

export type GetEurLexDocumentInput = z.infer<typeof getEurLexDocumentSchema>;

const MAX_TEXT_LENGTH = 8000;

export async function getEurLexDocumentTool(input: GetEurLexDocumentInput): Promise<string> {
  const { celex } = input;

  try {
    const doc = await getEurLexDocument(celex);

    const lines: string[] = [
      `[VERIFIED — EUR-Lex 원문확인] ${doc.fetchedAt.slice(0, 10)}`,
      `[EU 문서: ${celex}]`,
      ``,
      `제목: ${doc.title}`,
      `URL: ${doc.url}`,
      ``,
      `─`.repeat(60),
      ``,
    ];

    if (doc.content.length > MAX_TEXT_LENGTH) {
      lines.push(doc.content.slice(0, MAX_TEXT_LENGTH));
      lines.push(``);
      lines.push(`... (${doc.content.length}자 중 처음 ${MAX_TEXT_LENGTH}자 표시)`);
      lines.push(`전문: ${doc.url}`);
    } else {
      lines.push(doc.content);
    }

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] EUR-Lex 문서 조회 실패: ${message}\n\nCELEX 번호를 확인해 주세요. search_eurlex로 먼저 검색하세요.`;
  }
}
