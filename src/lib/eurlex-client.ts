/**
 * EUR-Lex 클라이언트
 *
 * CELLAR SPARQL endpoint를 사용하여 EU 법률을 검색하고,
 * EUR-Lex 웹사이트에서 문서 본문을 조회한다.
 *
 * SPARQL endpoint: https://publications.europa.eu/webapi/rdf/sparql
 * Document: https://eur-lex.europa.eu/legal-content/DE/TXT/HTML/?uri=CELEX:{celex}
 */

import { LRUCache } from "./cache.js";

const SPARQL_ENDPOINT = "https://publications.europa.eu/webapi/rdf/sparql";
const EURLEX_BASE = "https://eur-lex.europa.eu";

const cache = new LRUCache<string>(200, 3_600_000);

// ── Types ──

export interface EurLexSearchResult {
  totalItems: number;
  items: EurLexItem[];
}

export interface EurLexItem {
  celex: string;
  title: string;
  date: string | null;
  type: string | null;
  url: string;
}

export interface EurLexDocument {
  celex: string;
  title: string;
  content: string;
  url: string;
  fetchedAt: string;
}

// ── Internal ──

function escapeSparql(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'");
}

async function querySparql(sparql: string): Promise<any> {
  const cacheKey = `sparql:${sparql}`;
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const res = await fetch(SPARQL_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/sparql-results+json",
    },
    body: `query=${encodeURIComponent(sparql)}`,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`SPARQL error: ${res.status} ${res.statusText}`);
  }

  const text = await res.text();
  cache.set(cacheKey, text);
  return JSON.parse(text);
}

// ── Public API ──

/**
 * EUR-Lex에서 EU 법률을 키워드로 검색한다.
 * CELLAR SPARQL endpoint를 사용한다.
 */
export async function searchEurLex(
  query: string,
  size: number = 10,
): Promise<EurLexSearchResult> {
  const escaped = escapeSparql(query);

  const sparql = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>

SELECT DISTINCT ?celex ?title ?date WHERE {
  ?work cdm:resource_legal_id_celex ?celex .
  ?expr cdm:expression_belongs_to_work ?work .
  ?expr cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/DEU> .
  ?expr cdm:expression_title ?title .
  OPTIONAL { ?work cdm:resource_legal_date_document ?date . }
  FILTER(REGEX(STR(?title), "${escaped}", "i"))
}
ORDER BY DESC(?date)
LIMIT ${size}
`.trim();

  const data = await querySparql(sparql);
  const bindings = data?.results?.bindings ?? [];

  const items: EurLexItem[] = bindings.map((b: any) => {
    const celex = b.celex?.value ?? "";
    return {
      celex,
      title: b.title?.value ?? "",
      date: b.date?.value ?? null,
      type: celex.startsWith("3") ? "Regulation/Directive" : celex.startsWith("6") ? "Case Law" : "Other",
      url: `${EURLEX_BASE}/legal-content/DE/ALL/?uri=CELEX:${celex}`,
    };
  });

  return {
    totalItems: items.length,
    items,
  };
}

/**
 * CELEX 번호로 EUR-Lex 문서 본문을 조회한다.
 */
export async function getEurLexDocument(celex: string): Promise<EurLexDocument> {
  const url = `${EURLEX_BASE}/legal-content/DE/TXT/HTML/?uri=CELEX:${encodeURIComponent(celex)}`;

  const cacheKey = `eurlex-doc:${celex}`;
  const cached = cache.get(cacheKey);
  let html: string;

  if (cached) {
    html = cached;
  } else {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) {
      throw new Error(`EUR-Lex document error: ${res.status} — CELEX: ${celex}`);
    }

    html = await res.text();
    cache.set(cacheKey, html);
  }

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : celex;

  // Extract main content
  const content = stripEurLexHtml(html);

  return {
    celex,
    title,
    content,
    url,
    fetchedAt: new Date().toISOString(),
  };
}

function stripEurLexHtml(html: string): string {
  // Try to extract the main document body
  const bodyMatch =
    html.match(/<div[^>]*id="document1"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|<div[^>]*id="document)/i) ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  const raw = bodyMatch ? bodyMatch[1] : html;

  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|section|article|table|tr|ul|ol|blockquote|li)[^>]*>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}
