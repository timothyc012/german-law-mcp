/**
 * verify_bmf_citation — BMF-Schreiben 인용 검증 (환각 방지)
 *
 * 입력된 AZ + 날짜가 실제 BMF 검색에서 매칭되는지 확인한다.
 */

import { z } from "zod";
import { verifyBmfCitation as bmfVerify } from "../lib/bmf-client.js";

export const verifyBmfCitationSchema = z.object({
  az: z.string().describe("Aktenzeichen (예: 'IV C 6 - S 2133/19/10003')"),
  date: z.string().optional().describe("발행일 YYYY-MM-DD"),
});

export type VerifyBmfCitationInput = z.infer<typeof verifyBmfCitationSchema>;

export async function verifyBmfCitation(
  input: VerifyBmfCitationInput,
): Promise<string> {
  try {
    const match = await bmfVerify({ az: input.az, date: input.date });

    if (!match) {
      return [
        `[UNVERIFIED] BMF-Schreiben 인용을 확인할 수 없음`,
        ``,
        `AZ: ${input.az}`,
        input.date ? `날짜: ${input.date}` : ``,
        ``,
        `→ AZ 표기·발행일을 재확인하거나 search_bmf_schreiben으로 유사 항목을 검색하세요.`,
      ]
        .filter(Boolean)
        .join("\n");
    }

    const lines: string[] = [
      `[VERIFIED — BMF 인용 확인] ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `매칭 항목:`,
      `  제목: ${match.title}`,
      `  AZ:   ${match.az || "(검색 결과에서 추출 실패)"}`,
      match.date ? `  날짜: ${match.date}` : ``,
      match.subjectArea ? `  분야: ${match.subjectArea}` : ``,
      `  URL:  ${match.url}`,
    ];

    if (input.date && match.date && input.date !== match.date) {
      lines.push(``);
      lines.push(`⚠ 날짜 불일치: 입력=${input.date}, 검색결과=${match.date}`);
    }

    return lines.filter(Boolean).join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] BMF 인용 검증 실패: ${message}`;
  }
}
