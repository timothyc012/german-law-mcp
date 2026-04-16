/**
 * calculate-frist.ts
 *
 * ZPO / BGB Fristenberechnung für deutsche Anwälte
 *
 * Berechnet Prozessfristen nach §§ 186–193 ZPO, § 222 ZPO sowie
 * anwaltsrelevante Fristen aus BGB, KSchG, InsO, ArbGG etc.
 *
 * Berücksichtigt:
 * - Fristberechnung nach §§ 186–188 BGB (via § 222 ZPO)
 * - Wochenend-/Feiertagsverschiebung (§ 193 BGB / § 222 Abs. 2 ZPO)
 * - Gesetzliche Feiertage aller 16 Bundesländer
 */

import { z } from "zod";

// ── Feiertage ─────────────────────────────────────────────────────────────
// Berechnet Ostersonntag (Gaußsche Osterformel)
function getOstersonntag(jahr: number): Date {
  const a = jahr % 19;
  const b = Math.floor(jahr / 100);
  const c = jahr % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(jahr, monat - 1, tag);
}

function addTage(d: Date, tage: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + tage);
  return r;
}

// Buß- und Bettag: Mittwoch vor dem letzten Sonntag des Kirchenjahres
// = 11 Tage vor dem 1. Advent (1. Advent = 4. Sonntag vor 25.12.)
function getBussUndBettag(jahr: number): Date {
  // 1. Advent = erster Sonntag am oder nach 27. November
  const nov27 = new Date(jahr, 10, 27); // Nov 27
  const dow = nov27.getDay(); // 0=Sonntag
  const daysToSunday = dow === 0 ? 0 : 7 - dow;
  const ersterAdvent = new Date(jahr, 10, 27 + daysToSunday);
  // Buß- und Bettag = 11 Tage vor dem 1. Advent (Mittwoch)
  return addTage(ersterAdvent, -11);
}

// Bundesweite Feiertage (alle Länder)
function getBundesweiteFeiertageDates(jahr: number): Date[] {
  const ostern = getOstersonntag(jahr);
  return [
    new Date(jahr, 0, 1),    // Neujahr
    addTage(ostern, -2),     // Karfreitag
    addTage(ostern, 1),      // Ostermontag
    new Date(jahr, 4, 1),    // Tag der Arbeit
    addTage(ostern, 39),     // Christi Himmelfahrt
    addTage(ostern, 50),     // Pfingstmontag
    new Date(jahr, 9, 3),    // Tag der Deutschen Einheit
    new Date(jahr, 11, 25),  // 1. Weihnachtstag
    new Date(jahr, 11, 26),  // 2. Weihnachtstag
  ];
}

// Landesspezifische Feiertage
const LANDES_FEIERTAGE: Record<string, (jahr: number, ostern: Date) => Date[]> = {
  BW: (j, o) => [
    new Date(j, 0, 6),         // Heilige Drei Könige
    addTage(o, 60),             // Fronleichnam
    new Date(j, 10, 1),         // Allerheiligen
  ],
  BY: (j, o) => [
    new Date(j, 0, 6),          // Heilige Drei Könige
    addTage(o, 60),              // Fronleichnam
    new Date(j, 7, 15),          // Mariä Himmelfahrt
    new Date(j, 10, 1),          // Allerheiligen
  ],
  BE: (j) => j >= 2019 ? [new Date(j, 2, 8)] : [], // Internationaler Frauentag (seit 2019)
  BB: (j, o) => [
    new Date(o),                                            // Ostersonntag (§ 1 Abs. 2 Nr. 2 BbgFTG)
    new Date(j, 9, 31),                                     // Reformationstag
    ...(j >= 2024 ? [new Date(j, 2, 8)] : []),              // Internationaler Frauentag (seit 2024, § 1 Abs. 2 Nr. 10 BbgFTG)
    // Hinweis: Fronleichnam ist in BB kein landesweiter Feiertag (nur bestimmte Gemeinden)
  ],
  HB: (j) => [new Date(j, 9, 31)], // Reformationstag
  HH: (j) => [new Date(j, 9, 31)], // Reformationstag
  HE: (_j, o) => [addTage(o, 60)],  // Fronleichnam
  MV: (j) => [
    new Date(j, 9, 31),                                     // Reformationstag
    ...(j >= 2023 ? [new Date(j, 2, 8)] : []),              // Internationaler Frauentag (seit 2023, § 2 Nr. 10 MV-FTG)
  ],
  NI: (j) => [new Date(j, 9, 31)], // Reformationstag
  NW: (j, o) => [addTage(o, 60), new Date(j, 10, 1)], // Fronleichnam, Allerheiligen
  RP: (j, o) => [addTage(o, 60), new Date(j, 10, 1)], // Fronleichnam, Allerheiligen
  SL: (j, o) => [addTage(o, 60), new Date(j, 7, 15), new Date(j, 10, 1)],
  SN: (j) => [
    new Date(j, 9, 31),                                     // Reformationstag
    getBussUndBettag(j),                                    // Buß- und Bettag (dynamisch, § 5 Abs. 2 SächsSFG)
    // Hinweis: Fronleichnam gilt in SN nur in bestimmten Gemeinden (kein landesweiter Feiertag)
  ],
  ST: (j, o) => [new Date(j, 0, 6), addTage(o, 60), new Date(j, 9, 31)],
  SH: (j) => [new Date(j, 9, 31)],
  TH: (j) => [
    ...(j >= 2019 ? [new Date(j, 8, 20)] : []),              // Weltkindertag (seit 2019, § 2 ThürFTG)
    new Date(j, 9, 31),                                     // Reformationstag
    // Hinweis: Fronleichnam gilt in TH nur in bestimmten Gemeinden (kein landesweiter Feiertag)
  ],
};

function getFeiertageDates(jahr: number, bundesland: string): Set<string> {
  const ostern = getOstersonntag(jahr);
  const alle: Date[] = [...getBundesweiteFeiertageDates(jahr)];

  const landesFn = LANDES_FEIERTAGE[bundesland];
  if (landesFn) {
    alle.push(...landesFn(jahr, ostern));
  }

  return new Set(alle.map((d) => toIsoDate(d)));
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseIsoCalendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }

  const jahr = Number(match[1]);
  const monat = Number(match[2]);
  const tag = Number(match[3]);
  const date = new Date(jahr, monat - 1, tag, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== jahr ||
    date.getMonth() !== monat - 1 ||
    date.getDate() !== tag
  ) {
    return null;
  }

  return date;
}

function isValidIsoCalendarDate(value: string): boolean {
  return parseIsoCalendarDate(value) !== null;
}

function istWochenende(d: Date): boolean {
  const dow = d.getDay();
  return dow === 0 || dow === 6;
}

// § 193 BGB / § 222 Abs. 2 ZPO: Fällt Fristende auf Samstag, Sonntag oder
// gesetzlichen Feiertag, endet die Frist am nächsten Werktag
function verschiebeAufWerktag(d: Date, bundesland: string): Date {
  let current = new Date(d);
  // Feiertage für das Jahr des Fristablaufs + ggf. nächstes Jahr
  const feiertage = new Set([
    ...getFeiertageDates(current.getFullYear(), bundesland),
    ...getFeiertageDates(current.getFullYear() + 1, bundesland),
  ]);

  while (istWochenende(current) || feiertage.has(toIsoDate(current))) {
    current = addTage(current, 1);
  }
  return current;
}

const WOCHENTAGE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const MONATE = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
const BUNDESLAND_NAMEN: Record<string, string> = {
  BW: "Baden-Württemberg", BY: "Bayern", BE: "Berlin", BB: "Brandenburg",
  HB: "Bremen", HH: "Hamburg", HE: "Hessen", MV: "Mecklenburg-Vorpommern",
  NI: "Niedersachsen", NW: "Nordrhein-Westfalen", RP: "Rheinland-Pfalz",
  SL: "Saarland", SN: "Sachsen", ST: "Sachsen-Anhalt", SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

function formatDatum(d: Date): string {
  return `${d.getDate()}. ${MONATE[d.getMonth()]} ${d.getFullYear()} (${WOCHENTAGE[d.getDay()]})`;
}

function getMonatsende(jahr: number, monatIndex: number): Date {
  return new Date(jahr, monatIndex + 1, 0, 12, 0, 0, 0);
}

function istMietrechtWerktag(d: Date, bundesland: string): boolean {
  if (d.getDay() === 0) {
    return false;
  }

  const feiertage = getFeiertageDates(d.getFullYear(), bundesland);
  return !feiertage.has(toIsoDate(d));
}

function getDritterWerktagDesMonats(jahr: number, monatIndex: number, bundesland: string): Date {
  let count = 0;

  for (let tag = 1; tag <= 31; tag++) {
    const current = new Date(jahr, monatIndex, tag, 12, 0, 0, 0);
    if (current.getMonth() !== monatIndex) {
      break;
    }

    if (istMietrechtWerktag(current, bundesland)) {
      count += 1;
      if (count === 3) {
        return current;
      }
    }
  }

  throw new Error(`Dritter Werktag konnte nicht ermittelt werden: ${jahr}-${String(monatIndex + 1).padStart(2, "0")}`);
}

function berechneMietkuendigungMonatsende(
  zugangsdatum: Date,
  bundesland: string,
  kuendigungsmonate: number,
): { fristende: Date; dritterWerktag: Date; laufenderMonatZaehlt: boolean } {
  const jahr = zugangsdatum.getFullYear();
  const monatIndex = zugangsdatum.getMonth();
  const dritterWerktag = getDritterWerktagDesMonats(jahr, monatIndex, bundesland);
  const laufenderMonatZaehlt = zugangsdatum.getTime() <= dritterWerktag.getTime();
  const monateBisMonatsende = laufenderMonatZaehlt ? kuendigungsmonate - 1 : kuendigungsmonate;
  const zielmonatIndex = monatIndex + monateBisMonatsende;
  const zieljahr = jahr + Math.floor(zielmonatIndex / 12);
  const zielmonatImJahr = ((zielmonatIndex % 12) + 12) % 12;

  return {
    fristende: getMonatsende(zieljahr, zielmonatImJahr),
    dritterWerktag,
    laufenderMonatZaehlt,
  };
}

// ── Fristtypen ────────────────────────────────────────────────────────────

interface FristDef {
  bezeichnung: string;
  gesetz: string;
  laenge: { einheit: "tage" | "monate" | "wochen"; wert: number };
  beschreibung: string;
  berechnung: "ab_ereignis" | "ab_zustellung";
  fristwahrung_hinweis?: string;
}

const FRISTTYPEN: Record<string, FristDef> = {
  // ── Zivilprozess ──────────────────────────────────────────────────────
  berufung: {
    bezeichnung: "Berufungsfrist",
    gesetz: "§ 517 ZPO",
    laenge: { einheit: "monate", wert: 1 },
    beschreibung: "Die Berufung muss innerhalb eines Monats nach Zustellung des Urteils eingelegt werden.",
    berechnung: "ab_zustellung",
    fristwahrung_hinweis: "Zusätzlich: Berufungsbegründungsfrist weitere 2 Monate (§ 520 ZPO), verlängerbar!",
  },
  berufungsbegruendung: {
    bezeichnung: "Berufungsbegründungsfrist",
    gesetz: "§ 520 Abs. 2 ZPO",
    laenge: { einheit: "monate", wert: 2 },
    beschreibung: "Die Berufung muss innerhalb von 2 Monaten ab Zustellung des Urteils begründet werden. Auf Antrag verlängerbar.",
    berechnung: "ab_zustellung",
    fristwahrung_hinweis: "Verlängerung auf Antrag möglich, wenn die Gegenseite einwilligt oder erhebliche Gründe vorliegen.",
  },
  revision: {
    bezeichnung: "Revisionsfrist",
    gesetz: "§ 548 ZPO",
    laenge: { einheit: "monate", wert: 1 },
    beschreibung: "Die Revision muss innerhalb eines Monats nach Zustellung des Berufungsurteils eingelegt werden.",
    berechnung: "ab_zustellung",
    fristwahrung_hinweis: "Revisionsbegründungsfrist: weitere 2 Monate (§ 551 ZPO), verlängerbar.",
  },
  widerspruch_mahnbescheid: {
    bezeichnung: "Widerspruchsfrist (Mahnbescheid)",
    gesetz: "§ 694 Abs. 1 ZPO",
    laenge: { einheit: "wochen", wert: 2 },
    beschreibung: "Widerspruch gegen den Mahnbescheid muss innerhalb von 2 Wochen nach Zustellung eingelegt werden.",
    berechnung: "ab_zustellung",
  },
  einspruch_vollstreckungsbescheid: {
    bezeichnung: "Einspruchsfrist (Vollstreckungsbescheid)",
    gesetz: "§ 700 Abs. 1 ZPO i.V.m. § 339 ZPO",
    laenge: { einheit: "wochen", wert: 2 },
    beschreibung: "Einspruch gegen den Vollstreckungsbescheid innerhalb von 2 Wochen nach Zustellung.",
    berechnung: "ab_zustellung",
  },
  einspruch_versaeumnisurteil: {
    bezeichnung: "Einspruchsfrist (Versäumnisurteil)",
    gesetz: "§ 339 Abs. 1 ZPO",
    laenge: { einheit: "wochen", wert: 2 },
    beschreibung: "Einspruch gegen ein Versäumnisurteil innerhalb von 2 Wochen nach Zustellung.",
    berechnung: "ab_zustellung",
  },
  klageerwiderung: {
    bezeichnung: "Frist zur Klageerwiderung",
    gesetz: "§ 276 Abs. 1 ZPO",
    laenge: { einheit: "wochen", wert: 2 },
    beschreibung: "Klageerwiderung grundsätzlich 2 Wochen nach Zustellung der Klageschrift (kann vom Gericht verlängert werden).",
    berechnung: "ab_zustellung",
  },
  nichtzulassungsbeschwerde: {
    bezeichnung: "Nichtzulassungsbeschwerde",
    gesetz: "§ 544 Abs. 3 ZPO",
    laenge: { einheit: "monate", wert: 1 },
    beschreibung: "Beschwerde gegen Nichtzulassung der Revision innerhalb eines Monats nach Zustellung des Berufungsurteils.",
    berechnung: "ab_zustellung",
  },
  // ── Arbeitsrecht ──────────────────────────────────────────────────────
  kuendigungsschutzklage: {
    bezeichnung: "Klagefrist Kündigungsschutz (KSchG)",
    gesetz: "§ 4 KSchG",
    laenge: { einheit: "wochen", wert: 3 },
    beschreibung: "Klage gegen eine Kündigung muss innerhalb von 3 Wochen nach Zugang der Kündigung beim Arbeitsgericht eingereicht werden.",
    berechnung: "ab_ereignis",
    fristwahrung_hinweis: "ACHTUNG: Versäumnis der Frist führt zur Fiktion der Rechtswirksamkeit der Kündigung (§ 7 KSchG)! Nachträgliche Zulassung möglich (§ 5 KSchG).",
  },
  berufung_arbeitsgericht: {
    bezeichnung: "Berufungsfrist (Arbeitsgericht)",
    gesetz: "§ 66 Abs. 1 ArbGG",
    laenge: { einheit: "monate", wert: 1 },
    beschreibung: "Berufung gegen Urteile des Arbeitsgerichts innerhalb eines Monats nach Zustellung.",
    berechnung: "ab_zustellung",
    fristwahrung_hinweis: "Begründungsfrist: 2 Monate ab Zustellung (§ 66 Abs. 1 S. 1 ArbGG), verlängerbar.",
  },
  // ── Strafrecht ────────────────────────────────────────────────────────
  berufung_strafrecht: {
    bezeichnung: "Berufungsfrist (Strafrecht)",
    gesetz: "§ 317 Abs. 1 StPO",
    laenge: { einheit: "wochen", wert: 1 },
    beschreibung: "Berufung gegen Urteile des Amtsgerichts innerhalb einer Woche nach Urteilsverkündung.",
    berechnung: "ab_ereignis",
  },
  revision_strafrecht: {
    bezeichnung: "Revisionsfrist (Strafrecht)",
    gesetz: "§ 341 Abs. 1 StPO",
    laenge: { einheit: "wochen", wert: 1 },
    beschreibung: "Revision muss innerhalb einer Woche nach Urteilsverkündung eingelegt werden.",
    berechnung: "ab_ereignis",
  },
  // ── Verwaltungsrecht ──────────────────────────────────────────────────
  widerspruch_verwaltungsakt: {
    bezeichnung: "Widerspruchsfrist (Verwaltungsakt)",
    gesetz: "§ 70 Abs. 1 VwGO",
    laenge: { einheit: "monate", wert: 1 },
    beschreibung: "Widerspruch gegen einen Verwaltungsakt innerhalb eines Monats nach Bekanntgabe.",
    berechnung: "ab_zustellung",
    fristwahrung_hinweis: "Ohne Rechtsbehelfsbelehrung: 1 Jahr Frist (§ 58 Abs. 2 VwGO).",
  },
  anfechtungsklage_vg: {
    bezeichnung: "Anfechtungsklage (Verwaltungsgericht)",
    gesetz: "§ 74 Abs. 1 VwGO",
    laenge: { einheit: "monate", wert: 1 },
    beschreibung: "Anfechtungsklage innerhalb eines Monats nach Bekanntgabe des Widerspruchsbescheids.",
    berechnung: "ab_zustellung",
  },
  // ── BGB / Vertrag ──────────────────────────────────────────────────────
  gewaehrleistung_kauf: {
    bezeichnung: "Gewährleistungsfrist (§ 438 BGB)",
    gesetz: "§ 438 Abs. 1 Nr. 3 BGB",
    laenge: { einheit: "monate", wert: 24 },
    beschreibung: "Regelmäßige Verjährungsfrist für Mängelansprüche beim Kaufvertrag: 2 Jahre ab Übergabe der Kaufsache.",
    berechnung: "ab_ereignis",
    fristwahrung_hinweis: "Bei Arglist: 3 Jahre nach § 195 BGB. Bei Bauwerken: 5 Jahre (§ 438 Abs. 1 Nr. 2 BGB).",
  },
  verjährung_allgemein: {
    bezeichnung: "Regelmäßige Verjährungsfrist (§ 195 BGB)",
    gesetz: "§ 195 BGB i.V.m. § 199 BGB",
    laenge: { einheit: "monate", wert: 36 },
    beschreibung: "Regelmäßige Verjährung: 3 Jahre, beginnend mit Ende des Jahres, in dem der Anspruch entstand und der Gläubiger Kenntnis erlangte.",
    berechnung: "ab_ereignis",
    fristwahrung_hinweis: "Verjährung beginnt erst mit dem 31.12. des Jahres der Anspruchsentstehung (§ 199 Abs. 1 BGB)!",
  },
  kuendigung_mietvertrag_mieter: {
    bezeichnung: "Kündigungsfrist Mietvertrag (Mieter)",
    gesetz: "§ 573c Abs. 1 BGB",
    laenge: { einheit: "monate", wert: 3 },
    beschreibung: "Ordentliche Kündigung durch den Mieter: 3 Monate zum Monatsende.",
    berechnung: "ab_ereignis",
    fristwahrung_hinweis: "Kündigung muss bis zum 3. Werktag eines Monats zugehen für Wirksamkeit zum Monatsende des übernächsten Monats.",
  },
  kuendigung_mietvertrag_vermieter: {
    bezeichnung: "Kündigungsfrist Mietvertrag (Vermieter)",
    gesetz: "§ 573c Abs. 1 BGB",
    laenge: { einheit: "monate", wert: 3 },
    beschreibung: "Ordentliche Kündigung durch den Vermieter — gestaffelte Fristen nach Mietdauer: bis 5 Jahre = 3 Monate, 5–8 Jahre = 6 Monate, ab 8 Jahre = 9 Monate (jeweils zum Ablauf des übernächsten Monats).",
    berechnung: "ab_ereignis",
    fristwahrung_hinweis: "§ 573c Abs. 1 S. 2 BGB: Frist verlängert sich nach 5 und 8 Jahren Vermietungsdauer um jeweils 3 Monate. Kündigungserfordernis: Schriftform (§ 568 BGB) und Begründung (§ 573 Abs. 3 BGB).",
  },
};

// ── Datumsberechnung ──────────────────────────────────────────────────────

function addMonate(d: Date, monate: number): Date {
  const result = new Date(d);
  const monat = result.getMonth() + monate;
  const jahr = result.getFullYear() + Math.floor(monat / 12);
  const restMonat = ((monat % 12) + 12) % 12;
  // Letzter Tag des Monats-Handling (§ 188 Abs. 3 BGB)
  const maxTag = new Date(jahr, restMonat + 1, 0).getDate();
  const tag = Math.min(d.getDate(), maxTag);
  return new Date(jahr, restMonat, tag);
}

function addWochen(d: Date, wochen: number): Date {
  return addTage(d, wochen * 7);
}

function berechneFristende(startdatum: Date, laenge: FristDef["laenge"]): Date {
  switch (laenge.einheit) {
    case "tage":   return addTage(startdatum, laenge.wert);
    case "wochen": return addWochen(startdatum, laenge.wert);
    case "monate": return addMonate(startdatum, laenge.wert);
  }
}

// ── Schema ────────────────────────────────────────────────────────────────

export const calculateFristSchema = z.object({
  fristtyp: z
    .enum([
      "berufung", "berufungsbegruendung", "revision", "nichtzulassungsbeschwerde",
      "widerspruch_mahnbescheid", "einspruch_vollstreckungsbescheid", "einspruch_versaeumnisurteil",
      "klageerwiderung", "kuendigungsschutzklage", "berufung_arbeitsgericht",
      "berufung_strafrecht", "revision_strafrecht",
      "widerspruch_verwaltungsakt", "anfechtungsklage_vg",
      "gewaehrleistung_kauf", "verjährung_allgemein",
      "kuendigung_mietvertrag_mieter", "kuendigung_mietvertrag_vermieter",
    ])
    .describe("Art der zu berechnenden Frist"),
  ereignisdatum: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    .refine(isValidIsoCalendarDate, "Ungültiges Kalenderdatum")
    .describe("Datum des fristauslösenden Ereignisses (Zustellung, Kündigung, Urteilsverkündung etc.) im Format YYYY-MM-DD"),
  bundesland: z
    .enum(["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"])
    .default("NW")
    .describe("Bundesland für die Feiertagsberechnung (Kürzel, z.B. BY=Bayern, NW=NRW, BE=Berlin)"),
  alle_fristen: z
    .boolean()
    .default(false)
    .describe("Alle relevanten Folgefristen ebenfalls berechnen (z.B. Begründungsfrist nach Berufungsfrist)"),
});

export type CalculateFristInput = z.infer<typeof calculateFristSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function calculateFrist(input: CalculateFristInput): Promise<string> {
  const { fristtyp, ereignisdatum, bundesland, alle_fristen } = input;

  const def = FRISTTYPEN[fristtyp];
  if (!def) {
    return `Unbekannter Fristtyp: ${fristtyp}`;
  }

  const startDatum = parseIsoCalendarDate(ereignisdatum);
  if (!startDatum) {
    return `Ungültiges Datum: ${ereignisdatum}`;
  }

  if (fristtyp === "kuendigung_mietvertrag_vermieter") {
    const lines: string[] = [];
    const dritteWerktag = getDritterWerktagDesMonats(startDatum.getFullYear(), startDatum.getMonth(), bundesland);

    lines.push("═══════════════════════════════════════════════════════");
    lines.push("  FRISTENBERECHNUNG");
    lines.push("═══════════════════════════════════════════════════════");
    lines.push(`  Fristtyp:       ${def.bezeichnung}`);
    lines.push(`  Rechtsgrundlage: ${def.gesetz}`);
    lines.push(`  Bundesland:     ${BUNDESLAND_NAMEN[bundesland] ?? bundesland}`);
    lines.push("");
    lines.push(`  Ereignisdatum:  ${formatDatum(startDatum)}`);
    lines.push("  Fristlänge:     gesetzlich 3 / 6 / 9 Monate je nach Mietdauer");
    lines.push("");
    lines.push("───────────────────────────────────────────────────────");
    lines.push("  ⚠  KEIN EXAKTES DATUM AUSGEGEBEN");
    lines.push("  Die gesetzliche Kündigungsfrist des Vermieters hängt von der Mietdauer ab.");
    lines.push("  Dieses Tool erhebt die Mietdauer nicht und gibt deshalb bewusst kein präzises Vertragsende aus.");
    lines.push("");
    lines.push(`  Maßgebliche Zugangsschwelle in diesem Monat: ${formatDatum(dritteWerktag)} (3. Werktag)`);
    lines.push("  Für eine belastbare Berechnung müssen zusätzlich geprüft werden:");
    lines.push("  • Mietdauer (3 / 6 / 9 Monate nach § 573c Abs. 1 S. 2 BGB)");
    lines.push("  • Zugang bis zum 3. Werktag des Monats");
    lines.push("  • Sonderregeln, Kündigungsausschlüsse und Vertragsgestaltung");
    lines.push("");
    lines.push("  Haftungshinweis: Diese Berechnung ersetzt keine anwaltliche");
    lines.push("  Fristenkontrolle. Bitte stets in der Kanzleisoftware nachtragen.");

    return lines.join("\n");
  }

  // Rohes Fristende berechnen
  // § 199 Abs. 1 BGB: Regelverjährung beginnt mit dem Ende des Jahres der Anspruchsentstehung
  let rohesFristende: Date;
  let verschobenesFristende: Date;
  let wurdeVerschoben = false;
  let mietkuendigungHinweise: string[] = [];

  if (fristtyp === "verjährung_allgemein") {
    const jahrKenntnis = startDatum.getFullYear();
    const endYear = jahrKenntnis + Math.floor(def.laenge.wert / 12);
    rohesFristende = new Date(endYear, 11, 31);
    verschobenesFristende = verschiebeAufWerktag(rohesFristende, bundesland);
    wurdeVerschoben = toIsoDate(rohesFristende) !== toIsoDate(verschobenesFristende);
  } else if (fristtyp === "kuendigung_mietvertrag_mieter") {
    const mietende = berechneMietkuendigungMonatsende(startDatum, bundesland, def.laenge.wert);
    rohesFristende = mietende.fristende;
    verschobenesFristende = rohesFristende;
    mietkuendigungHinweise = [
      `Zugang bis zum 3. Werktag dieses Monats: ${formatDatum(mietende.dritterWerktag)}.`,
      mietende.laufenderMonatZaehlt
        ? "Der laufende Monat zählt noch mit; das Vertragsende wurde daher zum Ablauf des übernächsten Monats berechnet."
        : "Der Zugang lag nach dem 3. Werktag; der laufende Monat zählt daher nicht mehr mit.",
      "Für Mietkündigungen wird das Vertragsende als Monatsende berechnet; eine Verschiebung nach § 193 BGB findet hierfür nicht statt.",
    ];
  } else {
    rohesFristende = berechneFristende(startDatum, def.laenge);
    verschobenesFristende = verschiebeAufWerktag(rohesFristende, bundesland);
    wurdeVerschoben = toIsoDate(rohesFristende) !== toIsoDate(verschobenesFristende);
  }

  const feiertage = getFeiertageDates(rohesFristende.getFullYear(), bundesland);
  const istFeiertag = feiertage.has(toIsoDate(rohesFristende));

  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  FRISTENBERECHNUNG");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push(`  Fristtyp:       ${def.bezeichnung}`);
  lines.push(`  Rechtsgrundlage: ${def.gesetz}`);
  lines.push(`  Bundesland:     ${BUNDESLAND_NAMEN[bundesland] ?? bundesland}`);
  lines.push("");
  lines.push(`  Ereignisdatum:  ${formatDatum(startDatum)}`);
  lines.push(`  Fristlänge:     ${def.laenge.wert} ${einheitLabel(def.laenge.einheit)}`);
  lines.push("");
  lines.push("───────────────────────────────────────────────────────");

  if (wurdeVerschoben) {
    lines.push(`  Rechnerisches Fristende: ${formatDatum(rohesFristende)}`);
    const grund = istWochenende(rohesFristende)
      ? (rohesFristende.getDay() === 6 ? "Samstag" : "Sonntag")
      : istFeiertag
        ? `gesetzlicher Feiertag in ${BUNDESLAND_NAMEN[bundesland]}`
        : "Nicht-Werktag";
    lines.push(`  ⚠  ${grund} → Verschiebung gem. § 193 BGB / § 222 Abs. 2 ZPO`);
    lines.push("");
    lines.push(`  ✅ FRISTENDE (wirksam): ${formatDatum(verschobenesFristende)}`);
  } else {
    lines.push(`  ✅ ${fristtyp === "kuendigung_mietvertrag_mieter" ? "VERTRAGSENDE" : "FRISTENDE"}: ${formatDatum(verschobenesFristende)}`);
  }

  lines.push("");
  lines.push("───────────────────────────────────────────────────────");
  lines.push("  Erläuterung:");
  lines.push(`  ${def.beschreibung}`);

  if (def.fristwahrung_hinweis) {
    lines.push("");
    lines.push("  ⚠  HINWEIS:");
    lines.push(`  ${def.fristwahrung_hinweis}`);
  }

  if (mietkuendigungHinweise.length > 0) {
    lines.push("");
    lines.push("  ⚠  MIETRECHTLICHE EINORDNUNG:");
    for (const hinweis of mietkuendigungHinweise) {
      lines.push(`  ${hinweis}`);
    }
  }

  // Folgefristen
  if (alle_fristen) {
    lines.push("");
    lines.push("───────────────────────────────────────────────────────");
    lines.push("  FOLGEFRISTEN:");
    const folge = getFolgefristen(fristtyp, startDatum, bundesland);
    for (const f of folge) {
      lines.push(`  • ${f.bezeichnung} (${f.gesetz}): ${formatDatum(f.datum)}`);
    }
  }

  // Verbleibende Tage
  const heute = new Date();
  heute.setHours(0, 0, 0, 0);
  const diffMs = verschobenesFristende.getTime() - heute.getTime();
  const diffTage = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  lines.push("");
  lines.push("───────────────────────────────────────────────────────");
  if (diffTage > 0) {
    lines.push(`  ⏱  Verbleibende Zeit: ${diffTage} Tag${diffTage === 1 ? "" : "e"}`);
  } else if (diffTage === 0) {
    lines.push("  🚨 FRIST LÄUFT HEUTE AB!");
  } else {
    lines.push(`  ❌ FRIST ABGELAUFEN vor ${Math.abs(diffTage)} Tag${Math.abs(diffTage) === 1 ? "" : "en"}`);
  }

  lines.push("");
  lines.push("  Haftungshinweis: Diese Berechnung ersetzt keine anwaltliche");
  lines.push("  Fristenkontrolle. Bitte stets in der Kanzleisoftware nachtragen.");

  return lines.join("\n");
}

// ── Folgefristen ──────────────────────────────────────────────────────────
function getFolgefristen(
  fristtyp: string,
  startDatum: Date,
  bundesland: string,
): Array<{ bezeichnung: string; gesetz: string; datum: Date }> {
  const results = [];

  if (fristtyp === "berufung") {
    const begruendung = verschiebeAufWerktag(addMonate(startDatum, 2), bundesland);
    results.push({ bezeichnung: "Berufungsbegründungsfrist", gesetz: "§ 520 Abs. 2 ZPO", datum: begruendung });
  }
  if (fristtyp === "revision") {
    const begruendung = verschiebeAufWerktag(addMonate(startDatum, 2), bundesland);
    results.push({ bezeichnung: "Revisionsbegründungsfrist", gesetz: "§ 551 Abs. 2 ZPO", datum: begruendung });
  }
  if (fristtyp === "berufung_arbeitsgericht") {
    const begruendung = verschiebeAufWerktag(addMonate(startDatum, 2), bundesland);
    results.push({ bezeichnung: "Berufungsbegründungsfrist (ArbGG)", gesetz: "§ 66 Abs. 1 ArbGG", datum: begruendung });
  }

  return results;
}

// ── Hilfsfunktionen ───────────────────────────────────────────────────────
function einheitLabel(einheit: string): string {
  switch (einheit) {
    case "tage":   return "Tag(e)";
    case "wochen": return "Woche(n)";
    case "monate": return "Monat(e)";
    default: return einheit;
  }
}
