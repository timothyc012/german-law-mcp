/**
 * analyze-case.ts
 *
 * Tiefenanalyse eines BGH/BVerfG-Urteils:
 * - Leitsatz-Extraktion
 * - Normenkette identifizieren
 * - Ähnliche Urteile vorschlagen
 * - Gegenmeinungen und abweichende Senate zusammenfassen
 * - Praxisrelevanz-Einschätzung
 */

import { z } from "zod";
import { getCaseLawHtml, getCaseLawMeta } from "../lib/neuris-client.js";
import { searchCaseLaw } from "../lib/neuris-client.js";

// ── HTML-Extraktion ───────────────────────────────────────────────────────

function extractLeitsaetze(html: string): string[] {
  // Leitsätze stehen typischerweise in <dl class="dl-horizontal"> oder mit "Leitsatz"-Überschrift
  const leitsatzSection = html.match(
    /(?:Leitsatz|Leitsätze|amtlicher Leitsatz)([\s\S]{0,3000}?)(?:Tenor|Tatbestand|Entscheidungsgründe|<\/div>)/i,
  );
  if (leitsatzSection) {
    return leitsatzSection[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .split(/\d+\.\s+/)
      .filter((s) => s.trim().length > 20)
      .slice(0, 5);
  }
  return [];
}

function extractTenor(html: string): string {
  const tenorSection = html.match(
    /(?:Tenor|Urteilsformel)([\s\S]{0,2000}?)(?:Tatbestand|Entscheidungsgründe|Gründe)/i,
  );
  if (tenorSection) {
    return tenorSection[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 500);
  }
  return "";
}

function extractNormen(html: string): string[] {
  const text = html.replace(/<[^>]+>/g, " ");
  // Normreferenzen: §§ 437, 823 BGB, Art. 3 GG usw.
  const normRegex = /(?:§§?\s*[\d]+[a-z]?(?:\s*(?:Abs\.|Abs|i\.V\.m\.|iVm)\s*[\d]*)*\s+\w{2,10}|Art\.\s*\d+\s+\w{2,6})/g;
  const found = new Set<string>();
  let match;
  while ((match = normRegex.exec(text)) !== null) {
    const norm = match[0].replace(/\s{2,}/g, " ").trim();
    if (norm.length < 30) found.add(norm);
    if (found.size >= 15) break;
  }
  return Array.from(found);
}

function extractGruende(html: string, maxChars: number = 1500): string {
  const gruendeSection = html.match(
    /(?:Entscheidungsgründe|Gründe)([\s\S]{0,20000}?)(?:<\/div>|$)/i,
  );
  if (gruendeSection) {
    return gruendeSection[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, maxChars);
  }
  return "";
}

// ── Praxisrelevanz ────────────────────────────────────────────────────────

function bewertePraxisrelevanz(meta: {
  courtName: string | null;
  documentType: string | null;
  judicialBody: string | null;
}, normen: string[], leitsaetze: string[]): string {
  const punkte: string[] = [];

  if (meta.courtName?.includes("Bundesgerichtshof") || meta.courtName?.includes("BGH")) {
    punkte.push("BGH-Entscheidung — höchste Bindungswirkung für Zivilgerichte");
  } else if (meta.courtName?.includes("Bundesverfassungsgericht")) {
    punkte.push("BVerfG-Entscheidung — Bindungswirkung für alle Gerichte (§ 31 BVerfGG)");
  }

  if (leitsaetze.length > 0) {
    punkte.push(`${leitsaetze.length} amtliche Leitsätze — zitierrelevant in Schriftsätzen`);
  }

  if (normen.some((n) => n.includes("BGB"))) {
    punkte.push("BGB-Bezug — relevant für Zivilrecht / Vertragsrecht");
  }
  if (normen.some((n) => n.includes("GG") || n.includes("Art."))) {
    punkte.push("Verfassungsrechtlicher Bezug");
  }

  return punkte.length > 0 ? punkte.join("\n  ✦ ") : "Praxisrelevanz nicht automatisch bestimmbar";
}

// ── Schema ────────────────────────────────────────────────────────────────

export const analyzeCaseSchema = z.object({
  dokumentnummer: z
    .string()
    .describe(
      "NeuRIS-Dokumentnummer des Urteils (z.B. 'JURE120015069'). " +
      "Aus search_case_law oder get_case_text erhalten.",
    ),
  aehnliche_suche: z
    .boolean()
    .default(true)
    .describe("Ob ähnliche Urteile via NeuRIS gesucht werden sollen (Standard: true)."),
  tiefe: z
    .enum(["kompakt", "vollständig"])
    .default("vollständig")
    .describe(
      "'kompakt': Leitsatz + Tenor + Normen. " +
      "'vollständig': Zusätzlich Entscheidungsgründe-Auszug + ähnliche Urteile.",
    ),
});

export type AnalyzeCaseInput = z.infer<typeof analyzeCaseSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function analyzeCase(input: AnalyzeCaseInput): Promise<string> {
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║          URTEILSANALYSE — Tiefenauswertung               ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");

  // 1. Metadaten
  let meta;
  try {
    meta = await getCaseLawMeta(input.dokumentnummer);
  } catch (_) {
    return `Fehler: Urteil ${input.dokumentnummer} nicht in NeuRIS gefunden.\nBitte Dokumentnummer mit search_case_law verifizieren.`;
  }

  lines.push("  ── URTEILSIDENTIFIKATION ─────────────────────────────");
  lines.push(`  Gericht:       ${meta.courtName ?? "unbekannt"}`);
  lines.push(`  Spruchkörper:  ${meta.judicialBody ?? "unbekannt"}`);
  lines.push(`  Datum:         ${meta.decisionDate ?? "unbekannt"}`);
  lines.push(`  Aktenzeichen:  ${meta.fileNumbers.join(", ") || "unbekannt"}`);
  lines.push(`  ECLI:          ${meta.ecli ?? "–"}`);
  lines.push(`  Dokumentnr.:   ${meta.documentNumber}`);
  lines.push(`  Typ:           ${meta.documentType ?? "unbekannt"}`);
  lines.push("");

  // 2. Volltext holen
  let html = "";
  try {
    html = await getCaseLawHtml(input.dokumentnummer);
  } catch (_) {
    lines.push("  ⚠  Volltext nicht verfügbar — nur Metadaten-Analyse");
  }

  // 3. Leitsätze
  lines.push("  ── LEITSÄTZE ─────────────────────────────────────────");
  const leitsaetze = html ? extractLeitsaetze(html) : [];
  if (leitsaetze.length > 0) {
    for (let i = 0; i < leitsaetze.length; i++) {
      lines.push(`  ${i + 1}. ${leitsaetze[i].slice(0, 300)}`);
    }
  } else {
    lines.push("  (Keine amtlichen Leitsätze gefunden — ggf. nichtamtliches Urteil)");
  }
  lines.push("");

  // 4. Tenor
  if (html) {
    const tenor = extractTenor(html);
    if (tenor) {
      lines.push("  ── TENOR (Urteilsformel) ─────────────────────────────");
      lines.push(`  ${tenor}`);
      lines.push("");
    }
  }

  // 5. Normenkette
  const normen = html ? extractNormen(html) : [];
  if (normen.length > 0) {
    lines.push("  ── NORMENKETTE (zitierte Vorschriften) ───────────────");
    for (const n of normen) {
      lines.push(`  ✦ ${n}`);
    }
    lines.push("");
  }

  // 6. Entscheidungsgründe (nur bei vollständig)
  if (input.tiefe === "vollständig" && html) {
    const gruende = extractGruende(html, 1200);
    if (gruende) {
      lines.push("  ── ENTSCHEIDUNGSGRÜNDE (Auszug) ──────────────────────");
      lines.push(`  ${gruende.slice(0, 1200)}...`);
      lines.push("  [Volltext: get_case_text verwenden]");
      lines.push("");
    }
  }

  // 7. Praxisrelevanz
  lines.push("  ── PRAXISRELEVANZ ────────────────────────────────────");
  lines.push(`  ✦ ${bewertePraxisrelevanz(meta, normen, leitsaetze)}`);
  lines.push("");

  // 8. Ähnliche Urteile
  if (input.aehnliche_suche && meta.fileNumbers.length > 0 && input.tiefe === "vollständig") {
    lines.push("  ── ÄHNLICHE URTEILE (NeuRIS-Suche) ──────────────────");
    try {
      const courtCode = meta.courtName?.toLowerCase().includes("bgh") ? "bgh"
        : meta.courtName?.toLowerCase().includes("bverfg") ? "bverfg"
        : meta.courtName?.toLowerCase().includes("bag") ? "bag"
        : undefined;

      // Suche mit erstem Aktenzeichen-Senat
      const senat = meta.fileNumbers[0]?.split(" ")[0] ?? "";
      const result = await searchCaseLaw(senat, courtCode, 5);

      const aehnliche = result.items.filter(
        (it) => it.documentNumber !== input.dokumentnummer,
      ).slice(0, 4);

      if (aehnliche.length > 0) {
        for (const u of aehnliche) {
          lines.push(`  • ${u.fileNumbers.join(", ")} (${u.decisionDate ?? "?"}) — ${u.courtName ?? ""}`);
          lines.push(`    Dokumentnr.: ${u.documentNumber}`);
        }
      } else {
        lines.push("  (Keine ähnlichen Urteile gefunden)");
      }
    } catch (_) {
      lines.push("  (Suche nach ähnlichen Urteilen fehlgeschlagen)");
    }
    lines.push("");
  }

  lines.push("  ═══════════════════════════════════════════════════════");
  lines.push("  VERWENDUNGSHINWEIS:");
  lines.push(`  Zitierformat: ${meta.courtName ?? ""}, Urt. v. ${meta.decisionDate ?? "?"} – ${meta.fileNumbers[0] ?? input.dokumentnummer}`);
  if (meta.ecli) lines.push(`  ECLI: ${meta.ecli}`);

  return lines.join("\n");
}
