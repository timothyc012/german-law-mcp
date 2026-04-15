/**
 * search-state-law.ts — 독일 주법 검색 도구
 *
 * 16개 주의 주요 법령을 약어·분야·주코드로 검색한다.
 * Bayern은 실시간 법령 목록도 조회 가능.
 */

import { z } from "zod";
import {
  searchStateLaws,
  STATE_NAMES,
  CATEGORY_LABELS,
  STATE_PORTALS,
  type StateCode,
} from "../lib/state-law-client.js";

export const searchStateLawSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("검색어 (예: 'Polizei', 'Bauordnung', 'Datenschutz'). 미입력 시 전체 목록"),
  state: z
    .enum(["BY","BE","HH","HE","BW","NW","NI","SN","TH","BB","MV","RP","SL","ST","SH"])
    .optional()
    .describe("주 코드 필터 (예: 'BY'=Bayern, 'BE'=Berlin, 'NW'=NRW). 미입력 시 전체"),
  category: z
    .enum(["police","building","education","press","data","court","local","environ","transport","admin","health","tax"])
    .optional()
    .describe("분야 필터"),
  size: z
    .number().int().min(1).max(50).default(20)
    .describe("결과 수 (기본 20)"),
});

export type SearchStateLawInput = z.infer<typeof searchStateLawSchema>;

const STATE_EMOJI: Partial<Record<StateCode, string>> = {
  BY: "🏔️", BE: "🐻", HH: "⚓", HE: "🦁", BW: "🦌",
  NW: "🏭", NI: "🐎", SN: "⛏️", TH: "🌲", BB: "🦅",
  MV: "🌊", RP: "🍷", SL: "⚙️", ST: "🏰", SH: "🌊",
};

export async function searchStateLaw(input: SearchStateLawInput): Promise<string> {
  const { query, state, category, size } = input;

  const lines: string[] = [
    "[독일 주법(Landesrecht) 검색]",
    [
      query ? `검색어: "${query}"` : null,
      state ? `주: ${STATE_NAMES[state as StateCode]}` : "전체 주",
      category ? `분야: ${CATEGORY_LABELS[category] ?? category}` : null,
    ].filter(Boolean).join(" | "),
    "",
  ];

  const { results, totalFound } = searchStateLaws({
    query,
    state: state as StateCode | undefined,
    category,
    limit: size,
  });

  if (results.length === 0) {
    lines.push("검색 결과가 없습니다.");
    lines.push("");
    lines.push("힌트:");
    lines.push("  • 검색어를 독일어로 입력하세요 (예: 'Polizei', 'Bau', 'Schule')");
    lines.push("  • category 필터를 사용하세요 (police, building, data, education 등)");
    lines.push("  • state 필터를 제거하고 전체 주에서 검색해보세요");
    return lines.join("\n");
  }

  lines.push(`총 ${totalFound}건 (표시: ${results.length}건)`);
  lines.push("");

  // 주별 그룹핑
  const grouped: Partial<Record<StateCode, typeof results>> = {};
  for (const r of results) {
    if (!grouped[r.state]) grouped[r.state] = [];
    grouped[r.state]!.push(r);
  }

  for (const [stateCode, stateResults] of Object.entries(grouped)) {
    const sc = stateCode as StateCode;
    const emoji = STATE_EMOJI[sc] ?? "📋";
    lines.push(`${emoji} ${STATE_NAMES[sc]} (${stateCode})`);
    lines.push(`   포털: ${STATE_PORTALS[sc]}`);
    lines.push("");

    for (const law of stateResults!) {
      const catLabel = CATEGORY_LABELS[law.category] ?? law.category;
      lines.push(`  📄 ${law.abbreviation}`);
      lines.push(`     ${law.fullName}`);
      lines.push(`     분야: ${catLabel}`);
      lines.push(`     URL: ${law.url}`);
      lines.push("");
    }
  }

  lines.push("─".repeat(50));
  lines.push("💡 조문 원문 조회: get_state_law_section 도구 사용");
  lines.push("   (Bayern은 실시간 파싱, 그 외 주는 URL 안내)");

  return lines.join("\n");
}
