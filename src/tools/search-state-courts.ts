/**
 * search-state-courts.ts
 *
 * OLG / LG / AG 판례 검색 — openjur.de 활용
 *
 * openjur.de는 독일 최대의 무료 판례 데이터베이스로
 * OLG, LG, AG, VG, OVG 등 주 법원 판례를 포함합니다.
 * NeuRIS(연방법원 전용)의 보완재로 활용.
 */

import { z } from "zod";

const OPENJUR_BASE = "https://openjur.de";
const OPENJUR_SEARCH = `${OPENJUR_BASE}/suche/`;
const INPUT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const FEDERAL_COURT_REGEX = /^(?:BGH|BVerfG|BVerwG|BAG|BSG|BFH|BPatG|EuGH|EuG|EGMR|Bundes)/i;

// ── openjur.de 검색 ───────────────────────────────────────────────────────

interface OpenjurResult {
  title: string;
  court: string;
  date: string;
  az: string;
  url: string;
  snippet: string;
  docId: string;
}

interface OpenjurPage {
  items: OpenjurResult[];
  total: number;
  nextPageUrl?: string;
}

function normalizeForCompare(value: string): string {
  return value
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/<mark[^>]*>/gi, "")
    .replace(/<\/mark>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseGermanNumber(raw: string): number {
  return parseInt(raw.replace(/[^\d]/g, ""), 10);
}

function isOpenjurHumanCheck(html: string): boolean {
  return /We have to check whether you are human/i.test(html)
    || /name="c"\s+value="chkimg"/i.test(html)
    || /Please rotate the inner part of the image/i.test(html);
}

function parseGermanDate(date: string): string | undefined {
  const match = date.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return undefined;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function matchesDateRange(date: string, dateFrom?: string, dateTo?: string): boolean {
  const normalized = parseGermanDate(date);
  if (!normalized) return !dateFrom && !dateTo;
  if (dateFrom && normalized < dateFrom) return false;
  if (dateTo && normalized > dateTo) return false;
  return true;
}

function matchesCourtFilter(resultCourt: string, requestedCourt: string): boolean {
  const resultNorm = normalizeForCompare(resultCourt);
  const requestedNorm = normalizeForCompare(requestedCourt);

  return resultNorm.includes(requestedNorm) || requestedNorm.includes(resultNorm);
}

function isStateCourt(resultCourt: string): boolean {
  return !FEDERAL_COURT_REGEX.test(resultCourt.trim());
}

function buildOpenjurSearchUrl(query: string): string {
  return `${OPENJUR_BASE}/suche/${encodeURIComponent(query)}/`;
}

async function fetchOpenjurPage(url: string, init: RequestInit): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": "german-law-mcp/1.0 (legal research tool)",
        Accept: "text/html,application/xhtml+xml",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new Error(`openjur.de nicht erreichbar: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new Error(`openjur.de antwortet mit HTTP ${response.status}`);
  }

  const html = await response.text();
  if (isOpenjurHumanCheck(html)) {
    throw new Error("openjur.de blockiert automatisierte Suchanfragen derzeit mit einer Mensch-Prüfung");
  }

  return html;
}

async function searchOpenjur(
  query: string,
  maxResults: number = 10,
): Promise<{ items: OpenjurResult[]; total: number; query: string }> {
  // openjur liefert aktuell keine verlässliche JSON-Suche zurück.
  // Daher bewusst HTML-Suche via POST + HTML-Parsing verwenden.
  const firstHtml = await fetchOpenjurPage(OPENJUR_SEARCH, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ searchPhrase: query }).toString(),
  });

  const firstPage = parseOpenjurHtml(firstHtml);
  const items = [...firstPage.items];
  let nextPageUrl = firstPage.nextPageUrl;
  let total = firstPage.total;

  while (items.length < maxResults && nextPageUrl) {
    const pageHtml = await fetchOpenjurPage(nextPageUrl, { method: "GET" });
    const page = parseOpenjurHtml(pageHtml);
    items.push(...page.items);
    total = Math.max(total, page.total);
    nextPageUrl = page.nextPageUrl;
  }

  return { items: items.slice(0, maxResults), total, query };
}

function parseOpenjurHtml(html: string): OpenjurPage {
  const items: OpenjurResult[] = [];
  const resultBlocks = html.split(/<div[^>]*class="[^"]*card-rspr[^"]*"[^>]*>/i).slice(1);

  for (const block of resultBlocks) {
    const courtMatch = block.match(/<div[^>]*class="[^"]*ugricht[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const citationMatch = block.match(/<div[^>]*class="[^"]*utitel[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const titleMatch = block.match(/<p[^>]*class="[^"]*card-text[^"]*"[^>]*>([\s\S]*?)<\/p>/i);
    const snippetMatch = block.match(/<samp[^>]*><small>([\s\S]*?)<\/small><\/samp>/i);

    if (!citationMatch) continue;

    const relUrl = citationMatch[1];
    const citationText = decodeHtml(citationMatch[2]);
    const titleText = decodeHtml(titleMatch?.[1] ?? citationText);
    const courtText = decodeHtml(courtMatch?.[1] ?? "unbekannt");
    const date = citationText.match(/vom\s+(\d{2}\.\d{2}\.\d{4})/i)?.[1] ?? "unbekannt";
    const az = citationText.match(/-\s*(.+?)\s*$/)?.[1] ?? "unbekannt";
    const docId = relUrl.match(/\/(\d+)\./)?.[1] ?? relUrl.match(/\/(\d+)/)?.[1] ?? "";

    items.push({
      title: titleText || citationText,
      court: courtText,
      date,
      az,
      url: relUrl.startsWith("http") ? relUrl : `${OPENJUR_BASE}${relUrl}`,
      snippet: decodeHtml(snippetMatch?.[1] ?? "").slice(0, 300),
      docId,
    });
  }

  const totalMatch = html.match(/Ungefähr\s+([\d.]+)(?:\s+\(beschränkt auf\s+[\d.]+\))?\s+Ergebnisse/i)
    ?? html.match(/([\d.]+)\s+Ergebnisse/i);
  const total = totalMatch ? parseGermanNumber(totalMatch[1]) : items.length;

  const nextPageMatch = html.match(/aria-label="Nächste Seite"[\s\S]*?<a[^>]*href="([^"]+)"/i)
    ?? html.match(/<a[^>]*href="([^"]+)"[^>]*aria-label="Nächste Seite"/i);

  return {
    items,
    total,
    nextPageUrl: nextPageMatch?.[1]
      ? (nextPageMatch[1].startsWith("http") ? nextPageMatch[1] : `${OPENJUR_BASE}${nextPageMatch[1]}`)
      : undefined,
  };
}

// ── Gericht-Codes ─────────────────────────────────────────────────────────

const GERICHT_CODES: Record<string, string> = {
  // OLGs
  "olg-muenchen": "OLG München",
  "olg-frankfurt": "OLG Frankfurt am Main",
  "olg-hamburg": "OLG Hamburg",
  "olg-koeln": "OLG Köln",
  "olg-berlin": "Kammergericht Berlin",
  "olg-duesseldorf": "OLG Düsseldorf",
  "olg-stuttgart": "OLG Stuttgart",
  "olg-celle": "OLG Celle",
  "olg-dresden": "OLG Dresden",
  "olg-nuernberg": "OLG Nürnberg",
  "olg-hamm": "OLG Hamm",
  "olg-karlsruhe": "OLG Karlsruhe",
  "olg-bremen": "OLG Bremen",
  "olg-rostock": "OLG Rostock",
  "olg-saarbruecken": "OLG Saarbrücken",
  // Verwaltungsgerichte
  "bverwg": "BVerwG",
  "ovg-muenster": "OVG Münster",
  "ovg-berlin": "OVG Berlin-Brandenburg",
  // Finanzgerichte
  "bfh": "BFH",
};

// ── Schema ────────────────────────────────────────────────────────────────

export const searchStateCourtsSchema = z.object({
  query: z
    .string()
    .min(3)
    .describe("Suchbegriff (z.B. 'Mietrecht Schönheitsreparaturen', 'Betrug Online-Kauf')"),
  gericht: z
    .string()
    .optional()
    .describe(
      "Gerichtsname oder Code (z.B. 'olg-muenchen', 'olg-frankfurt', 'OLG Hamburg'). " +
      "Leer = alle Gerichte. Verfügbare Codes: " + Object.keys(GERICHT_CODES).join(", "),
    ),
  datum_von: z
    .string()
    .regex(INPUT_DATE_REGEX, "Format: YYYY-MM-DD")
    .optional()
    .describe("Datum von (Format: YYYY-MM-DD), z.B. '2020-01-01'"),
  datum_bis: z
    .string()
    .regex(INPUT_DATE_REGEX, "Format: YYYY-MM-DD")
    .optional()
    .describe("Datum bis (Format: YYYY-MM-DD), z.B. '2024-12-31'"),
  max_ergebnisse: z
    .number()
    .int()
    .min(1)
    .max(25)
    .default(10)
    .describe("Max. Anzahl Ergebnisse (Standard: 10, Max: 25)"),
  nur_olg: z
    .boolean()
    .default(false)
    .describe("Nur OLG-Entscheidungen (Berufungsinstanz) zurückgeben"),
});

export type SearchStateCourtsInput = z.infer<typeof searchStateCourtsSchema>;

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function searchStateCourts(input: SearchStateCourtsInput): Promise<string> {
  const lines: string[] = [];

  if (input.datum_von && input.datum_bis && input.datum_von > input.datum_bis) {
    return [
      "╔══════════════════════════════════════════════════════════╗",
      "║      LANDESGERICHTE — openjur.de Urteilsdatenbank        ║",
      "╚══════════════════════════════════════════════════════════╝",
      "",
      "  ✗ Fehler: datum_bis muss am oder nach datum_von liegen.",
    ].join("\n");
  }

  const gerichtName = input.gericht
    ? GERICHT_CODES[input.gericht.toLowerCase()] ?? input.gericht
    : undefined;

  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║      LANDESGERICHTE — openjur.de Urteilsdatenbank        ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Suche:   "${input.query}"`);
  if (gerichtName) lines.push(`  Gericht: ${gerichtName}`);
  if (input.datum_von || input.datum_bis) {
    lines.push(`  Zeitraum: ${input.datum_von ?? "–"} bis ${input.datum_bis ?? "heute"}`);
  }
  lines.push(`  Max.:    ${input.max_ergebnisse} Ergebnisse`);
  lines.push("");

  try {
    const fetchLimit = Math.min(
      Math.max(input.max_ergebnisse, gerichtName || input.datum_von || input.datum_bis || input.nur_olg ? 20 : 10),
      30,
    );

    const result = await searchOpenjur(input.query, fetchLimit);
    const stateCourtItems = result.items.filter((item) => isStateCourt(item.court));

    let items = stateCourtItems;

    if (gerichtName) {
      items = items.filter((item) => matchesCourtFilter(item.court, gerichtName));
    }

    if (input.datum_von || input.datum_bis) {
      items = items.filter((item) => matchesDateRange(item.date, input.datum_von, input.datum_bis));
    }

    if (input.nur_olg) {
      items = items.filter(
        (i) => i.court.toLowerCase().includes("olg")
          || i.court.toLowerCase().includes("kg")
          || i.court.toLowerCase().includes("kammergericht")
          || i.court.toLowerCase().includes("oberlandesgericht"),
      );
    }

    const removedFederal = result.items.length - stateCourtItems.length;
    const removedByLocalFilters = stateCourtItems.length - items.length;
    items = items.slice(0, input.max_ergebnisse);

    if (items.length === 0) {
      lines.push("  ⚠  Keine passenden Landesgerichts-Entscheidungen gefunden.");
      lines.push("");

      if (result.items.length > 0) {
        lines.push("  Hinweis:");
        lines.push("  → openjur liefert die Trefferliste als HTML; Landesgerichts-, Gerichts- und Datumsfilter");
        lines.push("    werden hier deshalb lokal auf die extrahierten Treffer angewendet.");
        if (removedFederal > 0) {
          lines.push(`  → ${removedFederal} Bundes-/EU-Entscheidungen wurden ausgefiltert.`);
        }
        if (removedByLocalFilters > 0) {
          lines.push(`  → ${removedByLocalFilters} weitere Landesgerichts-Treffer passten nicht zu den gesetzten Filtern.`);
        }
        lines.push("");
      }

      lines.push("  Tipps:");
      lines.push("  → Suchbegriff vereinfachen (z.B. 'Schönheitsreparatur' statt Vollsatz)");
      lines.push("  → Gericht- oder Datumsfilter lockern");
      lines.push("  → Für Bundesgerichte: search_case_law verwenden");
      lines.push(`  → openjur direkt prüfen: ${buildOpenjurSearchUrl(input.query)}`);
      return lines.join("\n");
    }

    lines.push(`  ── ERGEBNISSE (${items.length} von ca. ${result.total} Treffern) ─────────`);
    lines.push("");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      lines.push(`  [${i + 1}] ${it.court}`);
      lines.push(`      Datum:        ${it.date}`);
      lines.push(`      Aktenzeichen: ${it.az}`);
      lines.push(`      Titel:        ${it.title.slice(0, 100)}`);
      if (it.snippet) {
        lines.push(`      Auszug:       „${it.snippet.slice(0, 180)}..."`);
      }
      lines.push(`      URL:          ${it.url}`);
      lines.push("");
    }

    if (removedFederal > 0 || removedByLocalFilters > 0) {
      lines.push("  Hinweis zur Trefferaufbereitung:");
      if (removedFederal > 0) {
        lines.push(`  → ${removedFederal} Bundes-/EU-Entscheidungen wurden entfernt, damit nur Landesgerichte angezeigt werden.`);
      }
      if (removedByLocalFilters > 0) {
        lines.push(`  → ${removedByLocalFilters} weitere Landesgerichts-Treffer wurden lokal nach Gericht/Datum/OLG gefiltert.`);
      }
      lines.push("  → openjur stellt hier keine verlässliche JSON-Suche bereit; Grundlage ist die HTML-Trefferliste.");
      lines.push("");
    }

    if (result.total > items.length) {
      lines.push(`  → Weitere Treffer auf openjur.de: ${buildOpenjurSearchUrl(input.query)}`);
      lines.push("");
    }

    lines.push("  ═══════════════════════════════════════════════════════");
    lines.push("  HINWEIS:");
    lines.push("  OLG-Urteile sind grundsätzlich revisibel (§ 542 ZPO),");
    lines.push("  erfordern aber eine Zulassung der Revision (§ 543 ZPO):");
    lines.push("    • grundsätzliche Bedeutung (§ 543 Abs. 2 Nr. 1 ZPO)");
    lines.push("    • Fortbildung des Rechts / Sicherung einheitl. Rspr. (§ 543 Abs. 2 Nr. 2 ZPO)");
    lines.push("  → Nur Orientierungshilfe — stets BGH-Rspr. gegenprüfen!");
    lines.push("  Für Bundesgericht-Entscheidungen: search_case_law verwenden.");
  } catch (err) {
    lines.push(`  ✗ Fehler: ${(err as Error).message}`);
    lines.push("");
    lines.push("  Fallback:");
    lines.push("  → openjur liefert die Suche aktuell primär als HTML-Seite.");
    lines.push("  → Automatisierte Zugriffe können zusätzlich an einer Mensch-Prüfung scheitern.");
    lines.push(`  → Direkt öffnen: ${buildOpenjurSearchUrl(input.query)}`);
  }

  return lines.join("\n");
}