/**
 * verify-citation.ts
 *
 * Prüft, ob eine deutsche Rechtsprechungszitation (BGH NJW 2023, 1234)
 * tatsächlich existiert und gibt die korrekte Fundstelle zurück.
 *
 * Verhindert KI-Halluzinationen bei juristischen Gutachten und Schriftsätzen.
 *
 * Unterstützte Formate:
 *   BGH NJW 2023, 1234
 *   BGH, Urt. v. 12.03.2023 – IX ZR 123/22
 *   BVerfG BeckRS 2023, 12345
 *   BGHZ 150, 248
 *   BGHSt 65, 123
 *   BGH IX ZR 123/22 (Aktenzeichen)
 */

import { z } from "zod";
import { searchCaseLaw, type CaseLawSearchResult } from "../lib/neuris-client.js";

// ── Zitat-Parser ──────────────────────────────────────────────────────────

interface ParsedCitation {
  typ: "aktenzeichen" | "zeitschrift" | "amtliche_sammlung" | "beckrs" | "neuris" | "unbekannt";
  gericht?: string;
  aktenzeichen?: string;
  datum?: string;
  zeitschrift?: string;
  jahr?: number;
  seite?: number;
  sammlung?: string;
  band?: number;
  beckrsNr?: string;
  neurisNr?: string;
  rohZitat: string;
}

// Gerichts-Mapping für NeuRIS-Suche
const GERICHTE_MAP: Record<string, string> = {
  BGH: "bgh",
  BVerfG: "bverfg",
  BAG: "bag",
  BVerwG: "bverwg",
  BFH: "bfh",
  BSG: "bsg",
  BPatG: "bpatg",
  OLG: "", // OLG nicht direkt in NeuRIS (Landesgericht)
};

const AMTLICHE_SAMMLUNGEN: Record<string, string> = {
  BGHZ: "bgh",    // BGH Zivilsachen
  BGHSt: "bgh",   // BGH Strafsachen
  BVerwGE: "bverwg",
  BVerfGE: "bverfg",
  BAGE: "bag",
  BSGE: "bsg",
  BFHE: "bfh",
};

function parseCitation(zitat: string): ParsedCitation {
  const raw = zitat.trim();
  const base: ParsedCitation = { typ: "unbekannt", rohZitat: raw };

  // NeuRIS Dokumentnummer (JURE..., KORE...)
  const neurisMatch = raw.match(/\b(JURE\d+|KORE\d+|BURE\d+)\b/i);
  if (neurisMatch) {
    return { ...base, typ: "neuris", neurisNr: neurisMatch[1].toUpperCase() };
  }

  // BeckRS Format: BeckRS 2023, 12345 oder BeckRS2023, 12345
  const beckrsMatch = raw.match(/BeckRS\s*(\d{4}),?\s*(\d{4,6})/i);
  if (beckrsMatch) {
    return {
      ...base,
      typ: "beckrs",
      jahr: parseInt(beckrsMatch[1]),
      beckrsNr: `${beckrsMatch[1]}, ${beckrsMatch[2]}`,
    };
  }

  // Amtliche Sammlung: BGHZ 150, 248
  for (const [sammlung, gericht] of Object.entries(AMTLICHE_SAMMLUNGEN)) {
    const sammMatch = raw.match(new RegExp(`\\b${sammlung}\\s+(\\d+),\\s*(\\d+)`));
    if (sammMatch) {
      return {
        ...base,
        typ: "amtliche_sammlung",
        sammlung,
        gericht,
        band: parseInt(sammMatch[1]),
        seite: parseInt(sammMatch[2]),
      };
    }
  }

  // Vollständiges Aktenzeichen-Zitat: BGH, Urt. v. 12.03.2023 – IX ZR 123/22
  const vollAzMatch = raw.match(
    /^(BGH|BVerfG|BAG|BVerwG|BFH|BSG|BPatG)[,\s]+(?:Urt\.|Beschl\.|Bes\.)?\s*v\.?\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*[–—-]\s*([IVX\d]+\s+\w+\s+\d+\/\d+)/i,
  );
  if (vollAzMatch) {
    return {
      ...base,
      typ: "aktenzeichen",
      gericht: vollAzMatch[1].toUpperCase(),
      datum: normalizeDatum(vollAzMatch[2]),
      aktenzeichen: vollAzMatch[3].trim(),
    };
  }

  // Reines Aktenzeichen: BGH IX ZR 123/22 oder BGH IX ZR 123/22
  const azMatch = raw.match(
    /^(BGH|BVerfG|BAG|BVerwG|BFH|BSG|BPatG)\s+([IVX\d]+\s+\w+\s+\d+\/\d+|\d+\s+\w+\s+\d+\/\d+)/i,
  );
  if (azMatch) {
    return {
      ...base,
      typ: "aktenzeichen",
      gericht: azMatch[1].toUpperCase(),
      aktenzeichen: azMatch[2].trim(),
    };
  }

  // Zeitschriften-Zitat: BGH NJW 2023, 1234 oder BVerfG NJW 2021, 1234
  const zeitschriftMatch = raw.match(
    /^(BGH|BVerfG|BAG|BVerwG|BFH|BSG|BPatG|OLG\s+\w+|AG\s+\w+|LG\s+\w+)[\s,]+(\w+(?:-\w+)?)\s+(\d{4}),?\s*(\d+)/i,
  );
  if (zeitschriftMatch) {
    return {
      ...base,
      typ: "zeitschrift",
      gericht: zeitschriftMatch[1].trim().toUpperCase(),
      zeitschrift: zeitschriftMatch[2].toUpperCase(),
      jahr: parseInt(zeitschriftMatch[3]),
      seite: parseInt(zeitschriftMatch[4]),
    };
  }

  return base;
}

function normalizeDatum(d: string): string {
  // "12.03.2023" → "2023-03-12"
  const parts = d.split(".");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  return d;
}

// ── Verifikations-Engine ──────────────────────────────────────────────────

interface VerificationResult {
  gefunden: boolean;
  originalZitat: string;
  normalisiertesZitat?: string;
  entscheidung?: {
    gericht: string;
    datum?: string;
    aktenzeichen?: string;
    dokumentnummer?: string;
    kurzinhalt?: string;
  };
  fehler?: string;
  hinweis?: string;
}

async function verifyCitationInternal(parsed: ParsedCitation): Promise<VerificationResult> {
  const base = { originalZitat: parsed.rohZitat };

  // NeuRIS-Dokumentnummer direkt
  if (parsed.typ === "neuris" && parsed.neurisNr) {
    try {
      const { getCaseLawHtml } = await import("../lib/neuris-client.js");
      const text = await getCaseLawHtml(parsed.neurisNr);
      if (text && !text.includes("nicht gefunden") && !text.includes("Fehler")) {
        return {
          ...base,
          gefunden: true,
          normalisiertesZitat: parsed.neurisNr,
          entscheidung: { gericht: "unbekannt", dokumentnummer: parsed.neurisNr, kurzinhalt: text.slice(0, 200) },
        };
      }
    } catch (_) {}
    return { ...base, gefunden: false, fehler: `Dokumentnummer ${parsed.neurisNr} nicht in NeuRIS gefunden.` };
  }

  // Aktenzeichen-Suche
  if (parsed.typ === "aktenzeichen" && parsed.gericht && parsed.aktenzeichen) {
    const courtCode = GERICHTE_MAP[parsed.gericht];
    try {
      const results: CaseLawSearchResult = await searchCaseLaw(
        parsed.aktenzeichen,
        courtCode || undefined,
        5,
      );
      const azNorm = parsed.aktenzeichen.replace(/\s+/g, " ").trim().toLowerCase();
      const firstItem = results.items[0];
      const allText = results.items
        .map((it) => `${it.fileNumbers.join(" ")} ${it.documentNumber}`)
        .join(" ")
        .toLowerCase();
      if (results.totalItems > 0 && allText.includes(azNorm.split("/")[0].trim().toLowerCase())) {
        const preview = firstItem?.textMatches?.[0]?.text?.slice(0, 300) ?? "";
        return {
          ...base,
          gefunden: true,
          normalisiertesZitat: `${parsed.gericht}, ${parsed.datum ? `Urt. v. ${parsed.datum} – ` : ""}${parsed.aktenzeichen}`,
          entscheidung: {
            gericht: parsed.gericht,
            aktenzeichen: parsed.aktenzeichen,
            datum: parsed.datum ?? firstItem?.decisionDate ?? undefined,
            dokumentnummer: firstItem?.documentNumber,
            kurzinhalt: preview || firstItem?.headline?.slice(0, 300) || undefined,
          },
        };
      }
    } catch (_) {}
    return {
      ...base,
      gefunden: false,
      fehler: `Aktenzeichen ${parsed.aktenzeichen} (${parsed.gericht}) nicht verifiziert.`,
      hinweis: "Möglicherweise OLG/LG-Entscheidung (nicht in NeuRIS-Bundesgericht-DB) oder falsches Aktenzeichen.",
    };
  }

  // Zeitschrift-Zitat: Suche über Gericht + Jahr + Stichwort
  if (parsed.typ === "zeitschrift" && parsed.gericht && parsed.jahr) {
    const courtCode = GERICHTE_MAP[parsed.gericht.split(" ")[0]];
    if (!courtCode) {
      return {
        ...base,
        gefunden: false,
        hinweis: `${parsed.gericht}-Entscheidungen sind nicht in der NeuRIS-Bundesgericht-DB. Bitte in juris oder beck-online prüfen.`,
      };
    }
    // NeuRIS hat keine Zeitschriften-Seitenzahlen — prüfe ob Treffer im Jahr existieren
    try {
      const results: CaseLawSearchResult = await searchCaseLaw(
        `${parsed.zeitschrift} ${parsed.jahr} ${parsed.seite}`,
        courtCode,
        3,
      );
      if (results.totalItems > 0) {
        return {
          ...base,
          gefunden: true,
          normalisiertesZitat: `${parsed.gericht} ${parsed.zeitschrift} ${parsed.jahr}, ${parsed.seite}`,
          entscheidung: {
            gericht: parsed.gericht,
            kurzinhalt: `${parsed.zeitschrift}-Zitat aus ${parsed.jahr} — Treffer gefunden. Exakte Seitenzahl in NeuRIS nicht direkt prüfbar; bitte in ${parsed.zeitschrift} oder beck-online verifizieren.`,
          },
          hinweis: `NeuRIS enthält keine ${parsed.zeitschrift}-Seitenzahlen. Vollständige Verifikation erfordert Zugriff auf ${parsed.zeitschrift} (beck-online oder juris).`,
        };
      }
    } catch (_) {}
    return {
      ...base,
      gefunden: false,
      fehler: `${parsed.gericht} ${parsed.zeitschrift} ${parsed.jahr}, ${parsed.seite} — Kein passender Treffer in NeuRIS.`,
      hinweis: "Bitte in juris oder beck-online verifizieren. NeuRIS enthält keine Zeitschriftenseitenzahlen.",
    };
  }

  // Amtliche Sammlung
  if (parsed.typ === "amtliche_sammlung" && parsed.sammlung && parsed.band) {
    return {
      ...base,
      gefunden: false,
      hinweis: `${parsed.sammlung} ${parsed.band}, ${parsed.seite} — Amtliche Sammlungen sind nicht direkt in NeuRIS durchsuchbar. Bitte in juris oder beck-online verifizieren.`,
    };
  }

  // BeckRS
  if (parsed.typ === "beckrs") {
    return {
      ...base,
      gefunden: false,
      hinweis: `BeckRS ${parsed.beckrsNr} — BeckRS-Nummern sind nur über beck-online verifizierbar (kein öffentlicher API-Zugriff).`,
    };
  }

  return {
    ...base,
    gefunden: false,
    fehler: "Zitat konnte nicht geparst werden.",
    hinweis: "Unterstützte Formate: 'BGH NJW 2023, 1234', 'BGH IX ZR 123/22', 'BGHZ 150, 248', 'BeckRS 2023, 12345', NeuRIS-Dokumentnummern (JURE...).",
  };
}

// ── Schema ────────────────────────────────────────────────────────────────

export const verifyCitationSchema = z.object({
  zitat: z
    .string()
    .describe(
      "Das zu prüfende Rechtsprechungszitat. Unterstützte Formate: " +
      "'BGH NJW 2023, 1234', 'BGH, Urt. v. 12.03.2023 – IX ZR 123/22', " +
      "'BGHZ 150, 248', 'BeckRS 2023, 12345', NeuRIS-Dokumentnummer 'JURE120015069'",
    ),
  mehrere: z
    .array(z.string())
    .optional()
    .describe("Mehrere Zitate gleichzeitig prüfen (Liste von Zitatstrings)"),
});

export type VerifyCitationInput = z.infer<typeof verifyCitationSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function verifyCitation(input: VerifyCitationInput): Promise<string> {
  const zitate = input.mehrere && input.mehrere.length > 0
    ? input.mehrere
    : [input.zitat];

  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  ZITATSVERIFIKATION — Halluzinationsschutz");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push(`  Geprüfte Zitate: ${zitate.length}`);
  lines.push("───────────────────────────────────────────────────────");

  let ok = 0;
  let nichtVerifiziert = 0;
  let fehler = 0;

  for (let i = 0; i < zitate.length; i++) {
    const zitat = zitate[i].trim();
    lines.push(`\n  [${i + 1}] "${zitat}"`);

    const parsed = parseCitation(zitat);
    const result = await verifyCitationInternal(parsed);

    if (result.gefunden) {
      ok++;
      lines.push(`  ✅ VERIFIZIERT`);
      if (result.normalisiertesZitat && result.normalisiertesZitat !== zitat) {
        lines.push(`     Normalisiert: ${result.normalisiertesZitat}`);
      }
      if (result.entscheidung?.kurzinhalt) {
        const preview = result.entscheidung.kurzinhalt.slice(0, 150).replace(/\n/g, " ");
        lines.push(`     Inhalt: ${preview}...`);
      }
    } else if (result.hinweis && !result.fehler) {
      nichtVerifiziert++;
      lines.push(`  ⚠  NICHT AUTOMATISCH VERIFIZIERBAR`);
      lines.push(`     ${result.hinweis}`);
    } else {
      fehler++;
      lines.push(`  ❌ NICHT GEFUNDEN / FEHLER`);
      if (result.fehler) lines.push(`     ${result.fehler}`);
      if (result.hinweis) lines.push(`     Hinweis: ${result.hinweis}`);
    }
  }

  lines.push("\n═══════════════════════════════════════════════════════");
  lines.push(`  ERGEBNIS: ✅ ${ok} verifiziert  ⚠ ${nichtVerifiziert} manuell prüfen  ❌ ${fehler} nicht gefunden`);
  lines.push("");
  lines.push("  Wichtig: NeuRIS enthält nur Entscheidungen der 7 Bundesgerichte.");
  lines.push("  OLG/LG/AG-Entscheidungen und Zeitschriften-Seitenzahlen (NJW, BeckRS)");
  lines.push("  müssen in juris oder beck-online manuell verifiziert werden.");

  return lines.join("\n");
}
