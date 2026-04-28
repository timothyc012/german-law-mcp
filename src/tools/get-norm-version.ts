/**
 * get-norm-version.ts
 *
 * Ruft den historischen Stand eines deutschen Gesetzes zu einem bestimmten
 * Stichtag ab. Nutzt gesetze-im-internet.de XML-API und versucht den Stand
 * via Wayback Machine (web.archive.org) zu ermitteln.
 *
 * Typischer Anwendungsfall:
 *   - "Wie lautete § 13 TMG am 24.05.2018 (DSGVO-Inkrafttreten)?"
 *   - "Was stand in § 312d BGB vor der Verbraucherrechte-RL-Umsetzung?"
 *
 * Methode:
 *   1. Aktuellen Text von gesetze-im-internet.de holen (immer möglich)
 *   2. Wayback Machine CDX-API nach einer archivierten Version zum Stichtag fragen
 *   3. Wenn verfügbar: archivierten Text abrufen und parsen
 *   4. Diff zwischen Stichtag-Version und aktueller Version anzeigen
 */

import { z } from "zod";
import { getLawSection } from "../lib/gii-client.js";
import { fetchWithRetry } from "../lib/http-client.js";

// ── Schema ────────────────────────────────────────────────────────────────

export const getNormVersionSchema = z.object({
  gesetz: z
    .string()
    .describe("Gesetz-Abkürzung (z.B. 'BGB', 'TMG', 'BDSG', 'ZPO', 'StGB')"),
  paragraph: z
    .string()
    .describe("Paragraphennummer (z.B. '13', '242', '823') — ohne §-Zeichen"),
  stichtag: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD")
    .describe("Stichtag für den historischen Stand im Format YYYY-MM-DD (z.B. '2018-05-24')"),
  zeige_diff: z
    .boolean()
    .default(true)
    .describe("Unterschied zwischen historischem Stand und aktuellem Text anzeigen"),
});

export type GetNormVersionInput = z.infer<typeof getNormVersionSchema>;

// ── Wayback Machine CDX-API ───────────────────────────────────────────────

interface WaybackSnapshot {
  url: string;
  timestamp: string; // YYYYMMDDHHmmss
  statuscode: string;
}

async function findWaybackSnapshot(
  targetUrl: string,
  stichtag: string, // YYYY-MM-DD
): Promise<WaybackSnapshot | null> {
  // Stichtag → Timestamp für CDX (YYYYMMDD000000)
  const ts = stichtag.replace(/-/g, "") + "000000";
  const cdxUrl =
    `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(targetUrl)}&output=json&limit=3&fl=timestamp,statuscode,original&from=${ts}&to=${ts.slice(0, 8)}235959&filter=statuscode:200&collapse=digest`;

  try {
    const resp = await fetchWithRetry(cdxUrl, {}, { timeoutMs: 8_000, source: "Wayback CDX" });
    if (!resp.ok) return null;
    const data: string[][] = await resp.json();
    if (!data || data.length < 2) return null; // erste Zeile = Header

    const row = data[1]; // [timestamp, statuscode, original]
    return { timestamp: row[0], statuscode: row[1], url: row[2] };
  } catch {
    return null;
  }
}

async function fetchWaybackContent(timestamp: string, originalUrl: string): Promise<string | null> {
  const waybackUrl = `https://web.archive.org/web/${timestamp}/${originalUrl}`;
  try {
    const resp = await fetchWithRetry(waybackUrl, {}, { timeoutMs: 12_000, source: "Wayback snapshot" });
    if (!resp.ok) return null;
    const html = await resp.text();
    return html;
  } catch {
    return null;
  }
}

// ── HTML-Parser für gesetze-im-internet.de ────────────────────────────────

function extractParagraphText(html: string, paragraph: string): string | null {
  // gesetze-im-internet.de Struktur: <div class="jnabsatz"> oder <div id="BJNR...BJNE...">
  // Suche nach dem Paragraphen-Container

  // Mehrere Muster für verschiedene GII-Layouts
  const patterns = [
    // Modernes Layout: <div class="jnnorm" id="BJNE..."><div class="jnheader"><h3>§ 13</h3>
    new RegExp(`<div[^>]*class="jnnorm"[^>]*>[\\s\\S]*?§\\s*${paragraph}\\b[\\s\\S]*?</div>\\s*</div>`, "i"),
    // Altes Layout: direkt in <pre> oder <p>
    new RegExp(`§\\s*${paragraph}\\s[\\s\\S]{0,3000}?(?=§\\s*\\d|$)`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      // HTML-Tags entfernen
      return stripHtml(match[0]).trim().slice(0, 3000);
    }
  }

  // Fallback: Gesamttext extrahieren, dann Paragraph suchen
  const text = stripHtml(html);
  const paragraphIdx = text.search(new RegExp(`§\\s*${paragraph}\\b`, "i"));
  if (paragraphIdx >= 0) {
    const nextParagraph = text.slice(paragraphIdx + 1).search(/§\s*\d/);
    const end = nextParagraph >= 0 ? paragraphIdx + 1 + nextParagraph : paragraphIdx + 3000;
    return text.slice(paragraphIdx, end).trim();
  }

  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&auml;/g, "ä")
    .replace(/&ouml;/g, "ö")
    .replace(/&uuml;/g, "ü")
    .replace(/&Auml;/g, "Ä")
    .replace(/&Ouml;/g, "Ö")
    .replace(/&Uuml;/g, "Ü")
    .replace(/&szlig;/g, "ß")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── Einfaches Diff ────────────────────────────────────────────────────────

function simpleDiff(alt: string, neu: string): string {
  if (alt === neu) return "(keine Änderungen erkennbar)";

  const altZeilen = alt.split(/[.;]\s*/);
  const neuZeilen = neu.split(/[.;]\s*/);

  const altSet = new Set(altZeilen.map((z) => z.trim()).filter((z) => z.length > 10));
  const neuSet = new Set(neuZeilen.map((z) => z.trim()).filter((z) => z.length > 10));

  const entfernt = [...altSet].filter((z) => !neuSet.has(z)).slice(0, 5);
  const hinzugefuegt = [...neuSet].filter((z) => !altSet.has(z)).slice(0, 5);

  const lines: string[] = [];
  if (entfernt.length > 0) {
    lines.push("  Im Stichtag vorhanden, heute nicht mehr:");
    for (const z of entfernt) {
      lines.push(`  − ${z.slice(0, 120)}`);
    }
  }
  if (hinzugefuegt.length > 0) {
    lines.push("  Heute vorhanden, am Stichtag noch nicht:");
    for (const z of hinzugefuegt) {
      lines.push(`  + ${z.slice(0, 120)}`);
    }
  }
  if (lines.length === 0) {
    return "(Änderungen vorhanden, aber kein einfacher Satzvergleich möglich)";
  }
  return lines.join("\n");
}

// ── Bekannte Gesetzesänderungen (Offline-Wissensbasis) ────────────────────
// Für die wichtigsten Stichtage ohne API-Abfrage

const BEKANNTE_AENDERUNGEN: Array<{
  gesetz: string;
  paragraph: string;
  stichtag_von: string;
  stichtag_bis: string;
  aenderung: string;
  quelle: string;
}> = [
  {
    gesetz: "TMG",
    paragraph: "13",
    stichtag_von: "2007-03-01",
    stichtag_bis: "2021-12-01",
    aenderung: "§ 13 TMG a.F. regelte Datenschutzpflichten für Telemedien. Durch das TTDSG vom 01.12.2021 wurden diese Regelungen in das TTDSG überführt. § 13 TMG a.F. enthielt u.a. Informationspflichten, Einwilligungserfordernisse und das Kopplungsverbot.",
    quelle: "TTDSG (BGBl. I 2021, S. 1981)",
  },
  {
    gesetz: "BDSG",
    paragraph: "26",
    stichtag_von: "2018-05-25",
    stichtag_bis: "9999-12-31",
    aenderung: "§ 26 BDSG 2018 (n.F.) regelt die Verarbeitung personenbezogener Daten im Beschäftigungsverhältnis und nutzt die Öffnungsklausel des Art. 88 DSGVO. Vorgänger war § 32 BDSG a.F. (bis 24.05.2018).",
    quelle: "Neues BDSG vom 30.06.2017 (BGBl. I 2017, S. 2097), in Kraft seit 25.05.2018",
  },
  {
    gesetz: "BGB",
    paragraph: "312d",
    stichtag_von: "2014-06-13",
    stichtag_bis: "9999-12-31",
    aenderung: "§ 312d BGB n.F. (seit 13.06.2014): Umsetzung der EU-Verbraucherrechterichtlinie 2011/83/EU. Neu: 14-tägiges Widerrufsrecht, einheitlich für alle Fernabsatzverträge. Alt: § 312d BGB a.F. unterschied zwischen Fernabsatz und Haustürgeschäften.",
    quelle: "Gesetz zur Umsetzung der Verbraucherrechterichtlinie (BGBl. I 2013, S. 3642)",
  },
  {
    gesetz: "BGB",
    paragraph: "438",
    stichtag_von: "2022-01-01",
    stichtag_bis: "9999-12-31",
    aenderung: "§ 438 BGB n.F. (ab 01.01.2022): Umsetzung der Warenkaufrichtlinie 2019/771/EU. Neuregelung der Verjährung für Sachmängelhaftung beim Kauf digitaler Inhalte. § 438 Abs. 4 BGB n.F.: Für digitale Produkte gesonderte Verjährungsregeln.",
    quelle: "Gesetz zur Regelung des Verkaufs von Sachen mit digitalen Elementen (BGBl. I 2021, S. 4723)",
  },
  {
    gesetz: "ZPO",
    paragraph: "130d",
    stichtag_von: "2022-01-01",
    stichtag_bis: "9999-12-31",
    aenderung: "§ 130d ZPO (ab 01.01.2022): Aktive Nutzungspflicht für beA (besonderes elektronisches Anwaltspostfach). Alle vorbereitenden Schriftsätze und Anlagen sind als elektronisches Dokument zu übermitteln. Vor 2022: Nur passive Nutzungspflicht.",
    quelle: "Gesetz zur Förderung des elektronischen Rechtsverkehrs mit den Gerichten (BGBl. I 2013, S. 3786)",
  },
];

function sucheBekanntesAenderungswissen(gesetz: string, paragraph: string, stichtag: string): string | null {
  const stichtagDate = new Date(stichtag);
  const matches = BEKANNTE_AENDERUNGEN.filter(
    (e) =>
      e.gesetz.toUpperCase() === gesetz.toUpperCase() &&
      e.paragraph === paragraph &&
      new Date(e.stichtag_von) <= stichtagDate &&
      new Date(e.stichtag_bis) >= stichtagDate,
  );
  if (matches.length === 0) return null;
  return matches.map((m) => `${m.aenderung}\nQuelle: ${m.quelle}`).join("\n\n");
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function getNormVersion(input: GetNormVersionInput): Promise<string> {
  const { gesetz, paragraph, stichtag, zeige_diff } = input;

  const lines: string[] = [];
  lines.push("═══════════════════════════════════════════════════════");
  lines.push("  HISTORISCHER GESETZESSTAND");
  lines.push("═══════════════════════════════════════════════════════");
  lines.push(`  Gesetz:    ${gesetz.toUpperCase()}`);
  lines.push(`  Paragraph: § ${paragraph} ${gesetz.toUpperCase()}`);
  lines.push(`  Stichtag:  ${stichtag}`);
  lines.push("───────────────────────────────────────────────────────");

  // 1. Aktuellen Text holen
  lines.push("\n  [1/3] Aktueller Text (gesetze-im-internet.de)...");
  let aktuellerText: string | null = null;
  try {
    const section = await getLawSection(gesetz, paragraph);
    aktuellerText = section.content;
  } catch {
    aktuellerText = null;
  }

  if (aktuellerText) {
    lines.push("\n  ── AKTUELLER TEXT (heute) ──────────────────────────");
    lines.push(aktuellerText.slice(0, 1500));
  } else {
    lines.push("  ⚠  Aktueller Text nicht abrufbar.");
  }

  // 2. Offline-Wissen prüfen
  lines.push("\n  [2/3] Bekannte Gesetzesänderungen prüfen...");
  const bekannt = sucheBekanntesAenderungswissen(gesetz, paragraph, stichtag);
  if (bekannt) {
    lines.push("\n  ── HISTORISCHER KONTEXT (Offline-Wissensbasis) ────");
    lines.push(`\n${bekannt.split("\n").map((l) => "  " + l).join("\n")}`);
  }

  // 3. Wayback Machine versuchen
  lines.push("\n  [3/3] Historische Version via Wayback Machine...");
  const giiUrl = `https://www.gesetze-im-internet.de/${gesetz.toLowerCase()}/__${paragraph}.html`;

  const snapshot = await findWaybackSnapshot(giiUrl, stichtag);
  let historischerText: string | null = null;

  if (snapshot) {
    const html = await fetchWaybackContent(snapshot.timestamp, giiUrl);
    if (html) {
      historischerText = extractParagraphText(html, paragraph);
    }
  }

  if (historischerText) {
    const archivDate = snapshot
      ? `${snapshot.timestamp.slice(0, 4)}-${snapshot.timestamp.slice(4, 6)}-${snapshot.timestamp.slice(6, 8)}`
      : stichtag;
    lines.push(`\n  ── HISTORISCHER TEXT (archiviert: ${archivDate}) ────`);
    lines.push(historischerText.slice(0, 1500));

    if (zeige_diff && aktuellerText) {
      lines.push("\n  ── ÄNDERUNGEN (Stichtag → heute) ──────────────────");
      lines.push(simpleDiff(historischerText, aktuellerText));
    }
  } else {
    lines.push("  ⚠  Kein Archiv-Snapshot für diesen Stichtag gefunden.");
    if (!bekannt) {
      lines.push("  Mögliche Gründe:");
      lines.push("  • Das Gesetz existierte zu diesem Zeitpunkt noch nicht");
      lines.push("  • Kein Wayback-Machine-Snapshot für diesen Tag verfügbar");
      lines.push("  • Abkürzung unbekannt (bitte vollständigen Gesetzesnamen prüfen)");
      lines.push("\n  Empfehlung: Für zuverlässige historische Gesetzestexte");
      lines.push("  bitte juris (Rechtsprechungsdatenbank) oder beck-online nutzen,");
      lines.push("  die vollständige historische Versionen aller Bundesgesetze enthalten.");
    }
  }

  lines.push("\n─────────────────────────────────────────────────────");
  lines.push("  Datenquellen: gesetze-im-internet.de (aktuell),");
  lines.push("  web.archive.org/Wayback Machine (historisch),");
  lines.push("  interne Wissensbasis (bekannte Gesetzesänderungen).");

  return lines.join("\n");
}
