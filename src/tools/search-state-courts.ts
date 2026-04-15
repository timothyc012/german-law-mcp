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
const OPENJUR_SEARCH = "https://openjur.de/suche/";

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

async function searchOpenjur(
  query: string,
  court?: string,
  dateFrom?: string,
  dateTo?: string,
  maxResults: number = 10,
): Promise<{ items: OpenjurResult[]; total: number; query: string }> {
  // openjur.de 검색 파라미터 구성
  const params = new URLSearchParams({
    q: query,
    ...(court ? { gericht: court } : {}),
    ...(dateFrom ? { datum_von: dateFrom } : {}),
    ...(dateTo ? { datum_bis: dateTo } : {}),
    format: "json",
    max: String(maxResults),
  });

  const url = `${OPENJUR_SEARCH}?${params.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "User-Agent": "german-law-mcp/1.0 (legal research tool)",
        Accept: "application/json, text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    throw new Error(`openjur.de nicht erreichbar: ${(err as Error).message}`);
  }

  // openjur.de gibt HTML zurück — HTML-Parsing via Regex
  const html = await response.text();
  return parseOpenjurHtml(html, query, maxResults);
}

function parseOpenjurHtml(
  html: string,
  query: string,
  maxResults: number,
): { items: OpenjurResult[]; total: number; query: string } {
  const items: OpenjurResult[] = [];

  // openjur Ergebnisse: <div class="result"> Blöcke
  const resultBlocks = html.match(/<article[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/article>/gi)
    ?? html.match(/<div[^>]*class="[^"]*result[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)
    ?? [];

  for (const block of resultBlocks.slice(0, maxResults)) {
    const titleMatch = block.match(/<h[23][^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
    const courtMatch = block.match(/(?:Gericht|court)[^>]*>([^<]{3,60})</i);
    const dateMatch = block.match(/(\d{2}\.\d{2}\.\d{4})/);
    const azMatch = block.match(/(?:Az\.|Aktenzeichen)[^>]*>([^<]{3,40})</i)
      ?? block.match(/\b([A-Z]+\s+\d+\/\d+)\b/);
    const snippetMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

    if (!titleMatch) continue;

    const relUrl = titleMatch[1];
    const docId = relUrl.match(/\/(\d+)/)?.[1] ?? "";

    items.push({
      title: titleMatch[2].replace(/<[^>]+>/g, "").trim(),
      court: courtMatch?.[1]?.trim() ?? "unbekannt",
      date: dateMatch?.[1] ?? "unbekannt",
      az: azMatch?.[1]?.trim() ?? "unbekannt",
      url: relUrl.startsWith("http") ? relUrl : `${OPENJUR_BASE}${relUrl}`,
      snippet: snippetMatch?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 200) ?? "",
      docId,
    });
  }

  // Total aus Trefferzahl
  const totalMatch = html.match(/(\d+)\s+(?:Treffer|Ergebnis(?:se)?)/i);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : items.length;

  return { items, total, query };
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
    .optional()
    .describe("Datum von (Format: YYYY-MM-DD), z.B. '2020-01-01'"),
  datum_bis: z
    .string()
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
    // Datum konvertieren: YYYY-MM-DD → DD.MM.YYYY (openjur-Format)
    const convertDate = (d?: string) =>
      d ? d.split("-").reverse().join(".") : undefined;

    const result = await searchOpenjur(
      input.query,
      gerichtName,
      convertDate(input.datum_von),
      convertDate(input.datum_bis),
      input.max_ergebnisse,
    );

    // OLG-Filter
    let items = result.items;
    if (input.nur_olg) {
      items = items.filter(
        (i) => i.court.toLowerCase().includes("olg")
          || i.court.toLowerCase().includes("kammergericht")
          || i.court.toLowerCase().includes("oberlandesgericht"),
      );
    }

    if (items.length === 0) {
      lines.push("  ⚠  Keine Ergebnisse gefunden.");
      lines.push("");
      lines.push("  Tipps:");
      lines.push("  → Suchbegriff vereinfachen (z.B. 'Schönheitsreparatur' statt Vollsatz)");
      lines.push("  → Gericht-Filter entfernen");
      lines.push("  → NeuRIS (search_case_law) für Bundesgerichte verwenden");
      return lines.join("\n");
    }

    lines.push(`  ── ERGEBNISSE (${items.length} von ${result.total} Treffern) ─────────────`);
    lines.push("");

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      lines.push(`  [${i + 1}] ${it.court}`);
      lines.push(`      Datum:        ${it.date}`);
      lines.push(`      Aktenzeichen: ${it.az}`);
      lines.push(`      Titel:        ${it.title.slice(0, 100)}`);
      if (it.snippet) {
        lines.push(`      Auszug:       „${it.snippet.slice(0, 150)}..."`);
      }
      lines.push(`      URL:          ${it.url}`);
      lines.push("");
    }

    if (result.total > items.length) {
      lines.push(`  → ${result.total - items.length} weitere Treffer auf openjur.de`);
      lines.push(`     https://openjur.de/suche/?q=${encodeURIComponent(input.query)}`);
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
    lines.push("  Fallback: openjur.de direkt aufrufen:");
    lines.push(`  https://openjur.de/suche/?q=${encodeURIComponent(input.query)}`);
  }

  return lines.join("\n");
}
