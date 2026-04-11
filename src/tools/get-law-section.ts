/**
 * get_law_section — 독일 법률의 특정 조문(§) 조회
 *
 * GII(Gesetze im Internet) HTML을 1순위로 사용한다.
 * 커버리지 100% (~6,450 법률), URL이 예측 가능하여 안정적이다.
 *
 * v0.2: 교차참조 추출 + 출처 검증 태그 추가
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
      `[VERIFIED \u2014 ${result.source} \uC6D0\uBB38\uD655\uC778] ${result.fetchedAt.slice(0, 10)}`,
      ``,
      `${result.title}`,
      `(${result.lawName})`,
      ``,
      result.content,
    ];

    // 교차참조 섹션
    if (result.crossReferences.length > 0) {
      lines.push(``);
      lines.push(`\u2500\u2500 \uAD50\uCC28\uCC38\uC870 (${result.crossReferences.length}\uAC1C) \u2500\u2500`);

      // 동일 법률 참조
      const sameLaw = result.crossReferences.filter((r) => r.law === law);
      const otherLaw = result.crossReferences.filter((r) => r.law !== law);

      if (sameLaw.length > 0) {
        lines.push(`  ${law} \uB0B4\uBD80: ${sameLaw.map((r) => `\u00A7${r.section}`).join(", ")}`);
      }
      if (otherLaw.length > 0) {
        // 법률별로 그룹화
        const grouped = new Map<string, string[]>();
        for (const r of otherLaw) {
          if (!grouped.has(r.law)) grouped.set(r.law, []);
          grouped.get(r.law)!.push(r.section);
        }
        for (const [refLaw, sections] of grouped) {
          const prefix = refLaw === "GG" ? "Art." : "\u00A7";
          lines.push(`  ${refLaw}: ${sections.map((s) => `${prefix} ${s}`).join(", ")}`);
        }
      }
    }

    lines.push(``);
    lines.push(`\uCD9C\uCC98: ${result.url}`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[\uC870\uBB38 \uC870\uD68C \uC624\uB958] ${message}\n\n\uBC95\uB960 \uC57D\uC5B4(BGB, StGB \uB4F1)\uC640 \uC870\uBB38 \uBC88\uD638\uB97C \uD655\uC778\uD574 \uC8FC\uC138\uC694.`;
  }
}
