/**
 * compare-de-eu.ts
 *
 * Deutsch-EU-Rechtsvergleich
 *
 * Vergleicht deutsches Recht mit EU-Recht zu einem Thema:
 * 1. EU-Rechtsgrundlage (Verordnung / Richtlinie)
 * 2. Deutsche Umsetzungsnorm
 * 3. Abweichungen / Spielräume
 * 4. Anwendungsvorrang des EU-Rechts
 * 5. EuGH-Rechtsprechung
 * 6. Praktische Konsequenzen
 */

import { z } from "zod";
import { fetchByCelex, buildEurLexUrl, type EurLexDocument } from "../lib/eurlex-client.js";

// ── Vergleichsdatenbank ───────────────────────────────────────────────────

interface EuDeVergleich {
  thema: string;
  stichworte: string[];
  eu: {
    rechtsakt: string;
    artikel: string[];
    beschreibung: string;
    direktwirkung: boolean;
  };
  de: {
    norm: string;
    beschreibung: string;
    umsetzungsjahr?: number;
  };
  abweichungen: string[];
  vorrang: string;
  eugh: string[];
  praxis: string[];
}

const VERGLEICHSDATENBANK: EuDeVergleich[] = [
  {
    thema: "Datenschutz / DSGVO",
    stichworte: ["datenschutz", "dsgvo", "gdpr", "personenbezogen", "daten", "verarbeitung", "löschung", "auskunft", "cookie"],
    eu: {
      rechtsakt: "VO (EU) 2016/679 — Datenschutz-Grundverordnung (DSGVO)",
      artikel: ["Art. 6 (Rechtsgrundlagen)", "Art. 17 (Löschung)", "Art. 82 (Schadensersatz)", "Art. 83 (Bußgelder)"],
      beschreibung: "Unmittelbar anwendbare EU-Verordnung — gilt in allen Mitgliedstaaten ohne nationale Umsetzung.",
      direktwirkung: true,
    },
    de: {
      norm: "BDSG (Bundesdatenschutzgesetz) 2018",
      beschreibung: "Ergänzt und konkretisiert DSGVO für Deutschland. Enthält nationale Öffnungsklauseln (z.B. Beschäftigtendatenschutz § 26 BDSG).",
      umsetzungsjahr: 2018,
    },
    abweichungen: [
      "§ 26 BDSG: Beschäftigtendatenschutz — Deutschland nutzt Öffnungsklausel Art. 88 DSGVO",
      "§ 38 BDSG: Datenschutzbeauftragter ab 20 Personen (strengere DE-Regelung)",
      "§ 43 BDSG: Zusätzliche Bußgeldtatbestände",
      "Alter der Einwilligung: DE = 16 Jahre (DSGVO erlaubt 13–16)",
    ],
    vorrang: "DSGVO hat Anwendungsvorrang. Bei Konflikt gilt EU-Recht (Art. 23 AEUV). BDSG nur anwendbar soweit DSGVO Spielraum lässt.",
    eugh: [
      "EuGH C-131/12 (Google Spain, 2014) — Recht auf Vergessenwerden",
      "EuGH C-311/18 (Schrems II, 2020) — Privacy Shield ungültig",
      "EuGH C-683/21 (2023) — Haftung ohne konkreten Schaden möglich",
    ],
    praxis: [
      "Bußgelder: DSGVO Art. 83 — bis 20 Mio. € oder 4% des globalen Jahresumsatzes",
      "Aufsichtsbehörde DE: Bundesdatenschutzbeauftragte + 16 Landesdatenschutzbehörden",
      "Betroffenenrechte: Auskunft (Art. 15), Löschung (Art. 17), Widerspruch (Art. 21)",
    ],
  },
  {
    thema: "Verbraucherschutz / Kaufrecht",
    stichworte: ["verbraucher", "kaufrecht", "gewährleistung", "widerruf", "fernabsatz", "online", "garantie", "mangel"],
    eu: {
      rechtsakt: "RL 2019/771/EU — Warenkauf-Richtlinie (WKRL)",
      artikel: ["Art. 6 (Vertragsmäßigkeit)", "Art. 10 (Gewährleistung 2 Jahre)", "Art. 11 (Beweislastumkehr)"],
      beschreibung: "Richtlinie — musste bis 01.01.2022 in nationales Recht umgesetzt werden.",
      direktwirkung: false,
    },
    de: {
      norm: "§§ 433 ff. BGB, §§ 474 ff. BGB (Verbrauchsgüterkauf)",
      beschreibung: "Umsetzung durch Gesetz zur Regelung des Verkaufs von Sachen mit digitalen Elementen (2021).",
      umsetzungsjahr: 2022,
    },
    abweichungen: [
      "§ 477 BGB: Beweislastumkehr 12 Monate (WKRL: 1 Jahr) — DE-Umsetzung identisch",
      "§ 475b BGB: Neue Kategorie 'Waren mit digitalen Elementen'",
      "§ 327 ff. BGB: Neue Regelungen für digitale Inhalte (RL 2019/770)",
    ],
    vorrang: "Nach Umsetzung gilt deutsches BGB — richtlinienkonforme Auslegung durch Gerichte erforderlich.",
    eugh: [
      "EuGH C-497/13 (Faber, 2015) — Beweislastumkehr bei Verbrauchsgüterkauf",
      "EuGH C-149/15 (Wathelet, 2016) — Verkäufereigenschaft",
      "EuGH C-524/19 (Mak, 2021) — Informationspflichten Online-Handel",
    ],
    praxis: [
      "Verbraucher haben 14 Tage Widerrufsrecht bei Fernabsatz (§ 355 BGB i.V.m. RL 2011/83)",
      "Gewährleistung: 2 Jahre, nicht abdingbar bei Neuwaren (§ 476 BGB)",
      "Digitale Produkte: Aktualisierungspflicht des Verkäufers (§ 327f BGB)",
    ],
  },
  {
    thema: "Arbeitnehmerrechte / Arbeitszeit",
    stichworte: ["arbeitszeit", "urlaub", "arbeitnehmer", "überstunden", "ruhezeit", "nachtarbeit", "arbeitszeitgesetz"],
    eu: {
      rechtsakt: "RL 2003/88/EG — Arbeitszeitrichtlinie",
      artikel: ["Art. 6 (Max. 48h/Woche)", "Art. 7 (4 Wochen Urlaub)", "Art. 8 (Nachtarbeit max. 8h)"],
      beschreibung: "Mindestschutzrichtlinie — Mitgliedstaaten dürfen günstigere Regelungen treffen.",
      direktwirkung: false,
    },
    de: {
      norm: "ArbZG (Arbeitszeitgesetz)",
      beschreibung: "§ 3 ArbZG: Max. 8h/Tag (mit Ausnahmen 10h). BUrlG: 24 Werktage Mindesturlaub (besser als EU-Minimum).",
      umsetzungsjahr: 1994,
    },
    abweichungen: [
      "EU: 48h/Woche als Durchschnitt (Opt-out möglich). DE: 48h/Woche ohne individuellem Opt-out",
      "EU-Urlaub: 4 Wochen. DE: 24 Werktage (= 4 Wochen bei 6-Tage-Woche) — faktisch gleich",
      "BAG 13.09.2022: Lückenlose Arbeitszeiterfassung nach EuGH CCOO (C-55/18) verpflichtend",
    ],
    vorrang: "Richtlinie gilt nach Umsetzung nicht direkt — aber richtlinienkonforme Auslegung ArbZG.",
    eugh: [
      "EuGH C-55/18 (CCOO/Deutsche Bank, 2019) — Pflicht zur Arbeitszeiterfassung",
      "EuGH C-303/98 (SIMAP, 2000) — Bereitschaftsdienst = Arbeitszeit",
      "EuGH C-173/99 (BECTU, 2001) — Urlaubsanspruch entsteht ab erstem Tag",
    ],
    praxis: [
      "Arbeitgeber MÜSSEN Arbeitszeiten erfassen (BAG-Pflicht seit 2022)",
      "Sonntagsarbeit: In DE enger als EU-Recht verlangt (§ 9 ArbZG)",
      "Verstoß: Bußgeld bis 15.000€ (§ 22 ArbZG)",
    ],
  },
  {
    thema: "Wettbewerbsrecht / Kartellrecht",
    stichworte: ["kartell", "wettbewerb", "monopol", "fusion", "beihilfe", "marktmacht", "preisabsprache", "gwb"],
    eu: {
      rechtsakt: "Art. 101, 102 AEUV + VO 1/2003",
      artikel: ["Art. 101 AEUV (Kartellverbot)", "Art. 102 AEUV (Marktmachtmissbrauch)", "Art. 107 AEUV (Beihilfeverbot)"],
      beschreibung: "Unmittelbar anwendbar wenn EU-Zwischenstaatlichkeit betroffen.",
      direktwirkung: true,
    },
    de: {
      norm: "GWB (Gesetz gegen Wettbewerbsbeschränkungen)",
      beschreibung: "§ 1 GWB = deutsches Äquivalent Art. 101 AEUV. § 18 GWB = Marktbeherrschung. Parallele Anwendung möglich.",
      umsetzungsjahr: 1957,
    },
    abweichungen: [
      "GWB 10. Novelle 2021: Stärkere Kontrolle digitaler Plattformen (§ 19a GWB — schärfer als EU)",
      "§ 19a GWB: BKartA kann Plattformen mit 'überragender marktübergreifender Bedeutung' vorab regulieren",
      "Fusionskontrolle: GWB-Schwellenwerte unabhängig von EU-Fusionskontrolle (VO 139/2004)",
    ],
    vorrang: "EU-Kartellrecht hat Vorrang bei Zwischenstaatlichkeit. BKartA und EU-KOM können parallel ermitteln.",
    eugh: [
      "EuGH C-199/11 (Otis, 2012) — Schadensersatz bei Kartellverstoß",
      "EuGH C-295/04 (Manfredi, 2006) — Private Kartellschadensersatzklage",
    ],
    praxis: [
      "Bußgelder EU: Bis 10% des weltweiten Konzernumsatzes (VO 1/2003 Art. 23)",
      "Bußgelder DE: Bis 10% des Konzernumsatzes (§ 81 GWB)",
      "Kronzeugenregelung: Vollständiger Bußgelderlass für ersten Antragsteller",
    ],
  },
  {
    thema: "Produkthaftung",
    stichworte: ["produkthaftung", "produkt", "defekt", "produktsicherheit", "hersteller", "fehler", "schaden"],
    eu: {
      rechtsakt: "RL 85/374/EWG — Produkthaftungsrichtlinie + RL 2024/2853/EU (Neufassung)",
      artikel: ["Art. 1 (Haftung des Herstellers)", "Art. 6 (Fehlerbegriff)", "Art. 9 (Ersatzfähige Schäden)"],
      beschreibung: "Verschuldensunabhängige Haftung des Herstellers für fehlerhafte Produkte.",
      direktwirkung: false,
    },
    de: {
      norm: "ProdHaftG (Produkthaftungsgesetz)",
      beschreibung: "§ 1 ProdHaftG: Hersteller haftet für fehlerhafte Produkte ohne Verschuldensnachweis. Neben § 823 BGB.",
      umsetzungsjahr: 1990,
    },
    abweichungen: [
      "ProdHaftG: Selbstbehalt 500€ bei Sachschäden (Art. 9 RL) — beibehalten",
      "Neue RL 2024/2853: KI-Systeme und Software einbezogen — DE muss bis 2026 umsetzen",
      "§ 823 Abs. 1 BGB bleibt parallel anwendbar (ohne Haftungsgrenze)",
    ],
    vorrang: "Nach Umsetzung gilt ProdHaftG. Richtlinienkonforme Auslegung erforderlich.",
    eugh: [
      "EuGH C-300/95 (Kommission/UK, 1997) — Entwicklungsrisiko-Einwand",
      "EuGH C-203/99 (Henning Veedfald, 2001) — Dienstleistungsprodukte",
    ],
    praxis: [
      "Haftungsgrenze: 85 Mio. € pro Produktserie (§ 10 ProdHaftG)",
      "Verjährung: 3 Jahre ab Kenntnis (§ 12 ProdHaftG), Ausschlussfrist 10 Jahre",
      "KI-Haftung: Neue EU-KI-Haftungsrichtlinie (2024) ändert Beweisregeln",
    ],
  },
];

// ── CELEX 번호 매핑 ───────────────────────────────────────────────────────

const CELEX_MAP: Record<string, string> = {
  "datenschutz": "32016R0679",   // DSGVO
  "dsgvo": "32016R0679",
  "gdpr": "32016R0679",
  "kaufrecht": "32019L0771",     // Warenkauf-RL
  "verbraucher": "32019L0771",
  "arbeitszeit": "32003L0088",   // Arbeitszeitrichtlinie
  "produkthaftung": "31985L0374", // ProdHaft-RL
  "kartellrecht": "32003R0001",   // VO 1/2003
  "wettbewerb": "32003R0001",
};

function resolveCelex(thema: string): string | undefined {
  const lower = thema.toLowerCase();
  for (const [key, celex] of Object.entries(CELEX_MAP)) {
    if (lower.includes(key)) return celex;
  }
  return undefined;
}

function findVergleich(thema: string): EuDeVergleich | undefined {
  const lower = thema.toLowerCase();
  let best: { eintrag: EuDeVergleich; score: number } | undefined;

  for (const eintrag of VERGLEICHSDATENBANK) {
    let score = 0;
    for (const sw of eintrag.stichworte) {
      if (lower.includes(sw)) score++;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { eintrag, score };
    }
  }

  return best?.eintrag;
}

// ── Schema ────────────────────────────────────────────────────────────────

export const compareDeEuSchema = z.object({
  thema: z
    .string()
    .min(3)
    .describe(
      "Rechtsthema für den Vergleich. Beispiele: " +
      "'Datenschutz', 'Verbraucherschutz Kaufrecht', 'Arbeitszeitrecht', " +
      "'Produkthaftung', 'Kartellrecht', 'Wettbewerbsrecht'",
    ),
  fokus: z
    .enum(["vollständig", "abweichungen", "eugh", "praxis"])
    .default("vollständig")
    .describe(
      "'vollständig': Alles anzeigen. " +
      "'abweichungen': Nur DE/EU-Unterschiede. " +
      "'eugh': Nur EuGH-Rechtsprechung. " +
      "'praxis': Nur praktische Konsequenzen.",
    ),
});

export type CompareDeEuInput = z.infer<typeof compareDeEuSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function compareDeEu(input: CompareDeEuInput): Promise<string> {
  const lines: string[] = [];
  const vergleich = findVergleich(input.thema);

  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║        DEUTSCH-EU-RECHTSVERGLEICH                        ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Thema: ${input.thema}`);
  lines.push("");

  // ── [0] EUR-Lex Live Status ──────────────────────────────────────────────
  const celex = resolveCelex(input.thema);
  if (celex) {
    let liveDoc: EurLexDocument | null = null;
    let liveError = false;
    try {
      liveDoc = await fetchByCelex(celex);
    } catch {
      liveError = true;
    }

    lines.push("  ── [0] EUR-LEX LIVE STATUS ──────────────────────────────────");
    lines.push(`  CELEX: ${celex}`);
    if (liveDoc && !liveError) {
      lines.push(`  Titel: ${liveDoc.title}`);
      lines.push(`  Datum: ${liveDoc.date}`);
      lines.push("  Status: In Kraft ✅");
      lines.push(`  Link:  ${buildEurLexUrl(celex, "DE")}`);
      lines.push("  [Daten live von EUR-Lex CELLAR API]");
    } else {
      lines.push(`  Link:  ${buildEurLexUrl(celex, "DE")}`);
      lines.push("  [Live-Abfrage nicht verfügbar — statische Daten werden verwendet]");
    }
    lines.push("");
  }

  if (!vergleich) {
    lines.push("  ⚠  Kein Vergleichseintrag für dieses Thema gefunden.");
    lines.push("");
    lines.push("  Verfügbare Themen in der Datenbank:");
    for (const v of VERGLEICHSDATENBANK) {
      lines.push(`  → ${v.thema}`);
    }
    lines.push("");
    lines.push("  Tipp: Stichworte wie 'Datenschutz', 'Kaufrecht', 'Arbeitzeit',");
    lines.push("        'Produkthaftung', 'Kartellrecht' verwenden.");
    return lines.join("\n");
  }

  lines.push(`  ── THEMA: ${vergleich.thema.toUpperCase()} ───────────────────────────`);
  lines.push("");

  // EU-Recht
  if (input.fokus === "vollständig" || input.fokus === "abweichungen") {
    lines.push("  ── [1] EU-RECHTSGRUNDLAGE ────────────────────────────────");
    lines.push(`  Rechtsakt:       ${vergleich.eu.rechtsakt}`);
    lines.push(`  Direktwirkung:   ${vergleich.eu.direktwirkung ? "✅ JA — unmittelbar anwendbar" : "❌ NEIN — Umsetzung erforderlich"}`);
    lines.push(`  Schlüsselartikel:`);
    for (const art of vergleich.eu.artikel) {
      lines.push(`    ✦ ${art}`);
    }
    lines.push(`  ${vergleich.eu.beschreibung}`);
    lines.push("");

    // Deutsches Recht
    lines.push("  ── [2] DEUTSCHE UMSETZUNGSNORM ──────────────────────────");
    lines.push(`  Norm:            ${vergleich.de.norm}`);
    if (vergleich.de.umsetzungsjahr) {
      lines.push(`  Umsetzung:       ${vergleich.de.umsetzungsjahr}`);
    }
    lines.push(`  ${vergleich.de.beschreibung}`);
    lines.push("");

    // Abweichungen
    lines.push("  ── [3] ABWEICHUNGEN DE ↔ EU ─────────────────────────────");
    if (vergleich.abweichungen.length === 0) {
      lines.push("  (Keine wesentlichen Abweichungen — vollständige Harmonisierung)");
    } else {
      for (const abw of vergleich.abweichungen) {
        lines.push(`  ⚡ ${abw}`);
      }
    }
    lines.push("");

    // Anwendungsvorrang
    lines.push("  ── [4] ANWENDUNGSVORRANG ────────────────────────────────");
    lines.push(`  ${vergleich.vorrang}`);
    lines.push("");
    lines.push("  Allg. Grundsatz: EU-Recht hat Anwendungsvorrang vor nationalem Recht.");
    lines.push("  (EuGH C-26/62, Van Gend & Loos 1963 + C-6/64, Costa/ENEL 1964)");
    lines.push("");
  }

  // EuGH-Rechtsprechung
  if (input.fokus === "vollständig" || input.fokus === "eugh") {
    lines.push("  ── [5] EUGH-LEITENTSCHEIDUNGEN ──────────────────────────");
    if (vergleich.eugh.length === 0) {
      lines.push("  (Keine EuGH-Leitentscheidungen eingetragen)");
    } else {
      for (const urt of vergleich.eugh) {
        lines.push(`  ▸ ${urt}`);
      }
    }
    lines.push("");
    lines.push("  EuGH-Urteile sind für alle nationalen Gerichte bindend.");
    lines.push("  Vorabentscheidungsverfahren: Art. 267 AEUV (nationale Gerichte können vorlegen)");
    lines.push("");
  }

  // Praxis
  if (input.fokus === "vollständig" || input.fokus === "praxis") {
    lines.push("  ── [6] PRAKTISCHE KONSEQUENZEN ──────────────────────────");
    for (const p of vergleich.praxis) {
      lines.push(`  ✦ ${p}`);
    }
    lines.push("");
  }

  lines.push("  ═══════════════════════════════════════════════════════");
  lines.push("  WEITERFÜHREND:");
  lines.push("  → EUR-Lex:      https://eur-lex.europa.eu");
  lines.push("  → EuGH-Suche:   https://curia.europa.eu");
  lines.push("  → BVerfG-DSGVO: BVerfG 1 BvR 1743/16 (DSGVO-Verfassungskonformität)");

  return lines.join("\n");
}
