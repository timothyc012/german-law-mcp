/**
 * get_law_section — 독일 법률의 특정 조문(§) 조회
 *
 * GII(Gesetze im Internet) HTML을 1순위로 사용한다.
 * 커버리지 100% (~6,450 법률), URL이 예측 가능하여 안정적이다.
 */

import { z } from "zod";
import { getLawSection as giiGetSection } from "../lib/gii-client.js";

export const getLawSectionSchema = z.object({
  law: z.string().describe("법률 약어 (예: 'BGB', 'StGB', 'GG', 'HGB', 'ZPO')"),
  section: z.string().describe("조문 번호 (예: '437', '1', '823', '535')"),
});

export type GetLawSectionInput = z.infer<typeof getLawSectionSchema>;

export async function getLawSection(input: GetLawSectionInput): Promise<string> {
  const { law, section } = input;

  try {
    const result = await giiGetSection(law, section);

    const lines: string[] = [
      `${result.title}`,
      `(${result.lawName})`,
      "",
      result.content,
      "",
      `출처: ${result.url}`,
    ];

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[조문 조회 오류] ${message}\n\n법률 약어(BGB, StGB 등)와 조문 번호를 확인해 주세요.`;
  }
}
