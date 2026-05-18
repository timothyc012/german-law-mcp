/**
 * search_bmf_schreiben — BMF(Bundesministerium der Finanzen) 행정해석 서한 검색
 *
 * 출처: bundesfinanzministerium.de
 * 등급: A (1차 행정해석 — BStBl I 게재 기준)
 */

import { z } from "zod";
import { searchBmfSchreiben as bmfSearch } from "../lib/bmf-client.js";

export const searchBmfSchreibenSchema = z.object({
  query: z.string().optional().describe("검색어 (제목/본문 키워드)"),
  date_from: z.string().optional().describe("시작일 YYYY-MM-DD"),
  date_to: z.string().optional().describe("종료일 YYYY-MM-DD"),
  subject_area: z
    .string()
    .optional()
    .describe("분야 키워드 (예: Einkommensteuer, Umsatzsteuer, Körperschaftsteuer)"),
  az_pattern: z.string().optional().describe("Aktenzeichen 부분 매칭 (예: 'IV C 6')"),
  limit: z.number().int().min(1).max(100).optional().describe("최대 결과 수 (기본 25)"),
});

export type SearchBmfSchreibenInput = z.infer<typeof searchBmfSchreibenSchema>;

export async function searchBmfSchreibenTool(
  input: SearchBmfSchreibenInput,
): Promise<string> {
  try {
    const results = await bmfSearch({
      query: input.query,
      dateFrom: input.date_from,
      dateTo: input.date_to,
      subjectArea: input.subject_area,
      azPattern: input.az_pattern,
      limit: input.limit,
    });

    if (results.length === 0) {
      return `[INFO] BMF-Schreiben 검색 결과 없음 (조건: ${JSON.stringify(input)})`;
    }

    const lines: string[] = [
      `[VERIFIED — BMF 검색 · 등급 A] ${new Date().toISOString().slice(0, 10)}`,
      `총 ${results.length}건`,
      ``,
    ];

    for (const r of results) {
      lines.push(`■ ${r.title}`);
      if (r.az) lines.push(`   AZ: ${r.az}`);
      if (r.date) lines.push(`   날짜: ${r.date}`);
      if (r.subjectArea) lines.push(`   분야: ${r.subjectArea}`);
      lines.push(`   URL: ${r.url}`);
      lines.push(``);
    }

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] BMF-Schreiben 검색 실패: ${message}`;
  }
}
