/**
 * extract-cross-refs.ts — 독일법 교차참조 추출 도구
 */

import { z } from "zod";
import { getLawSection as getLawSectionLib } from "../lib/gii-client.js";
import { extractCrossReferences } from "../lib/cross-references.js";

export const extractCrossRefsSchema = z.object({
  law: z.string().describe("법률 약어 (예: 'BGB', 'BDSG', 'KWG')"),
  section: z.string().describe("조문 번호 (예: '823', '6', '437')"),
  include_eu: z
    .boolean()
    .default(true)
    .describe("EU 규정/지침 참조 포함 여부 (기본: true)"),
  include_statute_only: z
    .boolean()
    .default(false)
    .describe("법령(statute) 참조만 반환 — true 시 판례 참조 제외 (기본: false)"),
});

export type ExtractCrossRefsInput = z.infer<typeof extractCrossRefsSchema>;

export async function extractCrossRefs(input: ExtractCrossRefsInput): Promise<string> {
  const { law, section, include_eu, include_statute_only } = input;

  const lines: string[] = [
    `[교차참조 추출 — § ${section} ${law}]`,
    `EU 참조 포함: ${include_eu} | 법령만: ${include_statute_only}`,
    "",
  ];

  // ── 조문 조회 ─────────────────────────────────────────────────────────────
  let sectionContent: string;
  let builtinRefs: Array<{ law: string; section: string; display: string }> = [];

  try {
    const result = await getLawSectionLib(law, section);
    sectionContent = result.content;
    builtinRefs = result.crossReferences ?? [];
    if (!sectionContent) {
      return `오류: § ${section} ${law} 조문을 찾을 수 없습니다.`;
    }
  } catch (err) {
    return `오류: 조문 조회 실패 — ${err instanceof Error ? err.message : String(err)}`;
  }

  // ── 텍스트 기반 교차참조 추출 ────────────────────────────────────────────
  let extractedRefs: ReturnType<typeof extractCrossReferences> = [];
  try {
    extractedRefs = extractCrossReferences(sectionContent);
  } catch (err) {
    lines.push(`⚠️ 추출 오류: ${err instanceof Error ? err.message : String(err)}`);
  }

  // ── 필터링 ────────────────────────────────────────────────────────────────
  const filtered = extractedRefs.filter((ref) => {
    if (!include_eu && ref.type === "eu_regulation") return false;
    if (include_statute_only && ref.type !== "statute") return false;
    return true;
  });

  // ── GII 내장 참조 ─────────────────────────────────────────────────────────
  if (builtinRefs.length > 0) {
    lines.push(`📌 GII 내장 교차참조 (${builtinRefs.length}개):`);
    for (const ref of builtinRefs) {
      lines.push(`  • § ${ref.section} ${ref.law} — ${ref.display}`);
    }
    lines.push("");
  }

  // ── 추출 결과 ─────────────────────────────────────────────────────────────
  if (filtered.length === 0 && builtinRefs.length === 0) {
    lines.push("교차참조가 없습니다.");
    return lines.join("\n");
  }

  if (filtered.length > 0) {
    const groups: Record<string, typeof filtered> = {};
    for (const ref of filtered) {
      if (!groups[ref.type]) groups[ref.type] = [];
      groups[ref.type].push(ref);
    }

    const typeLabel: Record<string, string> = {
      statute: "🔗 법령 참조",
      caselaw: "⚖️ 판례 참조",
      eu_regulation: "🇪🇺 EU 규정/지침 참조",
    };

    lines.push(`📋 텍스트 추출 교차참조 (${filtered.length}개):`);
    lines.push("");

    for (const [type, groupRefs] of Object.entries(groups)) {
      lines.push(typeLabel[type] ?? `[${type}]`);
      for (const ref of groupRefs) {
        lines.push(`  • ${ref.normalized}`);
        if (ref.display !== ref.normalized) {
          lines.push(`    원문: "${ref.display}"`);
        }
      }
      lines.push("");
    }
  }

  // ── 조문 원문 스니펫 ──────────────────────────────────────────────────────
  lines.push("─".repeat(50));
  lines.push("📄 조문 원문 (일부):");
  lines.push(sectionContent.slice(0, 300) + (sectionContent.length > 300 ? "\n…" : ""));

  return lines.join("\n");
}
