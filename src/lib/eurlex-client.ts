/**
 * eurlex-client.ts
 *
 * EUR-Lex CELLAR SPARQL API 클라이언트
 *
 * 엔드포인트: https://publications.europa.eu/webapi/rdf/sparql
 * 타임아웃: 10초. 실패 시 호출자가 정적 데이터로 fallback한다.
 */

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

  const res = await fetch(url.toString(), {
    signal: AbortSignal.timeout(10_000),
    headers: {
      Accept: "application/sparql-results+json",
    },
  });

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
  const query = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?title ?date WHERE {
  ?work cdm:resource_legal_id_celex "${celex}" ;
        cdm:work_date_document ?date .
  ?work cdm:work_has_expression ?expr .
  ?expr cdm:expression_title ?title ;
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
 * 키워드로 EU 법령을 검색한다 (독일어 제목 기준).
 */
export async function searchEurLex(
  keyword: string,
  limit = 5,
): Promise<EurLexDocument[]> {
  const escaped = keyword.replace(/"/g, '\\"').toLowerCase();

  const query = `
PREFIX cdm: <http://publications.europa.eu/ontology/cdm#>
SELECT DISTINCT ?celex ?title ?date WHERE {
  ?work cdm:resource_legal_id_celex ?celex ;
        cdm:work_date_document ?date .
  ?work cdm:work_has_expression ?expr .
  ?expr cdm:expression_title ?title ;
        cdm:expression_uses_language <http://publications.europa.eu/resource/authority/language/DEU> .
  FILTER(CONTAINS(LCASE(STR(?title)), "${escaped}"))
}
ORDER BY DESC(?date)
LIMIT ${limit}
`.trim();

  const bindings = await runSparql(query);
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
