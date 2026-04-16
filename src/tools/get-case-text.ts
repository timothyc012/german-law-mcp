/**
 * get_case_text — 판결문 전문 조회
 *
 * NeuRIS에서 판결문 HTML을 가져와 텍스트로 변환한다.
 * search_case_law 결과의 documentNumber를 입력으로 사용한다.
 */

import { z } from "zod";
import { getCaseLawMeta, getCaseLawHtml } from "../lib/neuris-client.js";

export const getCaseTextSchema = z.object({
  documentNumber: z.string().describe("NeuRIS 문서번호 (예: 'JURE120015069'). search_case_law 결과에서 획득."),
});

export type GetCaseTextInput = z.infer<typeof getCaseTextSchema>;

const MAX_TEXT_LENGTH = 8000;

export async function getCaseText(input: GetCaseTextInput): Promise<string> {
  const { documentNumber } = input;

  try {
    // 메타데이터 조회
    const meta = await getCaseLawMeta(documentNumber);

    // HTML 전문 조회
    const html = await getCaseLawHtml(documentNumber);
    const text = stripHtml(html);

    const lines: string[] = [
      `[VERIFIED — NeuRIS 원문확인] ${new Date().toISOString().slice(0, 10)}`,
      `[판결문: ${documentNumber}]`,
      "",
      `법원: ${meta.courtName ?? "불명"} (${meta.courtType ?? ""})`,
      `재판부: ${meta.judicialBody ?? "불명"}`,
      `일자: ${meta.decisionDate ?? "불명"}`,
      `유형: ${meta.documentType ?? "불명"}`,
      `사건번호: ${meta.fileNumbers.join(", ") || "불명"}`,
    ];

    if (meta.ecli) {
      lines.push(`ECLI: ${meta.ecli}`);
    }
    if (meta.headline) {
      lines.push(`요지: ${meta.headline}`);
    }

    lines.push("");
    lines.push("─".repeat(60));
    lines.push("");

    // 텍스트가 너무 길면 잘라냄
    if (text.length > MAX_TEXT_LENGTH) {
      lines.push(text.slice(0, MAX_TEXT_LENGTH));
      lines.push("");
      lines.push(`... (${text.length}자 중 처음 ${MAX_TEXT_LENGTH}자 표시)`);
      lines.push(`전문은 NeuRIS에서 확인: https://testphase.rechtsinformationen.bund.de/v1/case-law/${documentNumber}.html`);
    } else {
      lines.push(text);
    }

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] 판결문 조회 실패: ${message}\n\n문서번호를 확인해 주세요. search_case_law로 먼저 검색하세요.`;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|section|article|header|footer|table|tr|ul|ol|blockquote)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n  - ")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&bdquo;/g, "„")
    .replace(/&ldquo;/g, "“")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
