/**
 * get-state-law-section.ts — 독일 주법 조문 조회 도구
 *
 * Bayern: 실시간 HTML 파싱으로 조문 원문 반환
 * 그 외 주: 법령 정보 + 포털 직접 접근 URL 반환
 */

import { z } from "zod";
import {
  getStateLawSection as fetchStateLawSection,
  STATE_NAMES,
  STATE_PORTALS,
  KNOWN_STATE_LAWS,
  type StateCode,
} from "../lib/state-law-client.js";

export const getStateLawSectionSchema = z.object({
  state: z
    .enum(["BY","BE","HH","HE","BW","NW","NI","SN","TH","BB","MV","RP","SL","ST","SH"])
    .describe("주 코드 (예: 'BY'=Bayern, 'BE'=Berlin, 'NW'=NRW)"),
  law: z
    .string()
    .describe("법령 약어 또는 문서 ID (예: 'BayBO', 'PAG', 'ASOG', 'BauO Bln')"),
  section: z
    .string()
    .optional()
    .describe("조문 번호 (예: '1', '13', '42'). Bayern만 실시간 파싱. 미입력 시 전체 법령 정보"),
});

export type GetStateLawSectionInput = z.infer<typeof getStateLawSectionSchema>;

export async function getStateLawSectionTool(input: GetStateLawSectionInput): Promise<string> {
  try {
    const { state, law, section } = input;
    const sc = state as StateCode;
    const stateName = STATE_NAMES[sc];

    const lines: string[] = [
      `[주법 조문 조회 — ${stateName} (${state}): ${law}${section ? ` § ${section}` : ""}]`,
      "",
    ];

    const result = await fetchStateLawSection({ state: sc, law, section });

    if (!result) {
      lines.push(`'${law}'을 ${stateName} 법령 목록에서 찾을 수 없습니다.`);
      lines.push("");

      const sameLaws = KNOWN_STATE_LAWS.filter((e) => e.state === sc);
      if (sameLaws.length > 0) {
        lines.push(`${stateName}의 등록된 법령 목록:`);
        for (const e of sameLaws) {
          lines.push(`  • ${e.abbreviation} — ${e.fullName}`);
        }
      }

      lines.push("");
      lines.push(`포털에서 직접 검색: ${STATE_PORTALS[sc]}`);
      return lines.join("\n");
    }

    // ── 법령 정보 헤더 ─────────────────────────────────────────────────────────
    lines.push(`📖 ${result.lawName}`);
    lines.push(`   주: ${result.stateName} | 약어: ${result.law}`);
    lines.push(`   조문: ${result.section !== "gesamt" ? `§ ${result.section}` : "전체"}`);
    lines.push(`   URL: ${result.url}`);
    lines.push("");

    // ── 조문 제목 ──────────────────────────────────────────────────────────────
    if (result.title && result.title !== result.lawName) {
      lines.push(`제목: ${result.title}`);
      lines.push("");
    }

    // ── 본문 ───────────────────────────────────────────────────────────────────
    lines.push("본문:");
    lines.push(result.content);
    lines.push("");
    lines.push(`조회일시: ${result.fetchedAt.slice(0, 19).replace("T", " ")} UTC`);

    // ── Bayern 이외 주 추가 안내 ───────────────────────────────────────────────
    if (sc !== "BY") {
      lines.push("");
      lines.push("─".repeat(50));
      lines.push("ℹ️  이 주의 법령 포털은 JavaScript 렌더링이 필요합니다.");
      lines.push("   조문 원문은 위 URL을 브라우저에서 직접 열어 확인하세요.");
      lines.push("   Bayern(BY) 법령은 이 도구로 원문 직접 조회 가능합니다.");
    }

    return lines.join("\n");

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] Landesrecht-Paragrafenabruf 실행 중 오류: ${message}`;
  }
}
