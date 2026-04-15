/**
 * gutachten-scaffold.ts
 *
 * Erzeugt ein strukturiertes Rechtsgutachten im Gutachtenstil
 * (Obersatz → Definition → Subsumtion → Ergebnis).
 *
 * Identifiziert relevante Anspruchsgrundlagen aus dem Sachverhalt,
 * baut die IRAC-ähnliche Gutachten-Gliederung auf und bereitet
 * Platzhalter für Fundstellen und Argumente vor.
 */

import { z } from "zod";
import { searchConceptMap } from "../lib/concept-map.js";

// ── Anspruchsgrundlagen-Wissensbasis ──────────────────────────────────────

interface Anspruchsgrundlage {
  norm: string;
  titel: string;
  bereich: string;
  stichworte: string[];
  voraussetzungen: string[];
  rechtsfolge: string;
  gegenAnsprueche?: string[];
}

const ANSPRUCHSGRUNDLAGEN: Anspruchsgrundlage[] = [
  // ── Kaufrecht ──
  {
    norm: "§ 433 Abs. 1 BGB",
    titel: "Übereignungsanspruch des Käufers",
    bereich: "Kaufrecht",
    stichworte: ["Kaufvertrag", "Kauf", "kaufen", "Käufer", "Verkäufer", "Ware", "Fahrzeug", "Auto"],
    voraussetzungen: [
      "Wirksamer Kaufvertrag (Angebot + Annahme, §§ 145 ff. BGB)",
      "Einigung über Kaufgegenstand und Kaufpreis",
      "Keine Nichtigkeitsgründe (§§ 116 ff., 134, 138 BGB)",
    ],
    rechtsfolge: "Käufer hat Anspruch auf Übergabe und Übereignung der Kaufsache",
  },
  {
    norm: "§ 437 Nr. 1 i.V.m. § 439 BGB",
    titel: "Nacherfüllungsanspruch bei Sachmangel",
    bereich: "Kaufrecht / Gewährleistung",
    stichworte: ["Mangel", "mangelhaft", "defekt", "kaputt", "Gewährleistung", "Sachmangel", "Fehler"],
    voraussetzungen: [
      "Wirksamer Kaufvertrag",
      "Sachmangel bei Gefahrübergang (§ 434 BGB)",
      "Keine wirksame Haftungsausschluss-Vereinbarung",
      "Fristsetzung zur Nacherfüllung (Reparatur oder Ersatzlieferung)",
    ],
    rechtsfolge: "Käufer kann Beseitigung des Mangels oder Lieferung einer mangelfreien Sache verlangen",
    gegenAnsprueche: ["§ 444 BGB — Ausschluss bei arglistigem Verschweigen / Garantie"],
  },
  {
    norm: "§ 437 Nr. 2 i.V.m. §§ 440, 323 BGB",
    titel: "Rücktrittsrecht wegen Sachmangel",
    bereich: "Kaufrecht / Gewährleistung",
    stichworte: ["Rücktritt", "Rückgabe", "Kaufpreis zurück", "Mangel", "Gewährleistung"],
    voraussetzungen: [
      "Sachmangel bei Gefahrübergang",
      "Erfolglose Fristsetzung zur Nacherfüllung (§ 323 Abs. 1 BGB) ODER",
      "Fehlschlagen / Unzumutbarkeit der Nacherfüllung (§ 440 BGB)",
      "Keine Unerheblichkeit des Mangels (§ 323 Abs. 5 S. 2 BGB)",
    ],
    rechtsfolge: "Käufer kann vom Vertrag zurücktreten; Rückgewähr von Kaufsache und Kaufpreis",
  },
  {
    norm: "§ 437 Nr. 3 i.V.m. §§ 280, 281 BGB",
    titel: "Schadensersatz statt der Leistung bei Sachmangel",
    bereich: "Kaufrecht / Gewährleistung",
    stichworte: ["Schadensersatz", "Schaden", "Mangel", "Vertretenmüssen"],
    voraussetzungen: [
      "Sachmangel bei Gefahrübergang",
      "Vertretenmüssen des Verkäufers (§ 276 BGB)",
      "Erfolglose Fristsetzung (§ 281 Abs. 1 BGB) ODER Entbehrlichkeit",
    ],
    rechtsfolge: "Ersatz des Schadens, der durch den Mangel entstanden ist",
  },

  // ── Vertragsrecht allgemein ──
  {
    norm: "§ 280 Abs. 1 BGB",
    titel: "Schadensersatz wegen Pflichtverletzung",
    bereich: "Allgemeines Schuldrecht",
    stichworte: ["Pflichtverletzung", "Schadensersatz", "Schuldverhältnis", "Vertragsverletzung"],
    voraussetzungen: [
      "Bestehendes Schuldverhältnis",
      "Pflichtverletzung des Schuldners",
      "Vertretenmüssen (§ 276 BGB) — wird vermutet",
      "Kausaler Schaden",
    ],
    rechtsfolge: "Ersatz des durch die Pflichtverletzung entstandenen Schadens",
  },
  {
    norm: "§ 812 Abs. 1 S. 1 Alt. 1 BGB",
    titel: "Leistungskondiktion (ungerechtfertigte Bereicherung)",
    bereich: "Bereicherungsrecht",
    stichworte: ["Bereicherung", "ungerechtfertigt", "zurückfordern", "Zahlung", "ohne Rechtsgrund"],
    voraussetzungen: [
      "Etwas erlangt (Vermögensvorteil)",
      "Durch Leistung des Anspruchstellers",
      "Ohne rechtlichen Grund (fehlender, weggefallener oder erreichter Zweck)",
    ],
    rechtsfolge: "Herausgabe des Erlangten (§ 818 BGB)",
  },
  {
    norm: "§ 823 Abs. 1 BGB",
    titel: "Deliktischer Schadensersatz",
    bereich: "Deliktsrecht",
    stichworte: ["Körperverletzung", "Sachbeschädigung", "Unfall", "widerrechtlich", "Schaden", "Verletzung"],
    voraussetzungen: [
      "Verletzung eines absolut geschützten Rechtsguts (Leben, Körper, Gesundheit, Freiheit, Eigentum)",
      "Widerrechtliche Verletzungshandlung",
      "Verschulden (Vorsatz oder Fahrlässigkeit, § 276 BGB)",
      "Kausaler Schaden",
    ],
    rechtsfolge: "Ersatz des daraus entstehenden Schadens (Naturalrestitution, § 249 BGB)",
  },

  // ── Mietrecht ──
  {
    norm: "§ 535 Abs. 1 BGB",
    titel: "Gebrauchsüberlassungsanspruch des Mieters",
    bereich: "Mietrecht",
    stichworte: ["Miete", "Mieter", "Vermieter", "Wohnung", "Mietvertrag", "Mietzins"],
    voraussetzungen: [
      "Wirksamer Mietvertrag",
      "Übergabe der Mietsache noch nicht erfolgt",
    ],
    rechtsfolge: "Vermieter muss Mietsache überlassen und in gebrauchstauglichem Zustand erhalten",
  },
  {
    norm: "§ 543 BGB",
    titel: "Außerordentliche Kündigung des Mietvertrags",
    bereich: "Mietrecht",
    stichworte: ["Kündigung", "fristlos", "wichtiger Grund", "Miete", "Mietrückstand"],
    voraussetzungen: [
      "Mietvertrag besteht",
      "Wichtiger Grund (insb. Mietrückstand ≥ 2 Monatsmieten gem. § 543 Abs. 2 Nr. 3 BGB)",
      "Abmahnung oder deren Entbehrlichkeit",
    ],
    rechtsfolge: "Sofortige Beendigung des Mietvertrags",
  },

  // ── Arbeitsrecht ──
  {
    norm: "§ 1 KSchG",
    titel: "Unwirksamkeit sozial ungerechtfertigter Kündigung",
    bereich: "Arbeitsrecht",
    stichworte: ["Kündigung", "Arbeitnehmer", "Arbeitgeber", "Entlassung", "Kündigungsschutz"],
    voraussetzungen: [
      "Arbeitsverhältnis länger als 6 Monate (§ 1 Abs. 1 KSchG)",
      "Betrieb mit mehr als 10 Arbeitnehmern (§ 23 KSchG)",
      "Kündigung nicht sozial gerechtfertigt (keine personen-, verhaltens- oder betriebsbedingten Gründe)",
    ],
    rechtsfolge: "Kündigung ist unwirksam; Weiterbeschäftigungsanspruch oder Abfindung",
    gegenAnsprueche: ["§ 626 BGB — außerordentliche Kündigung aus wichtigem Grund"],
  },
  {
    norm: "§ 626 BGB",
    titel: "Außerordentliche Kündigung des Arbeitsverhältnisses",
    bereich: "Arbeitsrecht",
    stichworte: ["fristlose Kündigung", "wichtiger Grund", "Arbeitnehmer", "Diebstahl", "schwere Pflichtverletzung"],
    voraussetzungen: [
      "Wichtiger Grund (schwerwiegende Pflichtverletzung)",
      "Unzumutbarkeit der Fortsetzung bis zum Ablauf der ordentlichen Kündigungsfrist",
      "2-Wochen-Frist seit Kenntniserlangung (§ 626 Abs. 2 BGB)",
      "Ggf. vorherige Abmahnung",
    ],
    rechtsfolge: "Sofortige Beendigung des Arbeitsverhältnisses",
  },

  // ── Datenschutz ──
  {
    norm: "Art. 82 DSGVO",
    titel: "Schadensersatzanspruch wegen DSGVO-Verstoß",
    bereich: "Datenschutzrecht",
    stichworte: ["DSGVO", "Datenschutz", "personenbezogene Daten", "Datenpanne", "Datenschutzverletzung"],
    voraussetzungen: [
      "Verstoß gegen DSGVO-Vorschriften durch Verantwortlichen/Auftragsverarbeiter",
      "Materieller oder immaterieller Schaden",
      "Kausalität zwischen Verstoß und Schaden",
    ],
    rechtsfolge: "Schadensersatz (auch immateriell); Beweislastumkehr zulasten des Verantwortlichen",
  },
];

// ── Erkennung relevanter Normen aus Sachverhalt ────────────────────────────

function erkennerelevantNormen(sachverhalt: string, rechtsgebiet?: string): Anspruchsgrundlage[] {
  const sv = sachverhalt.toLowerCase();

  const treffer = ANSPRUCHSGRUNDLAGEN.filter((ag) => {
    // Stichwort-Matching
    const stichwortMatch = ag.stichworte.some((sw) => sv.includes(sw.toLowerCase()));
    // Rechtsgebiet-Filter: wenn angegeben, nur passende Anspruchsgrundlagen
    if (rechtsgebiet) {
      const rg = rechtsgebiet.toLowerCase();
      const bereichMatch = ag.bereich.toLowerCase().includes(rg) || ag.norm.toLowerCase().includes(rg);
      if (!bereichMatch && !stichwortMatch) return false;
      // Bereich-Match bevorzugen, aber Stichwort-Treffer nicht ausschließen
    }
    return stichwortMatch;
  });

  // Deduplizieren, max 6 zurückgeben
  return treffer.slice(0, 6);
}

// ── Gutachten-Generator ────────────────────────────────────────────────────

function erzeugeGutachten(
  sachverhalt: string,
  fragestellung: string,
  normen: Anspruchsgrundlage[],
  stil: "kurz" | "vollständig",
): string {
  const lines: string[] = [];

  lines.push("╔═══════════════════════════════════════════════════════════╗");
  lines.push("║           RECHTSGUTACHTEN — Gutachtenstil                 ║");
  lines.push("╚═══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push("  A. SACHVERHALT");
  lines.push("  ─────────────────────────────────────────────────────────");
  // Sachverhalt umbrechen
  const svLines = sachverhalt.match(/.{1,80}(\s|$)/g) ?? [sachverhalt];
  for (const l of svLines) lines.push(`  ${l.trim()}`);
  lines.push("");
  lines.push("  B. FRAGESTELLUNG");
  lines.push("  ─────────────────────────────────────────────────────────");
  lines.push(`  ${fragestellung}`);
  lines.push("");
  lines.push("  C. GUTACHTEN");
  lines.push("  ─────────────────────────────────────────────────────────");

  if (normen.length === 0) {
    lines.push("");
    lines.push("  ⚠  Keine eindeutigen Anspruchsgrundlagen aus dem");
    lines.push("     Sachverhalt erkennbar. Bitte präzisieren Sie:");
    lines.push("     – Wer ist Anspruchssteller / Anspruchsgegner?");
    lines.push("     – Welcher Schaden / welches Ziel wird verfolgt?");
    lines.push("     – Welches Rechtsgebiet ist betroffen?");
  } else {
    lines.push("");
    lines.push(`  Erkannte potenzielle Ansprüche: ${normen.length}`);
    lines.push("");

    for (let i = 0; i < normen.length; i++) {
      const ag = normen[i];
      lines.push(`  ${"─".repeat(57)}`);
      lines.push(`  ${toRomanNumeral(i + 1)}. ${ag.norm} — ${ag.titel}`);
      lines.push(`     Rechtsgebiet: ${ag.bereich}`);
      lines.push("");

      // OBERSATZ
      lines.push("  ┌─ OBERSATZ ───────────────────────────────────────────┐");
      lines.push(`  │ [Hier einsetzen: Anspruchssteller] könnte gegen       │`);
      lines.push(`  │ [Anspruchsgegner] einen Anspruch auf [Rechtsfolge]    │`);
      lines.push(`  │ gemäß ${ag.norm.padEnd(42)} │`);
      lines.push("  │ haben, wenn folgende Voraussetzungen erfüllt sind.    │");
      lines.push("  └────────────────────────────────────────────────────────┘");
      lines.push("");

      if (stil === "vollständig") {
        // DEFINITION
        lines.push("  ┌─ DEFINITION / TATBESTANDSMERKMALE ───────────────────┐");
        for (const vp of ag.voraussetzungen) {
          const wrapped = vp.match(/.{1,52}(\s|$)/g) ?? [vp];
          lines.push(`  │ ✦ ${wrapped[0].trim().padEnd(53)}│`);
          for (let w = 1; w < wrapped.length; w++) {
            lines.push(`  │   ${wrapped[w].trim().padEnd(53)}│`);
          }
        }
        lines.push("  └────────────────────────────────────────────────────────┘");
        lines.push("");

        // SUBSUMTION
        lines.push("  ┌─ SUBSUMTION ─────────────────────────────────────────┐");
        for (const vp of ag.voraussetzungen) {
          const kurz = vp.replace(/\s*\(.*?\)\s*/g, "").slice(0, 40);
          lines.push(`  │ → ${kurz.padEnd(53)}│`);
          lines.push(`  │   [Hier: Subsumtion aus Sachverhalt einfügen]       │`);
          lines.push(`  │   Ergebnis: □ erfüllt  □ fraglich  □ nicht erfüllt  │`);
        }
        lines.push("  └────────────────────────────────────────────────────────┘");
        lines.push("");

        // Sachverhalt keyword hints
        const hints = searchConceptMap(ag.norm + " " + ag.titel);
        if (hints.length > 0) {
          lines.push("  ┌─ SACHVERHALT-HINWEISE ───────────────────────────────┐");
          lines.push("  │ Relevante Begriffe für die Subsumtion:               │");
          const topHints = hints.slice(0, 4);
          for (const h of topHints) {
            const text = `${h.entry.norm}: "${h.matchedKeyword}" → ${h.entry.description}`;
            const wrapped = text.match(/.{1,53}(\s|$)/g) ?? [text];
            for (let w = 0; w < wrapped.length && w < 2; w++) {
              lines.push(`  │ ${wrapped[w].trim().padEnd(53)}│`);
            }
          }
          lines.push("  │                                                       │");
          lines.push("  │ 💡 Diese Begriffe im Sachverhalt identifizieren!     │");
          lines.push("  └────────────────────────────────────────────────────────┘");
          lines.push("");
        }
      }

      // ERGEBNIS
      lines.push("  ┌─ ERGEBNIS ───────────────────────────────────────────┐");
      lines.push(`  │ ${ag.rechtsfolge.slice(0, 53).padEnd(53)}│`);
      if (ag.rechtsfolge.length > 53) {
        lines.push(`  │ ${ag.rechtsfolge.slice(53, 106).padEnd(53)}│`);
      }
      lines.push("  │                                                       │");
      lines.push("  │ Gesamtergebnis: □ Anspruch besteht                    │");
      lines.push("  │                 □ Anspruch besteht nicht               │");
      lines.push("  │                 □ Weitere Prüfung erforderlich          │");
      lines.push("  └────────────────────────────────────────────────────────┘");

      if (ag.gegenAnsprueche && ag.gegenAnsprueche.length > 0) {
        lines.push("");
        lines.push("  ⚠  Gegenargumente / Einreden prüfen:");
        for (const ga of ag.gegenAnsprueche) {
          lines.push(`     • ${ga}`);
        }
      }
      lines.push("");
    }
  }

  lines.push("  D. ZUSAMMENFASSUNG / ERGEBNIS");
  lines.push("  ─────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("  [Hier: Gesamtergebnis des Gutachtens einfügen]");
  lines.push("");
  lines.push("  Zu prüfende Punkte:");
  for (const ag of normen) {
    lines.push(`  □ ${ag.norm} — ${ag.titel}`);
  }
  lines.push("");
  lines.push("  E. EMPFOHLENE NÄCHSTE SCHRITTE");
  lines.push("  ─────────────────────────────────────────────────────────");
  lines.push("");
  lines.push("  1. Vollständige Subsumtion für jede Anspruchsgrundlage");
  lines.push("  2. Beweislage prüfen (Beweislastverteilung je Norm)");
  lines.push("  3. Verjährungsfristen prüfen (§ 195 BGB: 3 Jahre Regelverjährung)");
  lines.push("  4. Relevante BGH-Urteile via search_case_law abrufen");
  lines.push("  5. Aktuelle Normfassung via get_law_section verifizieren");
  lines.push("");
  lines.push("  Hinweis: Dieses Gutachten ist ein KI-generiertes Gerüst.");
  lines.push("  Es ersetzt keine anwaltliche Beratung.");

  return lines.join("\n");
}

function toRomanNumeral(n: number): string {
  const map: [number, string][] = [
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let result = "";
  for (const [val, sym] of map) {
    while (n >= val) { result += sym; n -= val; }
  }
  return result;
}

// ── Schema ────────────────────────────────────────────────────────────────

export const gutachtenScaffoldSchema = z.object({
  sachverhalt: z
    .string()
    .describe(
      "Der zu prüfende Sachverhalt (Fallbeschreibung). " +
      "Beispiel: 'A kaufte von B einen Gebrauchtwagen für 8.000 €. Nach 2 Wochen " +
      "stellte sich ein versteckter Motorschaden heraus. B verweigert die Reparatur.'",
    ),
  fragestellung: z
    .string()
    .optional()
    .describe(
      "Die konkrete Rechtsfrage. Wenn weggelassen, wird automatisch generiert. " +
      "Beispiel: 'Hat A einen Anspruch auf Nacherfüllung oder Rücktritt?'",
    ),
  rechtsgebiet: z
    .string()
    .optional()
    .describe(
      "Rechtsgebiet zur Einschränkung (z.B. 'Kaufrecht', 'Mietrecht', 'Arbeitsrecht', 'Datenschutz'). " +
      "Wenn weggelassen, werden alle relevanten Normen geprüft.",
    ),
  stil: z
    .enum(["kurz", "vollständig"])
    .default("vollständig")
    .describe(
      "'kurz': Nur Obersatz + Ergebnis pro Anspruchsgrundlage. " +
      "'vollständig': Vollständiger Gutachtenstil mit Definition und Subsumtion.",
    ),
});

export type GutachtenScaffoldInput = z.infer<typeof gutachtenScaffoldSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function gutachtenScaffold(input: GutachtenScaffoldInput): Promise<string> {
  const fragestellung = input.fragestellung
    ?? "Welche Ansprüche bestehen aus dem geschilderten Sachverhalt?";

  const relevanteNormen = erkennerelevantNormen(input.sachverhalt, input.rechtsgebiet);

  return erzeugeGutachten(
    input.sachverhalt,
    fragestellung,
    relevanteNormen,
    input.stil,
  );
}
