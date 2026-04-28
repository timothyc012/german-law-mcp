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
import { searchByAktenzeichen } from "../lib/old-client.js";

export {
  courtMatches,
  normalizeAktenzeichen,
  parseCitation,
};

function normalizeAktenzeichen(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[–—−]/g, "-")
    .replace(/[^a-z0-9/]+/g, " ")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCourtText(value: string): string {
  return value
    .toLowerCase()
    // Expand German umlauts before NFD decomposition so München/Muenchen and Köln/Koeln match.
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function courtTypeAlias(token: string): string[] {
  const map: Record<string, string[]> = {
    olg: ["olg", "oberlandesgericht"],
    lg: ["lg", "landgericht"],
    ag: ["ag", "amtsgericht"],
    vg: ["vg", "verwaltungsgericht"],
    ovg: ["ovg", "oberverwaltungsgericht"],
    arbg: ["arbg", "arbeitsgericht"],
    lag: ["lag", "landesarbeitsgericht"],
    fg: ["fg", "finanzgericht"],
    kg: ["kg", "kammergericht"],
  };
  return map[token] ?? [token];
}

function courtMatches(requested: string, actual: string): boolean {
  const requestedNorm = normalizeCourtText(requested);
  const actualNorm = normalizeCourtText(actual);
  if (!requestedNorm || !actualNorm) return false;
  if (requestedNorm === actualNorm) return true;

  const requestedTokens = requestedNorm.split(" ");
  const actualTokens = new Set(actualNorm.split(" "));
  const requestedType = requestedTokens[0];
  const locationTokens = requestedTokens.slice(1).filter(Boolean);

  const typeMatches = courtTypeAlias(requestedType).some((alias) => actualTokens.has(alias));
  const locationMatches = locationTokens.every((token) => actualNorm.includes(token));

  return typeMatches && locationMatches;
}

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
  const COURT_RE = "BGH|BVerfG|BAG|BVerwG|BFH|BSG|BPatG|(?:OLG|LG|AG|VG|OVG|ArbG|LAG|FG)\\s+[\\w\\u00C0-\\u024F-]+";
  const vollAzMatch = raw.match(
    new RegExp(`^(${COURT_RE})[,\\s]+(?:Urt\\.|Beschl\\.|Bes\\.)?\\s*v\\.?\\s*(\\d{1,2}\\.\\d{1,2}\\.\\d{4})\\s*[–—-]\\s*([IVX\\d]+\\s+\\w+\\s+\\d+\\/\\d+[a-z]*)`, "i"),
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
    new RegExp(`^(${COURT_RE})\\s+([IVX\\d]+\\s+\\w+\\s+\\d+\\/\\d+[a-z]*|\\d+\\s+\\w+\\s+\\d+\\/\\d+[a-z]*)`, "i"),
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
    /^(BGH|BVerfG|BAG|BVerwG|BFH|BSG|BPatG|OLG\s+[\w\u00C0-\u024F-]+|AG\s+[\w\u00C0-\u024F-]+|LG\s+[\w\u00C0-\u024F-]+)[\s,]+(\w+(?:-\w+)?)\s+(\d{4}),?\s*(\d+)/i,
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
    } catch {}
    return { ...base, gefunden: false, confidence: "hallucination_risk", fehler: `Dokumentnummer ${parsed.neurisNr} nicht in NeuRIS gefunden.` };
  }

  // Aktenzeichen-Suche
  if (parsed.typ === "aktenzeichen" && parsed.gericht && parsed.aktenzeichen) {
    const courtCode = GERICHTE_MAP[parsed.gericht];
    const requestedAz = normalizeAktenzeichen(parsed.aktenzeichen);
    try {
      const results: CaseLawSearchResult = await searchCaseLaw(
        parsed.aktenzeichen,
        courtCode || undefined,
        5,
      );
      const exactItem = results.items.find((it) =>
        it.fileNumbers.some((fileNumber) => normalizeAktenzeichen(fileNumber) === requestedAz),
      );
      const dateMatches = !parsed.datum || exactItem?.decisionDate === parsed.datum;
      if (exactItem && dateMatches) {
        const preview = exactItem.textMatches?.[0]?.text?.slice(0, 300) ?? "";
        const matchedAz = exactItem.fileNumbers.find((fileNumber) => normalizeAktenzeichen(fileNumber) === requestedAz)
          ?? parsed.aktenzeichen;
        return {
          ...base,
          gefunden: true,
          confidence: "high",
          normalisiertesZitat: `${parsed.gericht}, ${parsed.datum ? `Urt. v. ${parsed.datum} – ` : ""}${matchedAz}`,
          entscheidung: {
            gericht: parsed.gericht,
            aktenzeichen: matchedAz,
            datum: exactItem.decisionDate ?? parsed.datum ?? undefined,
            dokumentnummer: exactItem.documentNumber,
            kurzinhalt: preview || exactItem.headline?.slice(0, 300) || undefined,
          },
        };
      }
      if (exactItem && parsed.datum && exactItem.decisionDate && exactItem.decisionDate !== parsed.datum) {
        return {
          ...base,
          gefunden: true,
          confidence: "medium",
          fehler: `Aktenzeichen ${parsed.aktenzeichen} wurde gefunden, aber mit abweichendem Entscheidungsdatum (${exactItem.decisionDate} statt ${parsed.datum}).`,
          hinweis: "Bitte Datum im Originalzitat gegen NeuRIS prüfen.",
        };
      }
    } catch {}
    // OLG/LG/AG: NeuRIS covers federal courts only — not hallucination, just outside DB scope
    const isNonFederal = /^(OLG|LG|AG|VG|OVG|ArbG|LAG|FG)\s/i.test(parsed.gericht);

    // Try Open Legal Data for non-federal courts
    if (isNonFederal) {
      try {
        const oldResult = await searchByAktenzeichen(parsed.aktenzeichen!, 10);
        const exactMatch = oldResult.results.find((match) => {
          const azMatches = normalizeAktenzeichen(match.file_number) === requestedAz;
          const courtOk = courtMatches(parsed.gericht!, match.court.name);
          const dateOk = !parsed.datum || match.date === parsed.datum;
          return azMatches && courtOk && dateOk;
        });
        if (exactMatch) {
          return {
            ...base,
            gefunden: true,
            confidence: "high",
            normalisiertesZitat: `${exactMatch.court.name}, ${exactMatch.date} – ${exactMatch.file_number}`,
            entscheidung: {
              gericht: exactMatch.court.name,
              datum: exactMatch.date,
              aktenzeichen: exactMatch.file_number,
              kurzinhalt: `Verified via Open Legal Data (${exactMatch.type}, ECLI: ${exactMatch.ecli || "n/a"})`,
            },
            hinweis: `Quelle: de.openlegaldata.io (352.000+ Entscheidungen). Gericht, Datum und Aktenzeichen stimmen überein.`,
          };
        }

        const looseMatch = oldResult.results.find((match) =>
          normalizeAktenzeichen(match.file_number) === requestedAz,
        );
        if (looseMatch) {
          return {
            ...base,
            gefunden: true,
            confidence: "medium",
            normalisiertesZitat: `${looseMatch.court.name}, ${looseMatch.date} – ${looseMatch.file_number}`,
            entscheidung: {
              gericht: looseMatch.court.name,
              datum: looseMatch.date,
              aktenzeichen: looseMatch.file_number,
              kurzinhalt: `Aktenzeichen via Open Legal Data gefunden (${looseMatch.type}, ECLI: ${looseMatch.ecli || "n/a"})`,
            },
            hinweis: `Aktenzeichen gefunden, aber Gericht und/oder Datum weichen vom Zitat ab. Bitte Originalfundstelle manuell prüfen.`,
          };
        }
      } catch {
        // OLD API failed — fall through to medium confidence
      }
    }

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
    } catch {}
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
