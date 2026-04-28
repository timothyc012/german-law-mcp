/**
 * search_case_law — 독일 연방법원 판례 검색
 *
 * NeuRIS API로 7개 연방법원 판례를 통합 검색한다.
 * BGH(34,023), BFH(11,479), BVerwG(10,128), BPatG(7,236),
 * BAG(7,163), BSG(6,316), BVerfG(5,579) — 총 81,924건
 */

import { z } from "zod";
import { searchCaseLaw as searchCaseLawApi } from "../lib/neuris-client.js";
import { findCourt, ALL_COURTS } from "../lib/court-map.js";
import { expandLegalQuery, type QueryExpansion } from "../lib/query-expansion.js";

export const searchCaseLawSchema = z.object({
  query: z.string().describe("검색어 (예: 'Mietvertrag Kündigung', 'Kaufvertrag Mangel')"),
  court: z
    .string()
    .optional()
    .describe(`법원 코드 (선택). 가능한 값: ${ALL_COURTS.join(", ")}. 생략 시 전체 검색.`),
  size: z.number().min(1).max(50).optional().default(10).describe("결과 수 (기본 10, 최대 50)"),
  expandQuery: z.boolean().optional().default(true).describe("결과가 없을 때 일상어를 독일어 법률 용어로 확장해 재검색할지 여부."),
});

export type SearchCaseLawInput = z.input<typeof searchCaseLawSchema>;

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

export async function searchCaseLawTool(input: SearchCaseLawInput): Promise<string> {
  const { query, court, size, expandQuery } = searchCaseLawSchema.parse(input);

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

    const expansion = expandQuery ? expandLegalQuery(query) : null;
    let result = await searchCaseLawApi(query, neurisCourt, size);
    let searchQuery = query;
    let usedExpansion = false;

    if (result.totalItems === 0 && expansion?.wasExpanded) {
      result = await searchCaseLawApi(expansion.expandedQuery, neurisCourt, size);
      searchQuery = expansion.expandedQuery;
      usedExpansion = true;
    }

    if (result.totalItems === 0) {
      const lines = [
        `[판례 검색결과: "${query}" — ${courtLabel} — 0건]`,
        "",
        ...(expansion ? buildExpansionSection(expansion, usedExpansion) : []),
        "검색 결과가 없습니다. 다른 키워드나 독일어 법률 용어로 검색해 보세요.",
      ];
      return lines.join("\n");
    }

    const lines: string[] = [
      `[VERIFIED — NeuRIS API] ${new Date().toISOString().slice(0, 10)}`,
      `[판례 검색결과: "${query}" — ${courtLabel} — ${result.totalItems}건]`,
      searchQuery !== query ? `[실제 검색어: "${searchQuery}"]` : "",
      "",
      ...(expansion ? buildExpansionSection(expansion, usedExpansion) : []),
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

    lines.push(`get_case_text 도구에 문서번호를 전달하면 판결문을 조회할 수 있습니다. 긴 판결문은 section/offset/maxChars로 나눠 읽으세요.`);

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
