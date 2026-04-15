/**
 * find_delegated_legislation — 위임법령(Verordnung) 추적
 *
 * 특정 법률과 관련된 위임 입법(시행령, 시행규칙)을 검색한다.
 * 독일 법체계: Gesetz(법률) → Rechtsverordnung(법규명령) → Verwaltungsvorschrift(행정규칙)
 *
 * NeuRIS API로 법률명/약어 + "Verordnung" 키워드로 관련 법규명령을 찾는다.
 */

import { z } from "zod";
import { searchLegislation } from "../lib/neuris-client.js";
import { findLaw } from "../lib/law-abbreviations.js";

export const findDelegatedLegislationSchema = z.object({
  law: z.string().describe("기본 법률 약어 또는 키워드 (예: 'BImSchG', 'EStG', 'Datenschutz')"),
  size: z.number().min(1).max(30).optional().default(15).describe("결과 수 (기본 15, 최대 30)"),
});

export type FindDelegatedLegislationInput = z.infer<typeof findDelegatedLegislationSchema>;

export async function findDelegatedLegislation(input: FindDelegatedLegislationInput): Promise<string> {
  const { law, size } = input;

  try {
    const lawInfo = findLaw(law);
    const lawName = lawInfo?.name ?? law;

    // Search strategies:
    // 1. "{법률명} Verordnung" → 관련 법규명령
    // 2. "{법률약어}V" or "{법률약어}DV" → 시행령 약어 패턴
    const queries = [
      `${lawName} Verordnung`,
      lawInfo ? `${law}` : null,
    ].filter(Boolean) as string[];

    const allItems = new Map<string, any>();

    for (const query of queries) {
      const result = await searchLegislation(query, size);
      for (const item of result.items) {
        if (!allItems.has(item.id)) {
          allItems.set(item.id, item);
        }
      }
    }

    const items = Array.from(allItems.values());

    // Classify results
    const verordnungen: typeof items = [];
    const gesetze: typeof items = [];
    const other: typeof items = [];

    for (const item of items) {
      const name = (item.name ?? "").toLowerCase();
      const abbr = (item.abbreviation ?? "").toLowerCase();

      if (
        name.includes("verordnung") ||
        name.includes("durchführung") ||
        abbr.endsWith("v") ||
        abbr.endsWith("dv") ||
        abbr.endsWith("vo")
      ) {
        verordnungen.push(item);
      } else if (
        name.includes("gesetz") ||
        name.includes("ordnung") && !name.includes("verordnung")
      ) {
        gesetze.push(item);
      } else {
        other.push(item);
      }
    }

    const lines: string[] = [
      `[VERIFIED — NeuRIS API] ${new Date().toISOString().slice(0, 10)}`,
      `[위임법령 추적: "${law}" ${lawInfo ? `(${lawInfo.name})` : ""}]`,
      ``,
    ];

    if (verordnungen.length > 0) {
      lines.push(`── 법규명령 (Verordnungen) — ${verordnungen.length}건 ──`);
      for (let i = 0; i < verordnungen.length; i++) {
        const item = verordnungen[i];
        lines.push(`  ${i + 1}. ${item.name}`);
        if (item.abbreviation) {
          lines.push(`     약어: ${item.abbreviation}${item.status ? ` | 상태: ${item.status === "InForce" ? "현행" : item.status}` : ""}`);
        }
      }
      lines.push(``);
    }

    if (gesetze.length > 0) {
      lines.push(`── 관련 법률 (Gesetze) — ${gesetze.length}건 ──`);
      for (let i = 0; i < gesetze.length; i++) {
        const item = gesetze[i];
        lines.push(`  ${i + 1}. ${item.name}`);
        if (item.abbreviation) {
          lines.push(`     약어: ${item.abbreviation}`);
        }
      }
      lines.push(``);
    }

    if (other.length > 0) {
      lines.push(`── 기타 관련 법령 — ${other.length}건 ──`);
      for (let i = 0; i < Math.min(other.length, 5); i++) {
        const item = other[i];
        lines.push(`  ${i + 1}. ${item.name}`);
        if (item.abbreviation) {
          lines.push(`     약어: ${item.abbreviation}`);
        }
      }
      lines.push(``);
    }

    if (items.length === 0) {
      lines.push(`검색 결과가 없습니다. 다른 법률명이나 키워드로 검색해 보세요.`);
    }

    lines.push(`독일 위임법령 체계: Gesetz → Rechtsverordnung → Verwaltungsvorschrift`);
    lines.push(`search_law로 개별 법령을 더 자세히 검색할 수 있습니다.`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[위임법령 추적 오류] ${message}`;
  }
}
