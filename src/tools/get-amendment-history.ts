/**
 * get-amendment-history.ts
 *
 * BGBl 개정 이력 조회 도구
 *
 * GII(gesetze-im-internet.de)에서 독일 법령의 개정 이력을
 * BGBl(연방관보) 참조와 함께 타임라인으로 반환한다.
 */

import { z } from "zod";
import { fetchAmendmentHistory } from "../lib/bgbl-client.js";

// ── Schema ────────────────────────────────────────────────────────────────

export const getAmendmentHistorySchema = z.object({
  law: z
    .string()
    .describe("법률 약어 (예: 'BGB', 'BDSG', 'ZPO', 'StGB', 'GG')"),
  max_entries: z
    .number()
    .default(10)
    .describe("최대 반환 개정 이력 수 (기본: 10)"),
});

export type GetAmendmentHistoryInput = z.infer<typeof getAmendmentHistorySchema>;

// ── 날짜 포맷 유틸 ────────────────────────────────────────────────────────

function formatDateDE(isoDate: string): string {
  if (!isoDate || isoDate === "unbekannt") return "unbekannt";
  const m = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return isoDate;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function getAmendmentHistory(
  input: GetAmendmentHistoryInput,
): Promise<string> {
  const lines: string[] = [];

  let history;
  try {
    history = await fetchAmendmentHistory(input.law);
  } catch (err) {
    lines.push("  Fehler: Konnte Änderungshistorie nicht laden.");
    lines.push(`  Grund: ${err instanceof Error ? err.message : String(err)}`);
    lines.push("");
    lines.push("  Unterstützte Gesetze mit vollständiger Historie:");
    lines.push("  BGB, BDSG, DSGVO, ZPO, StGB, TMG, GG");
    return lines.join("\n");
  }

  const { lawName, abbreviation, enactmentDate, lastAmended, amendments, source } = history;

  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push(`  GESETZESÄNDERUNGSHISTORIE — ${abbreviation}`);
  lines.push("═══════════════════════════════════════════════════════════════");
  lines.push("");
  lines.push(`  Vollständiger Name:  ${lawName}`);
  lines.push(`  Ausfertigungsdatum:  ${formatDateDE(enactmentDate)}`);
  lines.push(`  Zuletzt geändert:    ${formatDateDE(lastAmended)}`);
  lines.push("");

  const limited = amendments.slice(0, input.max_entries);

  if (limited.length === 0) {
    lines.push("  (Keine Änderungseinträge in der Wissensbasis)");
    lines.push("");
    lines.push("  Tipp: Für aktuelle Daten → https://www.gesetze-im-internet.de/" +
      abbreviation.toLowerCase() + "/");
  } else {
    lines.push(`  ── ÄNDERUNGSCHRONOLOGIE (neueste zuerst, max. ${input.max_entries}) ──`);
    lines.push("");

    for (const entry of limited) {
      lines.push(`  📅 ${formatDateDE(entry.date)} — ${entry.bgbl_ref}`);
      if (entry.article) {
        lines.push(`     ${entry.article}: ${entry.description}`);
      } else {
        lines.push(`     ${entry.description}`);
      }
      lines.push("");
    }

    if (amendments.length > input.max_entries) {
      lines.push(`  ... (${amendments.length - input.max_entries} weitere Einträge; max_entries erhöhen)`);
      lines.push("");
    }
  }

  lines.push("  ─────────────────────────────────────────────────────────────");
  lines.push(`  Quelle:     ${source}`);
  lines.push("  BGBl Online: https://www.bgbl.de/");
  lines.push(`  GII:         https://www.gesetze-im-internet.de/${abbreviation.toLowerCase()}/`);

  return lines.join("\n");
}
