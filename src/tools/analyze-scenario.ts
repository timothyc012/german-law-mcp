/**
 * analyze-scenario.ts
 *
 * Szenario-Analyse: Strukturierter juristischer Sachverhaltstest
 *
 * Nimmt einen Sachverhalt entgegen und gibt zurück:
 * 1. Erkannte Rechtsgebiete
 * 2. Potenzielle Anspruchsgrundlagen (mit Begründung)
 * 3. Gegenargumente / Risiken
 * 4. Empfohlene Prüfungsreihenfolge
 * 5. Erforderliche Beweise
 * 6. Typischer Verfahrensweg
 */

import { z } from "zod";

// ── Sachverhalts-Pattern-Erkennung ────────────────────────────────────────

interface AnspruchsGrundlage {
  norm: string;
  beschreibung: string;
  voraussetzungen: string[];
  risiken: string[];
  erfolgschance: "hoch" | "mittel" | "gering" | "unklar";
}

interface Rechtsgebiet {
  name: string;
  normen: string[];
  stichworte: string[];
}

const RECHTSGEBIETE: Rechtsgebiet[] = [
  {
    name: "Kaufrecht / Gewährleistung",
    normen: ["§§ 433 ff. BGB", "§§ 434 ff. BGB", "§ 437 BGB"],
    stichworte: ["kauf", "kaufvertrag", "mangel", "defekt", "gewährleistung", "rückgabe", "auto", "fahrzeug", "ware", "produkt", "verkäufer", "käufer"],
  },
  {
    name: "Mietrecht",
    normen: ["§§ 535 ff. BGB", "§§ 556 ff. BGB", "§ 573 BGB"],
    stichworte: ["miete", "mieter", "vermieter", "wohnung", "kündigung", "nebenkosten", "kaution", "schönheitsreparatur", "mietverhältnis"],
  },
  {
    name: "Arbeitsrecht",
    normen: ["§§ 611a ff. BGB", "§ 1 KSchG", "§ 626 BGB", "§ 102 BetrVG"],
    stichworte: ["arbeit", "arbeitnehmer", "arbeitgeber", "kündigung", "entlassung", "abmahnung", "lohn", "gehalt", "urlaub", "überstunden", "betriebsrat"],
  },
  {
    name: "Deliktsrecht / Schadensersatz",
    normen: ["§ 823 BGB", "§ 826 BGB", "§ 249 BGB", "§ 253 BGB"],
    stichworte: ["unfall", "verletzung", "schaden", "schadensersatz", "schmerzensgeld", "körperverletzung", "sachschaden", "fahrlässigkeit", "vorsatz"],
  },
  {
    name: "Strafrecht",
    normen: ["§§ 242 ff. StGB", "§ 263 StGB", "§§ 223 ff. StGB"],
    stichworte: ["strafbar", "diebstahl", "betrug", "körperverletzung", "beleidigung", "nötigung", "bedrohung", "anzeige", "strafanzeige", "strafrecht"],
  },
  {
    name: "Vertragsrecht (allgemein)",
    normen: ["§§ 145 ff. BGB", "§§ 241 ff. BGB", "§§ 280 ff. BGB"],
    stichworte: ["vertrag", "vertragsschluss", "rücktritt", "kündigung", "schadensersatz", "pflichtverletzung", "mahnung"],
  },
  {
    name: "Erbrecht",
    normen: ["§§ 1922 ff. BGB", "§ 2303 BGB", "§ 2229 BGB"],
    stichworte: ["erbe", "erbschaft", "testament", "pflichtteil", "erblasser", "nachlass", "erbvertrag"],
  },
  {
    name: "Gesellschaftsrecht",
    normen: ["§§ 705 ff. BGB", "GmbHG", "AktG", "HGB §§ 105 ff."],
    stichworte: ["gmbh", "ag", "gesellschaft", "gesellschafter", "geschäftsführer", "haftung", "insolvenz"],
  },
  {
    name: "Datenschutzrecht",
    normen: ["Art. 6 DSGVO", "Art. 17 DSGVO", "Art. 82 DSGVO", "§§ 1 ff. BDSG"],
    stichworte: ["datenschutz", "dsgvo", "daten", "verarbeitung", "löschung", "auskunft", "einwilligung"],
  },
  {
    name: "Verwaltungsrecht",
    normen: ["§§ 1 ff. VwGO", "§§ 1 ff. VwVfG"],
    stichworte: ["behörde", "bescheid", "verwaltungsakt", "widerspruch", "genehmigung", "baugenehmigung", "verwaltungsgericht"],
  },
];

// ── Anspruchs-Muster ──────────────────────────────────────────────────────

interface AnspruchsMuster {
  stichworte: string[];
  anspruch: AnspruchsGrundlage;
}

const ANSPRUCHSMUSTER: AnspruchsMuster[] = [
  {
    stichworte: ["mangel", "defekt", "kaputt", "kauf", "gekauft"],
    anspruch: {
      norm: "§ 437 Nr. 2 BGB i.V.m. § 323 BGB — Rücktritt",
      beschreibung: "Käufer kann vom Kaufvertrag zurücktreten, wenn Sache mangelhaft und Nachfrist erfolglos abgelaufen ist.",
      voraussetzungen: [
        "Wirksamer Kaufvertrag (§ 433 BGB)",
        "Sachmangel bei Gefahrübergang (§ 434 BGB)",
        "Erfolglose Nachfristsetzung (§ 439 BGB) — mindestens 2 Wochen",
        "Rücktrittserklärung (§ 349 BGB)",
      ],
      risiken: [
        "Verjährung: 2 Jahre ab Lieferung (§ 438 Abs. 1 Nr. 3 BGB)",
        "Ausschluss bei Kenntnis des Mangels beim Kauf (§ 442 BGB)",
        "Bei Gebrauchtwagenkauf: OEM-Ausschlüsse möglich (aber nicht bei Verbrauchern!)",
      ],
      erfolgschance: "mittel",
    },
  },
  {
    stichworte: ["mangel", "kauf", "schadensersatz"],
    anspruch: {
      norm: "§ 437 Nr. 3 BGB i.V.m. §§ 280, 281 BGB — Schadensersatz",
      beschreibung: "Schadensersatz statt der Leistung bei mangelhafter Kaufsache.",
      voraussetzungen: [
        "Wirksamer Kaufvertrag",
        "Sachmangel (§ 434 BGB)",
        "Verschulden des Verkäufers (§ 276 BGB) — wird vermutet (§ 280 Abs. 1 S. 2 BGB)",
        "Schaden und Kausalität",
      ],
      risiken: [
        "Nachweis des Schadens — konkreter Berechnungsweg nötig",
        "Mitverschulden (§ 254 BGB) bei Unterlassen der Mängelrüge",
      ],
      erfolgschance: "mittel",
    },
  },
  {
    stichworte: ["kündigung", "arbeit", "arbeitnehmer", "entlassung"],
    anspruch: {
      norm: "§ 4 S. 1 KSchG — Kündigungsschutzklage",
      beschreibung: "Arbeitnehmer kann Unwirksamkeit der Kündigung gerichtlich feststellen lassen.",
      voraussetzungen: [
        "Klage beim Arbeitsgericht innerhalb von 3 Wochen nach Zugang der Kündigung (§ 4 KSchG — Ausschlussfrist!)",
        "Arbeitsverhältnis > 6 Monate (§ 1 Abs. 1 KSchG)",
        "Betrieb mit > 10 Arbeitnehmern (§ 23 KSchG)",
        "Kündigung sozial ungerechtfertigt (§ 1 Abs. 2 KSchG)",
      ],
      risiken: [
        "Versäumte 3-Wochen-Frist = Kündigung gilt als wirksam!",
        "Kleinbetrieb-Ausnahme (§ 23 KSchG)",
        "Außerordentliche Kündigung (§ 626 BGB) schwerer angreifbar",
      ],
      erfolgschance: "mittel",
    },
  },
  {
    stichworte: ["unfall", "verletzung", "fahrrad", "auto", "fahrzeug", "schaden"],
    anspruch: {
      norm: "§ 823 Abs. 1 BGB — Schadensersatz aus unerlaubter Handlung",
      beschreibung: "Schadensersatz bei widerrechtlicher Verletzung eines absoluten Rechtsguts.",
      voraussetzungen: [
        "Verletzung eines absoluten Rechtsguts (Körper, Gesundheit, Eigentum)",
        "Kausalität (haftungsbegründend + haftungsausfüllend)",
        "Rechtswidrigkeit",
        "Verschulden (§ 276 BGB — Vorsatz oder Fahrlässigkeit)",
        "Schaden (§ 249 ff. BGB)",
      ],
      risiken: [
        "Mitverschulden (§ 254 BGB) reduziert Ersatzanspruch",
        "Bei Kfz: StVG (Gefährdungshaftung) oft günstiger als § 823 BGB",
        "Verjährung: 3 Jahre ab Kenntnis (§ 195, 199 BGB)",
      ],
      erfolgschance: "hoch",
    },
  },
  {
    stichworte: ["miete", "kündigung", "vermieter", "mietvertrag"],
    anspruch: {
      norm: "§ 574 BGB — Widerspruch gegen Kündigung (Härteklausel)",
      beschreibung: "Mieter kann Widerspruch gegen ordentliche Kündigung erheben, wenn Beendigung eine besondere Härte bedeuten würde.",
      voraussetzungen: [
        "Wirksame ordentliche Kündigung (§ 573 BGB)",
        "Widerspruch spätestens 2 Monate vor Beendigung (§ 574b BGB)",
        "Unzumutbare Härte (Alter, Krankheit, fehlender Ersatzwohnraum)",
      ],
      risiken: [
        "Nur bei ordentlicher Kündigung — nicht bei fristloser Kündigung",
        "Härteklausel wird von Gerichten restriktiv ausgelegt",
        "Fristversäumnis = Verlust des Widerspruchsrechts",
      ],
      erfolgschance: "gering",
    },
  },
  {
    stichworte: ["betrug", "täuschung", "geld", "bezahlt", "nicht erhalten"],
    anspruch: {
      norm: "§ 263 StGB — Betrug (Strafanzeige) + § 823 Abs. 2 BGB i.V.m. § 263 StGB (zivilrechtl. Schadensersatz)",
      beschreibung: "Strafanzeige + paralleler zivilrechtlicher Schadensersatz bei betrügerischem Handeln.",
      voraussetzungen: [
        "Täuschungshandlung",
        "Irrtumserregung beim Geschädigten",
        "Vermögensverfügung",
        "Vermögensschaden",
        "Bereicherungsabsicht und Vorsatz",
      ],
      risiken: [
        "Beweisführung: Vorsatz muss nachgewiesen werden",
        "Zivilrechtlicher Weg oft schneller (Mahnbescheid)",
        "Staatsanwaltschaft stellt ein bei geringem Schaden",
      ],
      erfolgschance: "mittel",
    },
  },
];

// ── Erkennungslogik ───────────────────────────────────────────────────────

function erkenneRechtsgebiete(sachverhalt: string): Rechtsgebiet[] {
  const lower = sachverhalt.toLowerCase();
  const treffer: Array<{ gebiet: Rechtsgebiet; score: number }> = [];

  for (const gebiet of RECHTSGEBIETE) {
    let score = 0;
    for (const sw of gebiet.stichworte) {
      if (lower.includes(sw)) score++;
    }
    if (score > 0) treffer.push({ gebiet, score });
  }

  return treffer
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((t) => t.gebiet);
}

function erkenneAnsprueche(sachverhalt: string): AnspruchsGrundlage[] {
  const lower = sachverhalt.toLowerCase();
  const treffer: Array<{ anspruch: AnspruchsGrundlage; score: number }> = [];

  for (const muster of ANSPRUCHSMUSTER) {
    let score = 0;
    for (const sw of muster.stichworte) {
      if (lower.includes(sw)) score++;
    }
    if (score >= 2) {
      treffer.push({ anspruch: muster.anspruch, score });
    }
  }

  return treffer
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((t) => t.anspruch);
}

function ermittleVerfahrensweg(rechtsgebiete: Rechtsgebiet[]): string {
  const namen = rechtsgebiete.map((r) => r.name.toLowerCase());

  if (namen.some((n) => n.includes("straf"))) {
    return "Strafanzeige bei Polizei oder Staatsanwaltschaft → Ermittlungsverfahren → ggf. Klage";
  }
  if (namen.some((n) => n.includes("arbeit"))) {
    return "Klage beim Arbeitsgericht (kein Anwaltszwang in 1. Instanz) — 3-Wochen-Frist beachten!";
  }
  if (namen.some((n) => n.includes("verwaltung"))) {
    return "Widerspruch beim Verwaltungsakt → Widerspruchsbescheid → Verwaltungsgericht";
  }
  if (namen.some((n) => n.includes("miet"))) {
    return "Außergerichtliche Einigung → ggf. Mahnbescheid (AG) → Amtsgericht (Streitwert < 5.000€) / LG";
  }
  return "Mahnbescheid (AG) oder Klage beim Amtsgericht (bis 5.000€) / Landgericht (ab 5.001€)";
}

// ── Schema ────────────────────────────────────────────────────────────────

export const analyzeScenarioSchema = z.object({
  sachverhalt: z
    .string()
    .min(20)
    .max(5000)
    .describe(
      "Freier Text des Sachverhalts auf Deutsch. Möglichst konkret: " +
      "Wer hat was wann getan? Was ist das Begehren? " +
      "Beispiel: 'Ich habe ein Auto für 8.000€ gekauft. 2 Wochen nach dem Kauf " +
      "stellt sich heraus, dass der Motor defekt ist. Der Verkäufer lehnt Reparatur ab.'",
    ),
  perspektive: z
    .enum(["kläger", "beklagter", "neutral"])
    .default("neutral")
    .describe(
      "Aus wessen Perspektive soll analysiert werden? " +
      "'kläger' = maximale Ansprüche herausarbeiten, " +
      "'beklagter' = Verteidigungsstrategie, " +
      "'neutral' = beide Seiten",
    ),
  tiefe: z
    .enum(["schnell", "vollständig"])
    .default("vollständig")
    .describe(
      "'schnell': Nur Rechtsgebiete + Top-3-Ansprüche. " +
      "'vollständig': Vollanalyse mit Verfahrensweg und Beweishinweisen.",
    ),
});

export type AnalyzeScenarioInput = z.infer<typeof analyzeScenarioSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function analyzeScenario(input: AnalyzeScenarioInput): Promise<string> {
  const lines: string[] = [];

  const rechtsgebiete = erkenneRechtsgebiete(input.sachverhalt);
  const ansprueche = erkenneAnsprueche(input.sachverhalt);

  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║          SACHVERHALTSANALYSE — Juristische Auswertung     ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push("  ⚠  WICHTIG: Kein Rechtsrat — nur Orientierungshilfe.");
  lines.push("     Für verbindliche Auskunft: Anwalt oder Rechtsanwaltskammer");
  lines.push("");

  // Sachverhalt-Zusammenfassung
  lines.push("  ── SACHVERHALT ───────────────────────────────────────────");
  lines.push(`  ${input.sachverhalt.slice(0, 300)}${input.sachverhalt.length > 300 ? "..." : ""}`);
  lines.push(`  Perspektive: ${input.perspektive}`);
  lines.push("");

  // Erkannte Rechtsgebiete
  lines.push("  ── [1] ERKANNTE RECHTSGEBIETE ───────────────────────────");
  if (rechtsgebiete.length === 0) {
    lines.push("  (Keine eindeutigen Rechtsgebiete erkannt — Sachverhalt ggf. präzisieren)");
  } else {
    for (const rg of rechtsgebiete) {
      lines.push(`  ✦ ${rg.name}`);
      lines.push(`    Normen: ${rg.normen.join(", ")}`);
    }
  }
  lines.push("");

  // Anspruchsgrundlagen
  lines.push("  ── [2] POTENZIELLE ANSPRUCHSGRUNDLAGEN ──────────────────");
  lines.push("");

  if (ansprueche.length === 0) {
    lines.push("  (Keine Anspruchsmuster erkannt. Tipps:");
    lines.push("   → Konkreteres Stichwort verwenden (z.B. 'Mietvertrag' statt 'Wohnung')");
    lines.push("   → get_norm_context für Einzelnorm-Analyse verwenden)");
  } else {
    for (let i = 0; i < ansprueche.length; i++) {
      const a = ansprueche[i];
      const ampel = a.erfolgschance === "hoch" ? "🟢"
        : a.erfolgschance === "mittel" ? "🟡"
        : a.erfolgschance === "gering" ? "🔴" : "⚪";

      lines.push(`  [${i + 1}] ${a.norm}`);
      lines.push(`      ${ampel} Erfolgschance: ${a.erfolgschance.toUpperCase()}`);
      lines.push(`      ${a.beschreibung}`);
      lines.push("");
      lines.push("      Voraussetzungen:");
      for (const v of a.voraussetzungen) {
        lines.push(`        ✓ ${v}`);
      }
      lines.push("");
      lines.push("      Risiken / Einwände:");
      for (const r of a.risiken) {
        lines.push(`        ⚡ ${r}`);
      }
      lines.push("");
    }
  }

  if (input.tiefe === "vollständig") {
    // Verteidigungsargumente (bei beklagter Perspektive oder neutral)
    if (input.perspektive !== "kläger" && ansprueche.length > 0) {
      lines.push("  ── [3] VERTEIDIGUNGSARGUMENTE ───────────────────────────");
      lines.push("  Typische Gegenargumente des Beklagten:");
      for (const a of ansprueche.slice(0, 2)) {
        for (const r of a.risiken) {
          lines.push(`  → ${r}`);
        }
      }
      lines.push("");
    }

    // Beweismittel
    lines.push("  ── [4] WICHTIGE BEWEISMITTEL ────────────────────────────");
    lines.push("  Allgemein relevante Dokumente:");
    lines.push("  → Verträge, Rechnungen, Quittungen (Beweisdokumente)");
    lines.push("  → Schriftverkehr (E-Mail, WhatsApp, Briefe)");
    lines.push("  → Fotos / Videos von Schäden oder Zustand");
    lines.push("  → Zeugen (Namen + Kontaktdaten sichern!)");
    lines.push("  → Arzt-/Reparaturberichte, Sachverständigengutachten");
    lines.push("");

    // Verfahrensweg
    lines.push("  ── [5] EMPFOHLENER VERFAHRENSWEG ────────────────────────");
    lines.push(`  ${ermittleVerfahrensweg(rechtsgebiete)}`);
    lines.push("");
    lines.push("  Allgemeine Schritte:");
    lines.push("  1. Außergerichtlich: Schriftliche Aufforderung mit Fristsetzung");
    lines.push("  2. Schlichtung: ggf. Verbraucherschlichtung / Ombudsmann");
    lines.push("  3. Gerichtlich: Mahnbescheid (schnell) oder Klage (genau)");
    lines.push("  4. Vollstreckung: Pfändungs- und Überweisungsbeschluss");
    lines.push("");

    // Nächste Schritte
    lines.push("  ── [6] NÄCHSTE SCHRITTE (MCP-Tools) ─────────────────────");
    if (rechtsgebiete.length > 0) {
      const erstesGesetz = rechtsgebiete[0].normen[0]?.match(/§§?\s*(\d+[a-z]?)\s+(\w+)/i);
      if (erstesGesetz) {
        lines.push(`  → get_norm_context: § ${erstesGesetz[1]} ${erstesGesetz[2]} — Normenumfeld`);
      }
    }
    lines.push("  → gutachten_scaffold: Rechtsgutachten-Gerüst erstellen");
    lines.push("  → search_case_law: BGH-Urteile zu Ihrer Konstellation finden");
    lines.push("  → search_state_courts: OLG/LG-Urteile (openjur.de)");
  }

  lines.push("  ═══════════════════════════════════════════════════════");
  lines.push("  ⚖  Dieses Tool ersetzt keine Rechtsberatung.");
  lines.push("  Anwaltsuche: https://www.anwaltauskunft.de");

  return lines.join("\n");
}
