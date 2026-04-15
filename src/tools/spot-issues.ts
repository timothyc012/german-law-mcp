/**
 * spot-issues.ts
 *
 * Analysiert einen Sachverhalt und identifiziert automatisch
 * alle relevanten Anspruchsgrundlagen (Anspruchsprüfungsreihenfolge),
 * Risiken, Fristen und offene Fragen.
 *
 * Entspricht dem "Issue Spotter" aus dem US-amerikanischen Bar Exam,
 * adaptiert für das deutsche Recht.
 */

import { z } from "zod";

// ── Issue-Datenbank ───────────────────────────────────────────────────────

interface Issue {
  id: string;
  titel: string;
  norm: string;
  bereich: string;
  prioritaet: "hoch" | "mittel" | "niedrig";
  trigger: string[];          // Keywords die dieses Issue auslösen
  pruefpunkte: string[];      // Was genau zu prüfen ist
  typischeFrist?: string;     // Verjährung / Klagefrist
  risiko?: string;            // Typisches Risiko / Fallstrick
}

const ISSUE_DATABASE: Issue[] = [
  // ── Kaufrecht ──
  {
    id: "kauf-gewaehr",
    titel: "Sachmängelgewährleistung",
    norm: "§§ 434, 437 BGB",
    bereich: "Kaufrecht",
    prioritaet: "hoch",
    trigger: ["kauf", "mangel", "defekt", "kaputt", "fehler", "gewährleistung", "garantie", "auto", "fahrzeug", "ware"],
    pruefpunkte: [
      "Sachmangel bei Gefahrübergang (§ 434 BGB) nachweisbar?",
      "Beweislastumkehr: Binnen 1 Jahr gilt § 477 BGB (Verbraucherkauf)",
      "Frist zur Nacherfüllung gesetzt (§ 439 BGB)?",
      "Ist Nacherfüllung fehlgeschlagen / verweigert / unzumutbar?",
      "Arglistiges Verschweigen? → keine Haftungsausschluss möglich (§ 444 BGB)",
      "Privatverkauf mit Haftungsausschluss? (§ 444 BGB beachten)",
    ],
    typischeFrist: "2 Jahre Verjährung ab Übergabe (§ 438 Abs. 1 Nr. 3 BGB); bei arglistigem Verschweigen 3 Jahre (§ 438 Abs. 3 BGB)",
    risiko: "Haftungsausschluss 'gekauft wie gesehen' beim Privatverkauf — aber nicht bei arglistig verschwiegenen Mängeln",
  },
  {
    id: "kauf-ruecktritt",
    titel: "Rücktritt vom Kaufvertrag",
    norm: "§§ 437 Nr. 2, 323, 440 BGB",
    bereich: "Kaufrecht",
    prioritaet: "mittel",
    trigger: ["rücktritt", "rückgabe", "kaufpreis zurück", "mangel", "defekt"],
    pruefpunkte: [
      "Voraussetzungen der Gewährleistung erfüllt?",
      "Frist zur Nacherfüllung gesetzt und fruchtlos abgelaufen?",
      "Oder: Nacherfüllung verweigert / fehlgeschlagen (§ 440 BGB)?",
      "Mangel nicht nur unerheblich (§ 323 Abs. 5 S. 2 BGB)?",
      "Nutzungsentschädigung für Gebrauchszeit beachten (§ 346 Abs. 1 BGB)?",
    ],
    typischeFrist: "Kein eigenständige Frist, aber Nacherfüllungsfrist muss zuvor ablaufen",
    risiko: "Bei geringfügigen Mängeln (< 5% des Kaufpreises) kein Rücktrittsrecht",
  },
  {
    id: "kauf-schadensersatz",
    titel: "Schadensersatz statt der Leistung",
    norm: "§§ 437 Nr. 3, 280, 281 BGB",
    bereich: "Kaufrecht",
    prioritaet: "mittel",
    trigger: ["schadensersatz", "schaden", "mangel", "folgeschaden", "defekt"],
    pruefpunkte: [
      "Sachmangel + Vertretenmüssen des Verkäufers?",
      "Folgeschäden (z.B. Werkstattkosten, Mietwagenkosten)?",
      "Fristsetzung erfolgt?",
      "Vorrang der Nacherfüllung beachten",
    ],
    typischeFrist: "3 Jahre Regelverjährung ab Kenntnis (§ 195 BGB), max. 10 Jahre (§ 199 Abs. 4 BGB)",
  },

  // ── Mietrecht ──
  {
    id: "miet-kuendigung-mieter",
    titel: "Wirksamkeit der Kündigung (Vermieterseite)",
    norm: "§§ 543, 573, 573c BGB",
    bereich: "Mietrecht",
    prioritaet: "hoch",
    trigger: ["kündigung", "miete", "mieter", "wohnung", "vermieter", "mietrückstand"],
    pruefpunkte: [
      "Formvoraussetzungen der Kündigung (§ 568 BGB: Schriftform)?",
      "Ordentliche Kündigung: berechtigtes Interesse (§ 573 BGB)?",
      "Fristlose Kündigung: wichtiger Grund (§ 543 BGB)?",
      "Mietrückstand ≥ 2 Monatsmieten für fristlose Kündigung (§ 543 Abs. 2 Nr. 3)?",
      "Abmahnung erforderlich und erfolgt?",
      "Soziale Härtegründe des Mieters (§ 574 BGB)?",
    ],
    typischeFrist: "Widerspruch gegen Kündigung: 2 Monate vor Mietende (§ 574b BGB)",
    risiko: "Eigenbedarfskündigung: strenge Anforderungen an Begründung; Schadensersatz bei vorgetäuschtem Eigenbedarf",
  },
  {
    id: "miet-mangel",
    titel: "Mietmangel — Minderung und Schadensersatz",
    norm: "§§ 536, 536a BGB",
    bereich: "Mietrecht",
    prioritaet: "hoch",
    trigger: ["mietmangel", "heizung", "schimmel", "lärm", "wohnung", "defekt", "miete", "mangel"],
    pruefpunkte: [
      "Mangel der Mietsache i.S.d. § 536 BGB?",
      "Anzeigepflicht des Mieters (§ 536c BGB) — Kenntnis des Vermieters?",
      "Minderungsquote nach Art und Schwere des Mangels?",
      "Schadensersatz: Verschulden des Vermieters (§ 536a BGB)?",
      "Selbstabhilfe und Aufwendungsersatz (§ 536a Abs. 2 BGB)?",
    ],
    typischeFrist: "Keine separate Frist für Minderung; Anzeigepflicht beachten",
    risiko: "Vorbehaltlose Zahlung der Miete über längeren Zeitraum kann Minderungsrecht ausschließen",
  },

  // ── Arbeitsrecht ──
  {
    id: "arbeit-kuendigung-schutz",
    titel: "Kündigungsschutzklage",
    norm: "§§ 1, 4 KSchG",
    bereich: "Arbeitsrecht",
    prioritaet: "hoch",
    trigger: ["kündigung", "arbeitnehmer", "entlassung", "arbeitslos", "arbeitgeber", "betrieb"],
    pruefpunkte: [
      "Anwendbarkeit KSchG: > 6 Monate Betriebszugehörigkeit, > 10 Arbeitnehmer?",
      "Soziale Rechtfertigung: personen-, verhaltens- oder betriebsbedingt?",
      "Verhaltensbedingt: vorherige Abmahnung erfolgt?",
      "Betriebsbedingt: Sozialauswahl nach § 1 Abs. 3 KSchG?",
      "Betriebsratanhörung (§ 102 BetrVG) wenn BR vorhanden?",
      "Formvoraussetzungen: Schriftform (§ 623 BGB)?",
    ],
    typischeFrist: "⚠ ACHTUNG: Kündigungsschutzklage binnen 3 Wochen nach Zugang (§ 4 KSchG) — AUSSCHLUSSFRIST!",
    risiko: "3-Wochen-Frist ist Ausschlussfrist — nach Ablauf gilt Kündigung als wirksam (§ 7 KSchG)",
  },
  {
    id: "arbeit-urlaubsanspruch",
    titel: "Urlaubsanspruch und -abgeltung",
    norm: "§§ 1, 7 BUrlG",
    bereich: "Arbeitsrecht",
    prioritaet: "niedrig",
    trigger: ["urlaub", "urlaubstage", "abgeltung", "resturlaub", "kündigung"],
    pruefpunkte: [
      "Mindesturlaub 24 Werktage / 20 Arbeitstage (§ 3 BUrlG)?",
      "Übertragung auf nächstes Jahr (§ 7 Abs. 3 BUrlG): nur bei dringenden Gründen bis 31.03.?",
      "Bei Kündigung: Urlaubsabgeltung statt Urlaubsgewährung (§ 7 Abs. 4 BUrlG)?",
      "EuGH-Rspr.: Arbeitgeber muss Arbeitnehmer aktiv auf drohenden Verfall hinweisen?",
    ],
    typischeFrist: "Verjährung 3 Jahre; Verfall 31.03. Folgejahr wenn übertragen",
  },

  // ── Deliktsrecht ──
  {
    id: "delikt-koerperverletzung",
    titel: "Schadensersatz / Schmerzensgeld bei Körperverletzung",
    norm: "§§ 823 Abs. 1, 253 Abs. 2 BGB",
    bereich: "Deliktsrecht",
    prioritaet: "hoch",
    trigger: ["verletzung", "unfall", "körperverletzung", "schmerzensgeld", "arzt", "krankenhaus", "schaden"],
    pruefpunkte: [
      "Verletzung von Körper / Gesundheit / Leben?",
      "Widerrechtliche Handlung des Schädigers?",
      "Verschulden: Vorsatz oder Fahrlässigkeit (§ 276 BGB)?",
      "Kausalität (haftungsbegründend + haftungsausfüllend)?",
      "Mitverschulden des Geschädigten (§ 254 BGB)?",
      "Materieller Schaden: Heilbehandlungskosten, Verdienstausfall?",
      "Immaterieller Schaden: Schmerzensgeld (§ 253 Abs. 2 BGB)?",
    ],
    typischeFrist: "3 Jahre ab Kenntnis von Schaden und Schädiger (§ 195, 199 BGB)",
    risiko: "Mitverschulden kann Anspruch erheblich reduzieren; Beweislast für Kausalität beim Geschädigten",
  },

  // ── Datenschutz ──
  {
    id: "dsgvo-schadensersatz",
    titel: "DSGVO-Schadensersatz (Art. 82 DSGVO)",
    norm: "Art. 82 DSGVO i.V.m. § 83 BDSG",
    bereich: "Datenschutzrecht",
    prioritaet: "mittel",
    trigger: ["dsgvo", "datenschutz", "daten", "datenpanne", "datenleck", "personenbezogen"],
    pruefpunkte: [
      "Verstoß gegen DSGVO-Vorschriften durch Verantwortlichen?",
      "Materieller oder immaterieller Schaden entstanden?",
      "Entlastungsmöglichkeit des Verantwortlichen (Art. 82 Abs. 3 DSGVO)?",
      "Betroffenenrechte (Auskunft Art. 15, Löschung Art. 17, Berichtigung Art. 16)?",
      "Aufsichtsbehördenbeschwerde (Art. 77 DSGVO) als Alternative?",
    ],
    typischeFrist: "3 Jahre (§ 195 BGB analog); Betroffenenrechte unverzüglich, max. 1 Monat (Art. 12 Abs. 3 DSGVO)",
    risiko: "BGH: 'bloßer Kontrollverlust' kann bereits immateriellen Schaden begründen (BGH VI ZR 223/23)",
  },

  // ── Bereicherungsrecht ──
  {
    id: "kondikt-leistung",
    titel: "Leistungskondiktion (Rückforderung ohne Rechtsgrund)",
    norm: "§ 812 Abs. 1 S. 1 Alt. 1 BGB",
    bereich: "Bereicherungsrecht",
    prioritaet: "mittel",
    trigger: ["bereicherung", "zurückfordern", "irrtum", "überzahlung", "doppelt bezahlt", "ohne rechtsgrund"],
    pruefpunkte: [
      "Etwas erlangt durch Leistung?",
      "Ohne Rechtsgrund (fehlend / weggefallen / zwecklos)?",
      "Entreicherung des Schuldners (§ 818 Abs. 3 BGB)?",
      "Verschärfte Haftung bei Kenntnis (§ 819 BGB)?",
      "Verjährung beachten?",
    ],
    typischeFrist: "3 Jahre ab Kenntnis (§ 195, 199 BGB)",
  },
];

// ── Analyse-Engine ─────────────────────────────────────────────────────────

function erkenneIssues(sachverhalt: string, rechtsgebiet?: string): Issue[] {
  const sv = sachverhalt.toLowerCase();

  const treffer = ISSUE_DATABASE.filter((issue) => {
    if (rechtsgebiet) {
      const rg = rechtsgebiet.toLowerCase();
      if (!issue.bereich.toLowerCase().includes(rg)) {
        // Trotzdem bei Keyword-Treffer einschließen
      }
    }
    return issue.trigger.some((kw) => sv.includes(kw.toLowerCase()));
  });

  // Nach Priorität sortieren
  const prio = { hoch: 0, mittel: 1, niedrig: 2 };
  return treffer.sort((a, b) => prio[a.prioritaet] - prio[b.prioritaet]);
}

// ── Output-Formatter ───────────────────────────────────────────────────────

function formatIssueReport(sachverhalt: string, issues: Issue[]): string {
  const lines: string[] = [];

  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║        RECHTLICHE ISSUE-ANALYSE — Anspruchscheck        ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push("  SACHVERHALT (Zusammenfassung):");
  const sv = sachverhalt.slice(0, 200) + (sachverhalt.length > 200 ? "..." : "");
  lines.push(`  "${sv}"`);
  lines.push("");

  if (issues.length === 0) {
    lines.push("  ⚠  Keine spezifischen Anspruchsgrundlagen erkannt.");
    lines.push("     Bitte konkretisieren Sie: Wer will was von wem?");
    lines.push("     Rechtsgebiete: Kaufrecht, Mietrecht, Arbeitsrecht,");
    lines.push("     Deliktsrecht, Datenschutzrecht, Bereicherungsrecht");
    return lines.join("\n");
  }

  lines.push(`  ✦ ${issues.length} potenzielle Rechtsprobleme identifiziert:`);
  lines.push("");

  const hochPrio = issues.filter((i) => i.prioritaet === "hoch");
  const mittelPrio = issues.filter((i) => i.prioritaet === "mittel");
  const niedrigPrio = issues.filter((i) => i.prioritaet === "niedrig");

  for (const [label, gruppe] of [
    ["🔴 HOHE PRIORITÄT", hochPrio],
    ["🟡 MITTLERE PRIORITÄT", mittelPrio],
    ["🟢 NIEDRIGE PRIORITÄT", niedrigPrio],
  ] as [string, Issue[]][]) {
    if (gruppe.length === 0) continue;
    lines.push(`  ${label}`);
    lines.push(`  ${"─".repeat(56)}`);

    for (const issue of gruppe) {
      lines.push("");
      lines.push(`  ▸ ${issue.titel}`);
      lines.push(`    Norm: ${issue.norm} | ${issue.bereich}`);
      lines.push("");
      lines.push("    Zu prüfen:");
      for (const pp of issue.pruefpunkte) {
        lines.push(`    □ ${pp}`);
      }
      if (issue.typischeFrist) {
        lines.push("");
        lines.push(`    ⏱ FRIST: ${issue.typischeFrist}`);
      }
      if (issue.risiko) {
        lines.push(`    ⚠  RISIKO: ${issue.risiko}`);
      }
    }
    lines.push("");
  }

  lines.push("  ═══════════════════════════════════════════════════════");
  lines.push("  EMPFOHLENE PRÜFUNGSREIHENFOLGE:");
  lines.push("");
  let nr = 1;
  for (const issue of issues) {
    lines.push(`  ${nr++}. ${issue.norm} — ${issue.titel}`);
  }
  lines.push("");
  lines.push("  NÄCHSTE SCHRITTE:");
  lines.push("  → get_law_section für aktuelle Normtexte");
  lines.push("  → search_case_law für relevante BGH-Urteile");
  lines.push("  → gutachten_scaffold für strukturierte Prüfung");
  lines.push("  → calculate_frist für Verjährungs-/Klagefristen");

  return lines.join("\n");
}

// ── Schema ────────────────────────────────────────────────────────────────

export const spotIssuesSchema = z.object({
  sachverhalt: z
    .string()
    .describe(
      "Der zu analysierende Sachverhalt. Beschreiben Sie den Fall möglichst konkret. " +
      "Beispiel: 'Mein Arbeitgeber hat mir nach 8 Jahren fristlos gekündigt, weil ich " +
      "angeblich Betriebsgeheimnisse weitergegeben habe. Stimmt nicht.'",
    ),
  rechtsgebiet: z
    .string()
    .optional()
    .describe(
      "Optionale Einschränkung auf ein Rechtsgebiet (z.B. 'Arbeitsrecht', 'Kaufrecht', " +
      "'Mietrecht', 'Datenschutz'). Wenn weggelassen, werden alle Gebiete geprüft.",
    ),
});

export type SpotIssuesInput = z.infer<typeof spotIssuesSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function spotIssues(input: SpotIssuesInput): Promise<string> {
  const issues = erkenneIssues(input.sachverhalt, input.rechtsgebiet);
  return formatIssueReport(input.sachverhalt, issues);
}
