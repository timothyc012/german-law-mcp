/**
 * search-with-grade.ts — 소스 등급 포함 통합 검색
 *
 * 입법(GII), 판례(NeuRIS)를 동시 검색하고
 * source-grade 라이브러리로 각 결과에 신뢰도 등급(A-D)을 부여한다.
 */

import { z } from "zod";
import { searchLegislation, searchCaseLaw } from "../lib/neuris-client.js";
import { gradeSource } from "../lib/source-grade.js";

export const searchWithGradeSchema = z.object({
  query: z.string().describe("검색어 (독일어 권장, 예: 'Mietvertrag Kündigung', 'Datenschutz')"),
  size: z.number().int().min(1).max(50).default(10).describe("결과 수 (기본 10, 최대 50)"),
  sources: z
    .array(z.enum(["legislation", "case_law"]))
    .default(["legislation", "case_law"])
    .describe("검색 대상 소스 (기본: 입법+판례)"),
  min_grade: z
    .enum(["A", "B", "C", "D"])
    .optional()
    .describe("최소 등급 필터 (예: 'B' → A·B등급만 반환)"),
});

export type SearchWithGradeInput = z.infer<typeof searchWithGradeSchema>;

const GRADE_ORDER: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 };

const GRADE_EMOJI: Record<string, string> = { A: "🟢", B: "🔵", C: "🟡", D: "🔴" };

// GII 법령 기본 URL
const GII_BASE = "https://www.gesetze-im-internet.de";

export async function searchWithGrade(input: SearchWithGradeInput): Promise<string> {
  const { query, size, sources, min_grade } = input;

  const lines: string[] = [
    `[등급 포함 통합 검색 — "${query}"]`,
    `소스: ${sources.join(", ")} | 최소 등급: ${min_grade ?? "제한 없음"} | 요청 수: ${size}`,
    "",
  ];

  type ResultItem = {
    type: string;
    title: string;
    snippet: string;
    url: string;
    grade: string;
    grade_reason: string;
  };

  const results: ResultItem[] = [];

  const tasks: Promise<void>[] = [];

  // ── 법령 검색 ─────────────────────────────────────────────────────────────
  if (sources.includes("legislation")) {
    tasks.push(
      (async () => {
        try {
          const res = await searchLegislation(query, Math.min(size, 20));
          for (const item of res.items) {
            // GII 법령 URL 구성
            const abbr = item.abbreviation ?? item.name.slice(0, 10);
            const url = `${GII_BASE}/${encodeURIComponent(abbr.toLowerCase())}/`;
            const graded = gradeSource(url, item.name);
            const snippet = item.textMatches[0]?.text ?? "";
            results.push({
              type: "입법",
              title: `${item.name}${item.abbreviation ? ` (${item.abbreviation})` : ""}`,
              snippet,
              url,
              grade: graded.grade,
              grade_reason: graded.gradeReason,
            });
          }
        } catch (err) {
          lines.push(`⚠️ 입법 검색 오류: ${err instanceof Error ? err.message : String(err)}`);
        }
      })()
    );
  }

  // ── 판례 검색 ─────────────────────────────────────────────────────────────
  if (sources.includes("case_law")) {
    tasks.push(
      (async () => {
        try {
          const res = await searchCaseLaw(query, undefined, Math.min(size, 20));
          for (const item of res.items) {
            // NeuRIS 판례 URL
            const url = `https://testphase.rechtsinformationen.bund.de/api/v1/caselaw/${item.documentNumber}`;
            const courtName = item.courtName ?? item.courtType ?? "법원";
            const graded = gradeSource(url, courtName);
            const snippet = item.headline ?? item.textMatches[0]?.text ?? item.documentNumber;
            results.push({
              type: "판례",
              title: `${courtName} — ${item.decisionDate ?? "날짜 미상"} (${item.documentNumber})`,
              snippet: snippet ?? "",
              url,
              grade: graded.grade,
              grade_reason: graded.gradeReason,
            });
          }
        } catch (err) {
          lines.push(`⚠️ 판례 검색 오류: ${err instanceof Error ? err.message : String(err)}`);
        }
      })()
    );
  }

  await Promise.all(tasks);

  // ── 등급 필터 + 정렬 ──────────────────────────────────────────────────────
  const filtered = min_grade
    ? results.filter((r) => (GRADE_ORDER[r.grade] ?? 3) <= (GRADE_ORDER[min_grade] ?? 3))
    : results;

  filtered.sort((a, b) => {
    const diff = (GRADE_ORDER[a.grade] ?? 3) - (GRADE_ORDER[b.grade] ?? 3);
    return diff !== 0 ? diff : a.type.localeCompare(b.type);
  });

  const sliced = filtered.slice(0, size);

  if (sliced.length === 0) {
    lines.push("검색 결과가 없습니다.");
    if (min_grade) lines.push("힌트: min_grade를 낮춰서 다시 시도해보세요.");
    return lines.join("\n");
  }

  lines.push(`총 ${filtered.length}건 (표시: ${sliced.length}건)`);
  lines.push("");

  for (let i = 0; i < sliced.length; i++) {
    const r = sliced[i];
    const badge = GRADE_EMOJI[r.grade] ?? "⚪";
    lines.push(`${i + 1}. ${badge} [${r.grade}등급] ${r.type} — ${r.title}`);
    if (r.snippet) {
      lines.push(`   ${r.snippet.slice(0, 120)}${r.snippet.length > 120 ? "…" : ""}`);
    }
    lines.push(`   등급 근거: ${r.grade_reason}`);
    lines.push(`   URL: ${r.url}`);
    lines.push("");
  }

  // ── 등급 분포 요약 ────────────────────────────────────────────────────────
  const gradeSummary: Record<string, number> = {};
  for (const r of sliced) {
    gradeSummary[r.grade] = (gradeSummary[r.grade] ?? 0) + 1;
  }

  lines.push("─".repeat(50));
  lines.push("📊 등급 분포:");
  for (const [g, count] of Object.entries(gradeSummary)) {
    if (count > 0) lines.push(`  ${GRADE_EMOJI[g] ?? "⚪"} ${g}등급: ${count}건`);
  }

  return lines.join("\n");
}
