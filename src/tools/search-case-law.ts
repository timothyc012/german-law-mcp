/**
 * search_case_law — 독일 연방법원 판례 검색
 *
 * NeuRIS API로 7개 연방법원 판례를 통합 검색한다.
 * BGH(34,023), BFH(11,479), BVerwG(10,128), BPatG(7,236),
 * BAG(7,163), BSG(6,316), BVerfG(5,579) — 총 81,924건
 */

import { z } from "zod";
import { searchCaseLaw } from "../lib/neuris-client.js";
import { findCourt, ALL_COURTS } from "../lib/court-map.js";

export const searchCaseLawSchema = z.object({
  query: z.string().describe("검색어 (예: 'Mietvertrag Kündigung', 'Kaufvertrag Mangel')"),
  court: z
    .string()
    .optional()
    .describe(`법원 코드 (선택). 가능한 값: ${ALL_COURTS.join(", ")}. 생략 시 전체 검색.`),
  size: z.number().min(1).max(50).optional().default(10).describe("결과 수 (기본 10, 최대 50)"),
});

export type SearchCaseLawInput = z.infer<typeof searchCaseLawSchema>;

export async function searchCaseLawTool(input: SearchCaseLawInput): Promise<string> {
  const { query, court, size } = input;

  try {
    // 법원 코드 정규화
    let neurisCourt: string | undefined;
    let courtLabel = "전체";
    if (court) {
      const courtInfo = findCourt(court);
      if (!courtInfo) {
        return `[오류] 알 수 없는 법원 코드: "${court}"\n가능한 값: ${ALL_COURTS.join(", ")}`;
      }
      neurisCourt = courtInfo.neurisId;
      courtLabel = `${courtInfo.neurisId} (${courtInfo.nameKo})`;
    }

    const result = await searchCaseLaw(query, neurisCourt, size);

    if (result.totalItems === 0) {
      return `[판례 검색결과: "${query}" — ${courtLabel} — 0건]\n\n검색 결과가 없습니다. 다른 키워드로 검색해 보세요.`;
    }

    const lines: string[] = [
      `[판례 검색결과: "${query}" — ${courtLabel} — ${result.totalItems}건]`,
      "",
    ];

    for (let i = 0; i < result.items.length; i++) {
      const item = result.items[i];
      const fileNums = item.fileNumbers.join(", ");
      lines.push(`${i + 1}. ${item.courtName ?? ""} ${fileNums} (${item.decisionDate ?? "날짜 불명"}) — ${item.documentType ?? ""}`);
      if (item.judicialBody) {
        lines.push(`   재판부: ${item.judicialBody}`);
      }
      if (item.headline) {
        lines.push(`   요지: ${item.headline}`);
      }
      lines.push(`   문서번호: ${item.documentNumber}`);
      if (item.ecli) {
        lines.push(`   ECLI: ${item.ecli}`);
      }
      // 텍스트 매칭 (최대 2개)
      for (const match of item.textMatches.slice(0, 2)) {
        if (match.text) {
          lines.push(`   매칭: "${truncate(match.text, 150)}"`);
        }
      }
      lines.push("");
    }

    lines.push(`get_case_text 도구에 문서번호를 전달하면 판결문 전문을 조회할 수 있습니다.`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[판례 검색 오류] ${message}`;
  }
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}
