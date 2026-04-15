/**
 * get-norm-context.ts
 *
 * Normenumfeld — gibt den vollständigen rechtlichen Kontext
 * einer Vorschrift zurück:
 *
 * 1. Aktueller Normtext (GII)
 * 2. Systematische Einordnung (benachbarte §§, Abschnitt)
 * 3. Verwandte Normen (Verweise, Gegennormen)
 * 4. Wichtige BGH-Entscheidungen zu dieser Norm (NeuRIS)
 * 5. Praxishinweise (typische Anwendungsfälle)
 */

import { z } from "zod";
import { getLawSection } from "../lib/gii-client.js";
import { searchCaseLaw } from "../lib/neuris-client.js";

// ── Normen-Wissensbasis ───────────────────────────────────────────────────

interface NormKontext {
  name: string;
  abschnitt: string;
  benachbarte: string[];      // §§ die typischerweise gemeinsam geprüft werden
  verwandte: string[];         // Verweisstruktur
  typAnwendung: string[];      // Typische Anwendungsfälle
  leitsatzSuche: string;       // Suchbegriff für BGH-Leitentscheidungen
  palandt?: string;            // Palandt/Grüneberg-Annotation (grob)
}

const NORM_KONTEXT_DB: Record<string, NormKontext> = {
  // BGB — Kaufrecht
  "bgb:437": {
    name: "Rechte des Käufers bei Mängeln",
    abschnitt: "BGB Kaufrecht — Gewährleistung (§§ 434–442)",
    benachbarte: ["§ 434 BGB", "§ 438 BGB", "§ 439 BGB", "§ 440 BGB", "§ 441 BGB", "§ 444 BGB"],
    verwandte: ["§ 280 BGB", "§ 281 BGB", "§ 323 BGB", "§ 346 BGB"],
    typAnwendung: [
      "Gebrauchtwagenkauf mit versteckten Mängeln",
      "Online-Kauf defekter Elektronikartikel",
      "Verbrauchsgüterkauf (§ 477 BGB — Beweislastumkehr binnen 1 Jahr seit Gefahrübergang)",
    ],
    leitsatzSuche: "Sachmangel Kaufvertrag Gewährleistung",
    palandt: "§ 437 BGB ist die Verweisungsnorm — Ansprüche entstehen erst durch die jeweiligen Folgeparagrafen. Keine eigene Rechtsfolge.",
  },
  "bgb:242": {
    name: "Leistung nach Treu und Glauben",
    abschnitt: "BGB Allgemeines Schuldrecht — Inhalt der Schuldverhältnisse (§§ 241–304)",
    benachbarte: ["§ 241 BGB", "§ 243 BGB", "§ 275 BGB", "§ 313 BGB", "§ 314 BGB"],
    verwandte: ["§ 157 BGB (Auslegung)", "§ 826 BGB (Sittenwidrigkeit)"],
    typAnwendung: [
      "Verwirkung von Ansprüchen (Zeitmoment + Umstandsmoment)",
      "Venire contra factum proprium (widersprüchliches Verhalten)",
      "Störung der Geschäftsgrundlage (§ 313 BGB als Spezialregelung)",
      "Generalklausel für Nebenpflichten (§ 241 Abs. 2 BGB)",
    ],
    leitsatzSuche: "Treu und Glauben § 242 BGB Verwirkung",
    palandt: "§ 242 BGB als Korrekturinstrument — subsidiär gegenüber Spezialvorschriften. BGH wendet zurückhaltend an.",
  },
  "bgb:823": {
    name: "Schadensersatzpflicht (Deliktsrecht)",
    abschnitt: "BGB Unerlaubte Handlungen (§§ 823–853)",
    benachbarte: ["§ 824 BGB", "§ 826 BGB", "§ 831 BGB", "§ 840 BGB", "§ 843 BGB"],
    verwandte: ["§ 249 BGB (Naturalrestitution)", "§ 253 BGB (Schmerzensgeld)", "§ 254 BGB (Mitverschulden)", "§ 276 BGB (Verschulden)"],
    typAnwendung: [
      "Verkehrsunfall — Körperverletzung und Sachschaden",
      "Ärztlicher Behandlungsfehler (§ 630a BGB als Spezialregelung)",
      "Produkthaftung (ProdHaftG als Spezialgesetz)",
      "Verletzung des allgemeinen Persönlichkeitsrechts (§ 823 Abs. 1 i.V.m. Art. 2 Abs. 1 GG)",
    ],
    leitsatzSuche: "§ 823 BGB Schadensersatz Körperverletzung",
    palandt: "Drei Anspruchsgrundlagen: Abs. 1 (absolutes Rechtsgut), Abs. 2 (Schutzgesetz), § 826 (Sittenwidrigkeit). Je nach Sachverhalt unterschiedliche Beweisanforderungen.",
  },
  "bgb:280": {
    name: "Schadensersatz wegen Pflichtverletzung",
    abschnitt: "BGB Allgemeines Schuldrecht — Pflichtverletzung (§§ 280–286)",
    benachbarte: ["§ 281 BGB", "§ 282 BGB", "§ 283 BGB", "§ 284 BGB", "§ 286 BGB"],
    verwandte: ["§ 241 Abs. 2 BGB (Schutzpflichten)", "§ 276 BGB (Verschulden)", "§ 311 BGB (Schuldverhältnisse)"],
    typAnwendung: [
      "Schlechtleistung / mangelhafte Leistung (zusammen mit §§ 437, 634 BGB)",
      "Nebenpflichtverletzung (positive Forderungsverletzung)",
      "Culpa in contrahendo (§ 311 Abs. 2, 3 BGB)",
    ],
    leitsatzSuche: "Pflichtverletzung Schadensersatz § 280 BGB",
    palandt: "Grundtatbestand des vertraglichen Schadensersatzes — gilt für alle Schuldverhältnisse. Verschulden wird vermutet (§ 280 Abs. 1 S. 2 BGB).",
  },
  "bgb:626": {
    name: "Fristlose Kündigung aus wichtigem Grund",
    abschnitt: "BGB Arbeitsrecht / Dienstverhältnis (§§ 611–630 BGB; KSchG)",
    benachbarte: ["§ 620 BGB", "§ 622 BGB", "§ 627 BGB", "§ 628 BGB"],
    verwandte: ["§ 1 KSchG", "§ 4 KSchG (3-Wochen-Frist)", "§ 102 BetrVG"],
    typAnwendung: [
      "Fristlose Kündigung wegen Diebstahl / Untreue",
      "Fristlose Kündigung wegen schwerer Beleidigung / sexueller Belästigung",
      "Fristlose Kündigung bei dauerhafter Arbeitsverweigerung",
      "2-Wochen-Ausschlussfrist (§ 626 Abs. 2 BGB) beachten!",
    ],
    leitsatzSuche: "fristlose Kündigung wichtiger Grund § 626 BGB",
    palandt: "Zweistufige Prüfung: (1) objektiv wichtiger Grund, (2) Unzumutbarkeit. 2-Wochen-Frist ist Ausschlussfrist.",
  },
  // StGB
  "stgb:263": {
    name: "Betrug",
    abschnitt: "StGB — Vermögensdelikte (§§ 242–266b StGB)",
    benachbarte: ["§ 264 StGB", "§ 265 StGB", "§ 266 StGB"],
    verwandte: ["§ 22 StGB (Versuch)", "§ 26 StGB (Anstiftung)", "§ 27 StGB (Beihilfe)"],
    typAnwendung: [
      "Internetbetrug (Online-Shopping ohne Zahlungsabsicht)",
      "Prozessbetrug (falsche Angaben gegenüber Gericht)",
      "Subventionsbetrug (§ 264 StGB als Spezialvorschrift)",
    ],
    leitsatzSuche: "Betrug § 263 StGB Täuschung Vermögensschaden",
    palandt: "5-gliedriger Tatbestand: Täuschung → Irrtum → Verfügung → Vermögensschaden → Bereicherungsabsicht. Alle kausal verknüpft.",
  },
};

function getKontextKey(gesetz: string, paragraph: string): string {
  return `${gesetz.toLowerCase()}:${paragraph.replace(/^§\s*/, "").toLowerCase()}`;
}

// ── Schema ────────────────────────────────────────────────────────────────

export const getNormContextSchema = z.object({
  gesetz: z
    .string()
    .describe("Gesetz-Abkürzung (z.B. 'BGB', 'StGB', 'ZPO', 'GG', 'HGB')"),
  paragraph: z
    .string()
    .describe("Paragraphennummer ohne §-Zeichen (z.B. '242', '437', '823', '1')"),
  mit_urteilen: z
    .boolean()
    .default(true)
    .describe("Ob BGH-Leitentscheidungen via NeuRIS abgerufen werden sollen (Standard: true)"),
  max_urteile: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Maximale Anzahl BGH-Urteile (Standard: 5)"),
});

export type GetNormContextInput = z.infer<typeof getNormContextSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function getNormContext(input: GetNormContextInput): Promise<string> {
  const lines: string[] = [];
  const key = getKontextKey(input.gesetz, input.paragraph);
  const kontext = NORM_KONTEXT_DB[key];

  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║          NORMENUMFELD — Vollständiger Rechtskontext       ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Norm: § ${input.paragraph} ${input.gesetz.toUpperCase()}`);
  if (kontext) {
    lines.push(`  ${kontext.name}`);
    lines.push(`  Abschnitt: ${kontext.abschnitt}`);
  }
  lines.push("");

  // 1. Aktueller Normtext
  lines.push("  ── [1] AKTUELLER NORMTEXT (gesetze-im-internet.de) ─────");
  try {
    const section = await getLawSection(input.gesetz.toUpperCase(), input.paragraph);
    lines.push(`\n  ${section.content.slice(0, 1500)}`);
    if (section.content.length > 1500) lines.push("  [... Volltext via get_law_section abrufbar]");
  } catch (_) {
    lines.push(`  ⚠  Normtext nicht abrufbar (${input.gesetz.toUpperCase()} § ${input.paragraph})`);
    lines.push("     Bitte Abkürzung prüfen oder get_law_section verwenden.");
  }
  lines.push("");

  // 2. Systematische Einordnung
  if (kontext) {
    lines.push("  ── [2] SYSTEMATISCHE EINORDNUNG ──────────────────────");
    lines.push("");
    lines.push("  Benachbarte Normen (typisch gemeinsam geprüft):");
    for (const n of kontext.benachbarte) {
      lines.push(`  → ${n}`);
    }
    lines.push("");
    lines.push("  Verwandte Normen (Verweise / Gegennormen):");
    for (const n of kontext.verwandte) {
      lines.push(`  ↔ ${n}`);
    }
    lines.push("");

    // 3. Typische Anwendungsfälle
    lines.push("  ── [3] TYPISCHE ANWENDUNGSFÄLLE ──────────────────────");
    for (const anw of kontext.typAnwendung) {
      lines.push(`  ✦ ${anw}`);
    }
    lines.push("");

    // 4. Kommentar-Hinweis
    if (kontext.palandt) {
      lines.push("  ── [4] KOMMENTAR-POSITION (Grüneberg/Palandt) ────────");
      lines.push(`  ${kontext.palandt}`);
      lines.push("");
    }
  } else {
    lines.push("  ── [2] SYSTEMATISCHE EINORDNUNG ──────────────────────");
    lines.push(`  (Kein Kontexteintrag für § ${input.paragraph} ${input.gesetz.toUpperCase()} in der Wissensbasis.)`);
    lines.push("  Tipp: Verwandte Normen per get_law_section oder search_law ermitteln.");
    lines.push("");
  }

  // 5. BGH-Leitentscheidungen
  if (input.mit_urteilen) {
    lines.push("  ── [5] BGH/BVerfG-LEITENTSCHEIDUNGEN (NeuRIS) ────────");
    lines.push("");
    try {
      const suchbegriff = kontext?.leitsatzSuche
        ?? `§ ${input.paragraph} ${input.gesetz.toUpperCase()}`;

      // Hauptgericht je nach Rechtsgebiet
      const courtCode = input.gesetz.toUpperCase() === "GG" ? "bverfg"
        : input.gesetz.toUpperCase() === "StGB" ? "bgh"
        : "bgh";

      const result = await searchCaseLaw(suchbegriff, courtCode, input.max_urteile);

      if (result.totalItems > 0) {
        lines.push(`  Gefunden: ${result.totalItems} Entscheidungen (Top ${result.items.length}):`);
        lines.push("");
        for (const urteil of result.items) {
          lines.push(`  ▸ ${urteil.courtName ?? "?"} — ${urteil.fileNumbers.join(", ") || "Az. unbekannt"}`);
          lines.push(`    Datum: ${urteil.decisionDate ?? "?"} | Typ: ${urteil.documentType ?? "?"}`);
          lines.push(`    Dokumentnr.: ${urteil.documentNumber}`);
          const snippet = urteil.textMatches?.[0]?.text?.replace(/<[^>]+>/g, "").slice(0, 150);
          if (snippet) lines.push(`    „${snippet}..."`);
          lines.push("");
        }
        lines.push("  → Volltext: analyze_case oder get_case_text mit Dokumentnummer");
      } else {
        lines.push(`  (Keine Treffer für '${suchbegriff}' — breiteren Suchbegriff versuchen)`);
      }
    } catch (_) {
      lines.push("  (BGH-Suche fehlgeschlagen — NeuRIS möglicherweise nicht erreichbar)");
    }
  }

  lines.push("  ═══════════════════════════════════════════════════════");
  lines.push("  NÄCHSTE SCHRITTE:");
  lines.push("  → spot_issues: Sachverhalt auf relevante Normen prüfen");
  lines.push("  → gutachten_scaffold: Gutachtenstil-Gerüst erstellen");
  lines.push("  → get_norm_version: Historischen Stand der Norm abrufen");

  return lines.join("\n");
}
