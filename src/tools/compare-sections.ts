/**
 * compare_sections — 두 법률 조문을 비교하여 diff를 출력한다.
 *
 * 용도:
 * 1. 같은 법률의 다른 조문 비교 (예: BGB §433 vs §437)
 * 2. 다른 법률의 조문 비교 (예: BGB §823 vs StGB §223)
 * 3. 신구조문 비교 시 사용자가 구 조문 텍스트를 직접 제공
 */

import { z } from "zod";
import { getLawSection as giiGetSection } from "../lib/gii-client.js";
import { diffLines, formatDiff } from "../lib/diff-utils.js";

export const compareSectionsSchema = z.object({
  law1: z.string().describe("첫 번째 법률 약어 (예: 'BGB')"),
  section1: z.string().describe("첫 번째 조문 번호 (예: '433')"),
  law2: z.string().optional().describe("두 번째 법률 약어. 생략하면 law1과 동일."),
  section2: z.string().optional().describe("두 번째 조문 번호. old_text를 제공하면 생략 가능."),
  old_text: z.string().optional().describe("구 조문 텍스트 (신구 비교 시). 제공하면 law1/section1의 현행 텍스트와 비교한다."),
});

export type CompareSectionsInput = z.infer<typeof compareSectionsSchema>;

export async function compareSections(input: CompareSectionsInput): Promise<string> {
  const { law1, section1, law2, section2, old_text } = input;

  try {
    // Fetch the first (current) section
    const current = await giiGetSection(law1, section1);

    let oldLabel: string;
    let newLabel: string;
    let oldContent: string;
    let newContent: string;

    if (old_text) {
      // Mode: Compare user-provided old text with current text
      oldLabel = `구 조문 (사용자 제공)`;
      newLabel = `${law1} ${current.title} (현행)`;
      oldContent = old_text;
      newContent = current.content;
    } else if (section2) {
      // Mode: Compare two sections
      const targetLaw = law2 ?? law1;
      const other = await giiGetSection(targetLaw, section2);

      oldLabel = `${law1} §${section1} — ${current.title}`;
      newLabel = `${targetLaw} §${section2} — ${other.title}`;
      oldContent = current.content;
      newContent = other.content;
    } else {
      return `[오류] section2 또는 old_text 중 하나를 제공해야 합니다.`;
    }

    // Generate diff
    const diff = diffLines(oldContent, newContent);
    const diffText = formatDiff(diff);

    const lines: string[] = [
      `[VERIFIED — GII 원문비교] ${new Date().toISOString().slice(0, 10)}`,
      ``,
      `── 비교 대상 ──`,
      `A (기준): ${oldLabel}`,
      `B (비교): ${newLabel}`,
      ``,
      `── Diff ──`,
      `(- 삭제, + 추가, 공백 = 동일)`,
      ``,
      diffText,
    ];

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[비교 오류] ${message}`;
  }
}
