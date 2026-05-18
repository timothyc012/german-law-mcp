/**
 * get_bmf_schreiben — BMF 행정해석 서한 전문 조회
 *
 * 출처: bundesfinanzministerium.de
 * 등급: A (1차 행정해석)
 */

import { z } from "zod";
import { getBmfSchreibenByUrl, searchBmfSchreiben } from "../lib/bmf-client.js";

export const getBmfSchreibenSchema = z.object({
  url: z.string().url().optional().describe("BMF-Schreiben 상세 페이지 URL (가장 정확)"),
  az: z.string().optional().describe("Aktenzeichen (예: 'IV C 6 - S 2133/19/10003')"),
  date: z.string().optional().describe("발행일 YYYY-MM-DD (az와 함께 사용)"),
});

const getBmfSchreibenRefined = getBmfSchreibenSchema.refine(
  (v) => v.url || v.az,
  { message: "url 또는 az 중 하나는 필수" },
);

export type GetBmfSchreibenInput = z.infer<typeof getBmfSchreibenSchema>;

export async function getBmfSchreiben(input: GetBmfSchreibenInput): Promise<string> {
  try {
    const parsed = getBmfSchreibenRefined.parse(input);
    let url = parsed.url;

    if (!url && input.az) {
      const candidates = await searchBmfSchreiben({
        query: input.az,
        azPattern: input.az,
        dateFrom: input.date,
        dateTo: input.date,
        limit: 5,
      });
      if (candidates.length === 0) {
        return `[NOT_FOUND] AZ "${input.az}"${input.date ? ` (${input.date})` : ""}에 매칭되는 BMF-Schreiben 없음`;
      }
      url = candidates[0].url;
    }

    if (!url) {
      return `[오류] URL 결정 실패`;
    }

    const doc = await getBmfSchreibenByUrl(url);

    const lines: string[] = [
      `[VERIFIED — BMF 원문확인 · 등급 ${doc.grade}] ${doc.fetchedAt.slice(0, 10)}`,
      ``,
      `${doc.title}`,
    ];
    if (doc.az) lines.push(`AZ: ${doc.az}`);
    if (doc.date) lines.push(`발행일: ${doc.date}`);
    if (doc.subjectArea) lines.push(`분야: ${doc.subjectArea}`);
    lines.push(``);
    lines.push(doc.body);

    if (doc.attachments.length > 0) {
      lines.push(``);
      lines.push(`── 첨부 (${doc.attachments.length}개) ──`);
      for (const a of doc.attachments) lines.push(`  ${a}`);
    }

    lines.push(``);
    lines.push(`출처: ${doc.url}`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] BMF-Schreiben 조회 실패: ${message}`;
  }
}
