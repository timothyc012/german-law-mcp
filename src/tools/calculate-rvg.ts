/**
 * calculate-rvg.ts
 *
 * RVG (Rechtsanwaltsvergütungsgesetz) Gebührenberechnung
 *
 * Berechnet Anwaltsgebühren nach dem Rechtsanwaltsvergütungsgesetz (RVG)
 * anhand des Streitwerts, der Instanz und der Verfahrensart.
 *
 * Datenquelle: RVG Anlage 2 (Streitwerttabelle), §§ 13, 49 RVG
 * Stand: RVG i.d.F. vom 01.01.2021 (Kostenrechtsänderungsgesetz 2021)
 */

import { z } from "zod";

// ── Streitwerttabelle (RVG Anlage 2, § 13 Abs. 1) ──────────────────────────
// Format: [bis_streitwert_einschließlich, gebühr_einheit]
// Gebühreneinheit in Cent (um Fließkomma-Fehler zu vermeiden)
const RVG_TABELLE: Array<[number, number]> = [
  [500,      49_00],
  [1000,     88_00],
  [1500,    127_00],
  [2000,    166_00],
  [3000,    222_00],
  [4000,    278_00],
  [5000,    334_00],
  [6000,    390_00],
  [7000,    446_00],
  [8000,    502_00],
  [9000,    558_00],
  [10000,   614_00],
  [13000,   714_00],
  [16000,   814_00],
  [19000,   914_00],
  [22000,  1014_00],
  [25000,  1114_00],
  [30000,  1264_00],
  [35000,  1414_00],
  [40000,  1564_00],
  [45000,  1714_00],
  [50000,  1864_00],
  [65000,  2134_00],
  [80000,  2404_00],
  [95000,  2674_00],
  [110000, 2944_00],
  [125000, 3214_00],
  [140000, 3484_00],
  [155000, 3754_00],
  [170000, 4024_00],
  [185000, 4294_00],
  [200000, 4564_00],
  [230000, 4924_00],
  [260000, 5284_00],
  [290000, 5644_00],
  [320000, 6004_00],
  [350000, 6364_00],
  [380000, 6724_00],
  [410000, 7084_00],
  [440000, 7444_00],
  [470000, 7804_00],
  [500000, 8164_00],
];

// Über 500.000 €: Für jede angefangenen 50.000 € mehr → +679 €
function getGebuehreneinheit(streitwert: number): number {
  for (const [bis, einheit] of RVG_TABELLE) {
    if (streitwert <= bis) return einheit;
  }
  // Über 500.000 €
  const ueber = streitwert - 500_000;
  const stufen = Math.ceil(ueber / 50_000);
  return 816400 + stufen * 67900; // in Cent
}

// ── Gebührentatbestände nach VV RVG (Vergütungsverzeichnis) ──────────────────
// Gebührenfaktor × Gebühreneinheit = Gebühr

interface GebuehrentatbestandDef {
  name: string;
  nummer: string; // VV-Nummer
  faktor: number;
  beschreibung: string;
  instanzen: string[]; // welche Instanzen haben diesen Tatbestand
}

const GEBUEHRENTATBESTAENDE: Record<string, GebuehrentatbestandDef[]> = {
  // Zivilrecht
  streitig: [
    { name: "Verfahrensgebühr", nummer: "VV 3100", faktor: 1.3, beschreibung: "Für das Betreiben des Geschäfts einschließlich der Information des Mandanten", instanzen: ["AG", "LG", "OLG", "BGH"] },
    { name: "Terminsgebühr", nummer: "VV 3104", faktor: 1.2, beschreibung: "Für die Wahrnehmung von Terminen in gerichtlichen Verfahren", instanzen: ["AG", "LG", "OLG", "BGH"] },
    { name: "Einigungsgebühr", nummer: "VV 1000", faktor: 1.5, beschreibung: "Für die Mitwirkung beim Abschluss eines Vertrags, durch den der Streit beigelegt wird", instanzen: ["AG", "LG", "OLG", "BGH"] },
  ],
  mahnverfahren: [
    { name: "Verfahrensgebühr (Mahnverfahren)", nummer: "VV 3305", faktor: 0.5, beschreibung: "Verfahrensgebühr im Mahnverfahren", instanzen: ["AG"] },
    { name: "Verfahrensgebühr (streitiges Verfahren nach Widerspruch)", nummer: "VV 3100", faktor: 0.8, beschreibung: "Anrechnung der Mahnverfahrensgebühr auf die Prozessgebühr nach Widerspruch (VV 3305 Abs. 2)", instanzen: ["AG", "LG"] },
  ],
  einstweilige_verfuegung: [
    { name: "Verfahrensgebühr (eV ohne mündliche Verhandlung)", nummer: "VV 3100", faktor: 1.3, beschreibung: "Verfahrensgebühr für Verfügungsverfahren", instanzen: ["AG", "LG", "OLG"] },
    { name: "Terminsgebühr (bei mündlicher Verhandlung)", nummer: "VV 3104", faktor: 1.2, beschreibung: "Terminsgebühr bei Erörterungstermin oder mündlicher Verhandlung", instanzen: ["AG", "LG", "OLG"] },
  ],
  beratung: [
    { name: "Beratungsgebühr (Erstberatung Verbraucher, max.)", nummer: "VV 2102", faktor: 0, beschreibung: "Angemessene Vergütung, max. 190 € netto für Verbraucher (§ 34 RVG)", instanzen: ["–"] },
    { name: "Geschäftsgebühr (außergerichtlich)", nummer: "VV 2300", faktor: 1.3, beschreibung: "Für das außergerichtliche Betreiben des Geschäfts (Regelgebühr 1,3; bis 2,5 bei umfangreich/schwierig)", instanzen: ["–"] },
  ],
  arbeitsrecht: [
    { name: "Verfahrensgebühr (ArbG)", nummer: "VV 3100", faktor: 1.3, beschreibung: "Verfahrensgebühr vor dem Arbeitsgericht", instanzen: ["ArbG"] },
    { name: "Terminsgebühr (ArbG)", nummer: "VV 3104", faktor: 1.2, beschreibung: "Terminsgebühr vor dem Arbeitsgericht (Gütetermin + Kammertermin)", instanzen: ["ArbG"] },
    { name: "Einigungsgebühr (Vergleich)", nummer: "VV 1000", faktor: 1.5, beschreibung: "Einigungsgebühr für gerichtlichen Vergleich oder Abwicklungsvereinbarung", instanzen: ["ArbG"] },
  ],
  strafrecht: [
    { name: "Grundgebühr", nummer: "VV 4100", faktor: 1.0, beschreibung: "Grundgebühr für das gesamte Strafverfahren (einmaliger Anfall)", instanzen: ["AG", "LG", "OLG"] },
    { name: "Verfahrensgebühr (Vorverfahren)", nummer: "VV 4104", faktor: 1.0, beschreibung: "Verfahrensgebühr im vorbereitenden Verfahren (Ermittlungsverfahren)", instanzen: ["AG", "LG", "OLG"] },
    { name: "Verfahrensgebühr (Hauptverfahren AG)", nummer: "VV 4106", faktor: 1.0, beschreibung: "Verfahrensgebühr im Verfahren vor dem Strafrichter/Schöffengericht", instanzen: ["AG"] },
    { name: "Terminsgebühr (Hauptverhandlung)", nummer: "VV 4108", faktor: 1.0, beschreibung: "Terminsgebühr für die Hauptverhandlung (je Verhandlungstag)", instanzen: ["AG", "LG", "OLG"] },
  ],
};

// Instanz-Multiplikator (Berufung/Revision erhöhen Gebühr)
const INSTANZ_FAKTOR: Record<string, number> = {
  AG: 1.0,
  LG: 1.0,
  ArbG: 1.0,
  OLG: 1.0,  // Berufung: gleiche Tabelle, aber Streitwert ggf. anders
  BGH: 1.0,  // Revision: gleiches Tabellensystem
  LAG: 1.0,
  BAG: 1.0,
};

// ── Auslagen (Pauschale nach VV 7002) ─────────────────────────────────────
// Post- und Telekommunikationspauschale: 20% der Gebühren, max. 20 €
function calcAuslagen(gebuehrenSumme: number): number {
  return Math.min(2000, Math.round(gebuehrenSumme * 0.2)); // in Cent
}

// ── Schema ────────────────────────────────────────────────────────────────

export const calculateRvgSchema = z.object({
  streitwert: z
    .number()
    .positive()
    .describe("Streitwert / Gegenstandswert in EUR (z.B. 50000 für 50.000 €)"),
  instanz: z
    .enum(["AG", "LG", "OLG", "BGH", "ArbG", "LAG", "BAG"])
    .default("LG")
    .describe("Gerichtliche Instanz"),
  verfahren: z
    .enum(["streitig", "mahnverfahren", "einstweilige_verfuegung", "beratung", "arbeitsrecht", "strafrecht"])
    .default("streitig")
    .describe("Art des Verfahrens"),
  mwst: z
    .boolean()
    .default(true)
    .describe("Mit Mehrwertsteuer (19%) ausweisen"),
  nur_verfahrensgebuehr: z
    .boolean()
    .default(false)
    .describe("Nur Verfahrensgebühr berechnen (ohne Termin- und Einigungsgebühr)"),
});

export type CalculateRvgInput = z.infer<typeof calculateRvgSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function calculateRvg(input: CalculateRvgInput): Promise<string> {
  const { streitwert, instanz, verfahren, mwst, nur_verfahrensgebuehr } = input;

  // Sonderfall Strafrecht: Tabelle nach § 49 RVG (Rahmengebühren), nicht § 13
  if (verfahren === "strafrecht") {
    return calculateStrafrechtlich(streitwert, instanz, mwst);
  }

  // Sonderfall Erstberatung Verbraucher
  if (verfahren === "beratung") {
    return calculateBeratung(streitwert, mwst);
  }

  // Normale Tabellen-Gebühr (§ 13 RVG)
  const einheitCent = getGebuehreneinheit(streitwert);
  const tatbestaende = GEBUEHRENTATBESTAENDE[verfahren] ?? GEBUEHRENTATBESTAENDE["streitig"];

  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  RVG-GEBÜHRENBERECHNUNG");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push(`  Streitwert:  ${formatEuro(streitwert)}`);
  lines.push(`  Instanz:     ${instanz}`);
  lines.push(`  Verfahren:   ${verfahrenLabel(verfahren)}`);
  lines.push(`  Gebühreneinheit (§ 13 RVG Anlage 2): ${formatEuroCent(einheitCent)}`);
  lines.push("───────────────────────────────────────────────────────");

  let gesamtNettoCent = 0;
  const rows: Array<{ bezeichnung: string; vv: string; faktor: string; betrag: number }> = [];

  for (const tb of tatbestaende) {
    if (nur_verfahrensgebuehr && tb.name !== "Verfahrensgebühr" && !tb.name.startsWith("Verfahrensgebühr")) {
      continue;
    }
    if (tb.faktor === 0) continue; // Sonderfall Erstberatung separat

    const betragCent = Math.round(einheitCent * tb.faktor);
    gesamtNettoCent += betragCent;
    rows.push({
      bezeichnung: tb.name,
      vv: tb.nummer,
      faktor: tb.faktor.toFixed(1),
      betrag: betragCent,
    });
  }

  // Tabelle ausgeben
  const maxNameLen = Math.max(...rows.map((r) => r.bezeichnung.length), 20);
  for (const row of rows) {
    const name = row.bezeichnung.padEnd(maxNameLen);
    lines.push(`  ${name}  ${row.vv}  ×${row.faktor}  ${formatEuroCent(row.betrag).padStart(10)}`);
  }

  lines.push("───────────────────────────────────────────────────────");

  // Auslagen VV 7002
  const auslagenCent = calcAuslagen(gesamtNettoCent);
  lines.push(`  ${"Post-/Telekommunikationspauschale (VV 7002)".padEnd(maxNameLen)}  ${"".padStart(17)}  ${formatEuroCent(auslagenCent).padStart(10)}`);
  gesamtNettoCent += auslagenCent;

  lines.push("───────────────────────────────────────────────────────");
  lines.push(`  ${"Zwischensumme (netto)".padEnd(maxNameLen + 23)}  ${formatEuroCent(gesamtNettoCent).padStart(10)}`);

  if (mwst) {
    const mwstCent = Math.round(gesamtNettoCent * 0.19);
    const gesamtBruttoCent = gesamtNettoCent + mwstCent;
    lines.push(`  ${"Umsatzsteuer 19% (VV 7008)".padEnd(maxNameLen + 23)}  ${formatEuroCent(mwstCent).padStart(10)}`);
    lines.push("═══════════════════════════════════════════════════════");
    lines.push(`  ${"GESAMT (brutto)".padEnd(maxNameLen + 23)}  ${formatEuroCent(gesamtBruttoCent).padStart(10)}`);
  } else {
    lines.push("═══════════════════════════════════════════════════════");
    lines.push(`  ${"GESAMT (netto)".padEnd(maxNameLen + 23)}  ${formatEuroCent(gesamtNettoCent).padStart(10)}`);
  }

  lines.push("");
  lines.push("  Hinweise:");
  lines.push("  • Gebühren nach RVG i.d.F. Kostenrechtsänderungsgesetz 2021");
  lines.push("  • Einigungsgebühr fällt nur bei tatsächlichem Vergleich an");
  lines.push("  • Terminsgebühr fällt nur bei Wahrnehmung eines Termins an");
  lines.push("  • Mehrere Auftraggeber: Erhöhungsgebühr VV 1008 ggf. anwendbar");
  lines.push("  • Strafrecht/Sozialrecht: Rahmengebühren nach § 14 RVG");
  lines.push("");
  lines.push("  Rechtsgrundlagen: §§ 13, 14 RVG; VV RVG Nrn. 1000, 3100, 3104, 7002, 7008");

  return lines.join("\n");
}

// ── Strafrecht (Rahmengebühren § 49 RVG) ─────────────────────────────────
function calculateStrafrechtlich(streitwert: number, instanz: string, mwst: boolean): string {
  // Strafrecht: Rahmengebühren aus VV 4100 ff. — keine Streitwert-Tabelle
  // Mittelgebühr (§ 14 RVG: Mittel aus Mindest und Höchst)
  const rahmenGebuehren: Record<string, { min: number; max: number; name: string; vv: string }[]> = {
    AG: [
      { name: "Grundgebühr", vv: "VV 4100", min: 40_00, max: 360_00 },
      { name: "Verfahrensgebühr (Vorverfahren)", vv: "VV 4104", min: 30_00, max: 250_00 },
      { name: "Verfahrensgebühr (Hauptverfahren)", vv: "VV 4106", min: 40_00, max: 290_00 },
      { name: "Terminsgebühr", vv: "VV 4108", min: 70_00, max: 430_00 },
    ],
    LG: [
      { name: "Grundgebühr", vv: "VV 4100", min: 40_00, max: 360_00 },
      { name: "Verfahrensgebühr (Vorverfahren)", vv: "VV 4104", min: 30_00, max: 250_00 },
      { name: "Verfahrensgebühr (Hauptverfahren LG)", vv: "VV 4112", min: 85_00, max: 700_00 },
      { name: "Terminsgebühr", vv: "VV 4114", min: 140_00, max: 840_00 },
    ],
  };

  const gebuehren = rahmenGebuehren[instanz] ?? rahmenGebuehren["AG"];
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  RVG-GEBÜHRENBERECHNUNG (STRAFRECHT — Rahmengebühren)");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push(`  Instanz:  ${instanz}`);
  lines.push("  Grundlage: §§ 14, 49 RVG; VV 4100 ff.");
  lines.push("  Die Gebührenhöhe richtet sich nach § 14 RVG (Umfang, Schwierigkeit,");
  lines.push("  Bedeutung, wirtschaftliche Verhältnisse). Hier: Mittelgebühr.");
  lines.push("───────────────────────────────────────────────────────");

  let gesamtCent = 0;
  for (const g of gebuehren) {
    const mittel = Math.round((g.min + g.max) / 2);
    gesamtCent += mittel;
    lines.push(`  ${g.name.padEnd(42)}  ${g.vv}  ${formatEuroCent(g.min).padStart(9)} – ${formatEuroCent(g.max).padStart(9)}  Mittel: ${formatEuroCent(mittel).padStart(9)}`);
  }

  const auslagen = calcAuslagen(gesamtCent);
  gesamtCent += auslagen;
  lines.push("───────────────────────────────────────────────────────");
  lines.push(`  Post-/Telekommunikationspauschale (VV 7002)${"".padEnd(12)}  Mittel: ${formatEuroCent(auslagen).padStart(9)}`);
  lines.push("───────────────────────────────────────────────────────");

  if (mwst) {
    const mwstCent = Math.round(gesamtCent * 0.19);
    lines.push(`  Netto: ${formatEuroCent(gesamtCent)}  +  19% MwSt: ${formatEuroCent(mwstCent)}`);
    lines.push(`  GESAMT (brutto, Mittelgebühr): ${formatEuroCent(gesamtCent + mwstCent)}`);
  } else {
    lines.push(`  GESAMT (netto, Mittelgebühr): ${formatEuroCent(gesamtCent)}`);
  }

  return lines.join("\n");
}

// ── Beratung (§ 34 RVG) ───────────────────────────────────────────────────
function calculateBeratung(streitwert: number, mwst: boolean): string {
  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  RVG-GEBÜHRENBERECHNUNG (BERATUNG — § 34 RVG)");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("");
  lines.push("  ERSTBERATUNG (Verbraucher):");
  lines.push("  • Angemessene Vergütung nach § 34 Abs. 1 RVG");
  lines.push("  • Gesetzliche Höchstgrenze: 190,00 € netto");
  lines.push(`  • Zzgl. 19% MwSt: ${mwst ? "35,10 €" : "(ohne MwSt)"}`);
  lines.push(`  • Maximum brutto: ${mwst ? "226,10 €" : "190,00 €"}`);
  lines.push("");
  lines.push("  FOLGEBERATUNG / GESCHÄFTSGEBÜHR (VV 2300):");
  const einheitCent = getGebuehreneinheit(Math.max(streitwert, 500));
  const geschaeftsCent = Math.round(einheitCent * 1.3);
  const auslagen = calcAuslagen(geschaeftsCent);
  const nettoGesamt = geschaeftsCent + auslagen;
  const bruttoGesamt = mwst ? Math.round(nettoGesamt * 1.19) : nettoGesamt;
  lines.push(`  Gegenstandswert: ${formatEuro(streitwert)}`);
  lines.push(`  Gebühreneinheit: ${formatEuroCent(einheitCent)}`);
  lines.push(`  Geschäftsgebühr ×1,3 (VV 2300):  ${formatEuroCent(geschaeftsCent)}`);
  lines.push(`  Auslagenpauschale (VV 7002):      ${formatEuroCent(auslagen)}`);
  if (mwst) {
    lines.push(`  MwSt 19% (VV 7008):               ${formatEuroCent(Math.round(nettoGesamt * 0.19))}`);
  }
  lines.push(`  GESAMT: ${formatEuroCent(bruttoGesamt)}`);
  lines.push("");
  lines.push("  Hinweis: Geschäftsgebühr kann 0,5–2,5-fach betragen (§ 14 RVG).");
  lines.push("  Bei gerichtlichem Verfahren wird die Hälfte der Geschäftsgebühr");
  lines.push("  auf die Verfahrensgebühr angerechnet (VV 3100 Anm. Abs. 4).");

  return lines.join("\n");
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
function formatEuroCent(cent: number): string {
  const euros = cent / 100;
  return euros.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function verfahrenLabel(v: string): string {
  const labels: Record<string, string> = {
    streitig: "Streitiges Verfahren",
    mahnverfahren: "Mahnverfahren",
    einstweilige_verfuegung: "Einstweilige Verfügung",
    beratung: "Beratung / außergerichtlich",
    arbeitsrecht: "Arbeitsrecht",
    strafrecht: "Strafrecht",
  };
  return labels[v] ?? v;
}
