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
  // Unterstützt auch OLG/LG/AG: OLG München, Urt. v. 12.03.2023 – 1 U 123/22
  const COURT_RE = "BGH|BVerfG|BAG|BVerwG|BFH|BSG|BPatG|(?:OLG|LG|AG|VG|OVG|ArbG|LAG|FG)\\s+\\w+";
  const vollAzMatch = raw.match(
    new RegExp(`^(${COURT_RE})[,\\s]+(?:Urt\\.|Beschl\\.|Bes\\.)?\\s*v\\.?\\s*(\\d{1,2}\\.\\d{1,2}\\.\\d{4})\\s*[–—-]\\s*([IVX\\d]+\\s+\\w+\\s+\\d+\\/\\d+)`, "i"),
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

  // Reines Aktenzeichen: BGH IX ZR 123/22, OLG München 1 U 123/22
  const azMatch = raw.match(
    new RegExp(`^(${COURT_RE})\\s+([IVX\\d]+\\s+\\w+\\s+\\d+\\/\\d+|\\d+\\s+\\w+\\s+\\d+\\/\\d+)`, "i"),
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

type ConfidenceLevel = "high" | "medium" | "low" | "hallucination_risk";

interface VerificationResult {
  gefunden: boolean;
  confidence: ConfidenceLevel;
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
          confidence: "high",
          normalisiertesZitat: parsed.neurisNr,
          entscheidung: { gericht: "unbekannt", dokumentnummer: parsed.neurisNr, kurzinhalt: text.slice(0, 200) },
        };
      }
    } catch (_) {}
    return { ...base, gefunden: false, confidence: "hallucination_risk", fehler: `Dokumentnummer ${parsed.neurisNr} nicht in NeuRIS gefunden.` };
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
          confidence: "high",
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
    // OLG/LG/AG: NeuRIS covers federal courts only — not hallucination, just outside DB scope
    const isNonFederal = /^(OLG|LG|AG|VG|OVG|ArbG|LAG|FG)\s/i.test(parsed.gericht);
    return {
      ...base,
      gefunden: false,
      confidence: isNonFederal ? "medium" : "hallucination_risk",
      fehler: `Aktenzeichen ${parsed.aktenzeichen} (${parsed.gericht}) nicht verifiziert.`,
      hinweis: isNonFederal
        ? `${parsed.gericht}-Entscheidungen sind nicht in der NeuRIS-Bundesgericht-DB. Das Zitat kann trotzdem echt sein — bitte in juris, beck-online oder openjur.de prüfen.`
        : "Möglicherweise falsches Aktenzeichen oder Tippfehler. Bitte in juris oder beck-online manuell prüfen.",
    };
  }

  // Zeitschrift-Zitat: Suche über Gericht + Jahr + Stichwort
  // ⚠ WICHTIG: Zeitschrift-Zitate können NIE "high" confidence erhalten,
  // da NeuRIS keine Zeitschriftenseitenzahlen enthält.
  if (parsed.typ === "zeitschrift" && parsed.gericht && parsed.jahr) {
    const courtCode = GERICHTE_MAP[parsed.gericht.split(" ")[0]];
    if (!courtCode) {
      return {
        ...base,
        gefunden: false,
        confidence: "low",
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
          confidence: "medium",
          normalisiertesZitat: `${parsed.gericht} ${parsed.zeitschrift} ${parsed.jahr}, ${parsed.seite}`,
          entscheidung: {
            gericht: parsed.gericht,
            kurzinhalt: `${parsed.zeitschrift}-Zitat aus ${parsed.jahr} — Treffer für dieses Gericht/Jahr gefunden. ABER: Exakte Seitenzahl (S. ${parsed.seite}) ist NICHT verifiziert.`,
          },
          hinweis: `⚠️ SEITENZAHL NICHT VERIFIZIERT: NeuRIS enthält keine ${parsed.zeitschrift}-Seitenzahlen. Die Existenz eines ${parsed.gericht}-Urteils aus ${parsed.jahr} wurde bestätigt, aber Seite ${parsed.seite} muss in ${parsed.zeitschrift} oder beck-online manuell geprüft werden.`,
        };
      }
    } catch (_) {}
    return {
      ...base,
      gefunden: false,
      confidence: "hallucination_risk",
      fehler: `${parsed.gericht} ${parsed.zeitschrift} ${parsed.jahr}, ${parsed.seite} — Kein passender Treffer in NeuRIS.`,
      hinweis: "Dieses Zitat konnte nicht bestätigt werden. Bitte in juris oder beck-online verifizieren. NeuRIS enthält keine Zeitschriftenseitenzahlen.",
    };
  }

  // Amtliche Sammlung
  if (parsed.typ === "amtliche_sammlung" && parsed.sammlung && parsed.band) {
    return {
      ...base,
      gefunden: false,
      confidence: "low",
      hinweis: `${parsed.sammlung} ${parsed.band}, ${parsed.seite} — Amtliche Sammlungen sind nicht direkt in NeuRIS durchsuchbar. Bitte in juris oder beck-online verifizieren.`,
    };
  }

  // BeckRS
  if (parsed.typ === "beckrs") {
    return {
      ...base,
      gefunden: false,
      confidence: "low",
      hinweis: `BeckRS ${parsed.beckrsNr} — BeckRS-Nummern sind nur über beck-online verifizierbar (kein öffentlicher API-Zugriff).`,
    };
  }

  return {
    ...base,
    gefunden: false,
    confidence: "hallucination_risk",
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

  let high = 0;
  let medium = 0;
  let low = 0;
  let hallucination = 0;

  const confidenceLabel: Record<ConfidenceLevel, { icon: string; text: string }> = {
    high: { icon: "✅", text: "VERIFIZIERT (Hohe Sicherheit)" },
    medium: { icon: "⚠️", text: "TEILWEISE VERIFIZIERT" },
    low: { icon: "⚠️", text: "NICHT AUTOMATISCH VERIFIZIERBAR" },
    hallucination_risk: { icon: "🔴", text: "HALLUZINATIONS-RISIKO" },
  };

  for (let i = 0; i < zitate.length; i++) {
    const zitat = zitate[i].trim();
    lines.push(`\n  [${i + 1}] "${zitat}"`);

    const parsed = parseCitation(zitat);
    const result = await verifyCitationInternal(parsed);

    const label = confidenceLabel[result.confidence];
    lines.push(`  ${label.icon} ${label.text}`);

    if (result.confidence === "high") high++;
    else if (result.confidence === "medium") medium++;
    else if (result.confidence === "low") low++;
    else hallucination++;

    if (result.normalisiertesZitat && result.normalisiertesZitat !== zitat) {
      lines.push(`     Normalisiert: ${result.normalisiertesZitat}`);
    }
    if (result.entscheidung?.kurzinhalt) {
      const preview = result.entscheidung.kurzinhalt.slice(0, 150).replace(/\n/g, " ");
      lines.push(`     Inhalt: ${preview}...`);
    }
    if (result.hinweis) {
      lines.push(`     ${result.hinweis}`);
    }
    if (result.fehler) {
      lines.push(`     ${result.fehler}`);
    }
  }

  lines.push("\n═══════════════════════════════════════════════════════");
  lines.push(`  ERGEBNIS: ✅ ${high} verifiziert (hoch)  ⚠️ ${medium} teilweise  ⚠️ ${low} manuell  🔴 ${hallucination} Risiko`);
  lines.push("");
  lines.push("  Vertrauensstufen:");
  lines.push("  ✅ HIGH      — Aktenzeichen direkt in NeuRIS bestätigt");
  lines.push("  ⚠️ MEDIUM    — Gericht/Jahr bestätigt, aber Seitenzahl nicht verifiziert");
  lines.push("  ⚠️ LOW       — Kein automatischer Check möglich (beck-online/juris nötig)");
  lines.push("  🔴 RISIKO    — Kein Korroboration gefunden, mögliche Halluzination");
  lines.push("");
  lines.push("  ⚖  VERWENDEN SIE NIEMALS ⚠️/🔴-Zitate in Gerichtsdokumenten ohne manuelle Prüfung.");

  return lines.join("\n");
}
