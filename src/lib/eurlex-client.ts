/**
 * eurlex-client.ts
 *
 * EUR-Lex CELLAR SPARQL API 클라이언트
 *
 * 엔드포인트: https://publications.europa.eu/webapi/rdf/sparql
 * 타임아웃: 10초. 실패 시 호출자가 정적 데이터로 fallback한다.
 */

import { fetchWithRetry } from "./http-client.js";

const CELLAR_SPARQL = "https://publications.europa.eu/webapi/rdf/sparql";

// ── 타입 ──────────────────────────────────────────────────────────────────

export interface EurLexDocument {
  celex: string;
  title: string;
  date: string;  // YYYY-MM-DD
  type: string;  // regulation, directive, decision
  uri: string;
}

// ── 내부 SPARQL 헬퍼 ──────────────────────────────────────────────────────

interface SparqlBinding {
  [key: string]: { type: string; value: string };
}

interface SparqlResult {
  results: { bindings: SparqlBinding[] };
}

async function runSparql(query: string): Promise<SparqlBinding[]> {
  const url = new URL(CELLAR_SPARQL);
  url.searchParams.set("query", query);
  url.searchParams.set("format", "application/sparql-results+json");

  const res = await fetchWithRetry(url.toString(), {
    headers: {
      Accept: "application/sparql-results+json",
    },
  }, { timeoutMs: 30_000, source: "EUR-Lex CELLAR" });

  if (!res.ok) {
    throw new Error(`CELLAR SPARQL error: ${res.status}`);
  }

  const json = (await res.json()) as SparqlResult;
  return json.results?.bindings ?? [];
}

/**
 * CELEX 번호에서 문서 타입을 추론한다.
 * 예: "32016R0679" → "regulation"
 */
function celexToType(celex: string): string {
  // 5번째 문자가 타입
  const typeChar = celex.charAt(4);
  switch (typeChar) {
    case "R": return "regulation";
    case "L": return "directive";
    case "D": return "decision";
    case "C": return "communication";
    default: return "act";
  }
}

// ── 공개 API ──────────────────────────────────────────────────────────────

/**
 * CELEX 번호로 EU 법령 메타데이터를 조회한다.
 */
export async function fetchByCelex(celex: string): Promise<EurLexDocument | null> {
  // Validate CELEX format to prevent SPARQL injection
  if (!/^[0-9A-Za-z()]+$/.test(celex)) {
    throw new Error(`Ungültiges CELEX-Format: ${celex}`);
  }
  const query = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?title ?date WHERE {
  ?work cdm:resource_legal_id_celex ?celex ;
        cdm:work_date_document ?date .
  FILTER(STR(?celex) = "${celex}")
  ?expr cdm:expression_belongs_to_work ?work ;
        cdm:expression_title ?title ;
        cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/DEU> .
}
LIMIT 1
`.trim();

  const bindings = await runSparql(query);
  if (bindings.length === 0) return null;

  const b = bindings[0];
  return {
    celex,
    title: b["title"]?.value ?? "",
    date: b["date"]?.value?.slice(0, 10) ?? "",
    type: celexToType(celex),
    uri: buildEurLexUrl(celex, "DE"),
  };
}

/**
 * 검색어를 SPARQL 제목 필터로 바꾼다.
 *
 * 예전에는 검색어 전체가 독일어 제목의 부분 문자열이어야 해서 두 단어 이상이면 거의 0건이었다
 * ("IFRS 18 Verordnung" → 0건). 이제는 단어마다 CONTAINS를 AND로 묶고, 제목 언어는 호출자가 고른다.
 */
export function buildEurLexTitleFilter(keyword: string): string {
  // CELLAR는 Virtuoso라서 제목 전문 색인(bif:contains)을 쓸 수 있다. 부분 문자열 FILTER(CONTAINS)는
  // 제목 전체를 훑느라 90초를 넘겨 타임아웃이 났고, 전문 검색은 같은 질의가 1–9초에 끝난다(2026-10-13 측정).
  // 토큰은 글자·숫자만 남긴다(따옴표·연산자 주입 방지). 하이픈 단어는 두 토큰으로 갈라진다.
  const tokens = keyword
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0);
  if (tokens.length === 0) return "FILTER(false)";
  return `?title bif:contains '${tokens.map((t) => `"${t}"`).join(" AND ")}' .`;
}

/**
 * 키워드로 EU 법령을 검색한다.
 * 독일어 제목을 먼저 보고, 결과가 없으면 영어 제목으로 다시 찾는다
 * (회계 규정처럼 독일어 제목에 영어 고유명사가 섞인 문서도 잡힌다).
 */
export async function searchEurLex(
  keyword: string,
  limit = 5,
): Promise<EurLexDocument[]> {
  const filter = buildEurLexTitleFilter(keyword);
  const buildQuery = (lang: "DEU" | "ENG") =>
    `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?title ?date WHERE {
  ?work cdm:resource_legal_id_celex ?celex ;
        cdm:work_date_document ?date .
  ?expr cdm:expression_belongs_to_work ?work ;
        cdm:expression_title ?title ;
        cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/${lang}> .
  ${filter}
}
ORDER BY DESC(?date)
LIMIT ${limit}
`.trim();

  let bindings = await runSparql(buildQuery("DEU"));
  if (bindings.length === 0) bindings = await runSparql(buildQuery("ENG"));
  return bindings.map((b) => {
    const celex = b["celex"]?.value ?? "";
    return {
      celex,
      title: b["title"]?.value ?? "",
      date: b["date"]?.value?.slice(0, 10) ?? "",
      type: celexToType(celex),
      uri: buildEurLexUrl(celex, "DE"),
    };
  });
}

/**
 * EUR-Lex 문서 URL을 생성한다.
 */
export function buildEurLexUrl(celex: string, lang: "DE" | "EN" = "DE"): string {
  return `https://eur-lex.europa.eu/legal-content/${lang}/TXT/?uri=CELEX:${celex}`;
}

// ── search-eurlex / get-eurlex-document 호환 API ─────────────────────────

/** search-eurlex.ts가 사용하는 래퍼 타입 */
export interface EurLexSearchResult {
  totalItems: number;
  items: Array<EurLexDocument & { url: string }>;
}

/**
 * searchEurLex를 EurLexSearchResult 형태로 래핑한다.
 * search-eurlex.ts가 .totalItems / .items[].url 을 사용하므로 호환성을 위해 제공.
 */
export async function searchEurLexWithResult(
  keyword: string,
  limit = 10,
): Promise<EurLexSearchResult> {
  const docs = await searchEurLex(keyword, limit);
  return {
    totalItems: docs.length,
    items: docs.map((d) => ({ ...d, url: d.uri })),
  };
}

/** get-eurlex-document.ts가 사용하는 반환 타입 */
export interface EurLexFullDocument {
  celex: string;
  title: string;
  content: string;
  url: string;
  fetchedAt: string;
}

/**
 * CELEX 번호로 EUR-Lex 문서의 독일어 HTML 본문을 가져온다.
 */
export async function getEurLexDocument(celex: string): Promise<EurLexFullDocument> {
  const url = buildEurLexUrl(celex, "DE").replace("/TXT/", "/TXT/HTML/");

  const res = await fetchWithRetry(url, {}, { timeoutMs: 30_000, source: "EUR-Lex document" });
  if (!res.ok) {
    throw new Error(`EUR-Lex document error: ${res.status} — CELEX: ${celex}`);
  }

  const html = await res.text();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : celex;

  const content = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|section|article|table|tr|ul|ol|blockquote|li)[^>]*>/gi, "\n")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/&sect;/g, "§").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n").replace(/[ \t]+/g, " ")
    .trim();

  return { celex, title, content, url, fetchedAt: new Date().toISOString() };
}
