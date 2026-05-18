/**
 * BMF-Schreiben 클라이언트
 *
 * Base: https://www.bundesfinanzministerium.de
 * 인코딩: UTF-8 (현대 사이트)
 * 커버리지: 연방재무부(BMF) 행정해석 서한(Schreiben) — 납세자에 법적 구속력은 없으나
 *           실무상 권위 있는 해석 지침. BStBl I에 게재됨.
 *
 * 식별자 스킴: BMF-{YYYY-MM-DD}-{AZ-slug}
 *   예: BMF-2024-03-15-IV-C-6-S-2133/19/10003
 */

import { LRUCache } from "./cache.js";
import { fetchWithRetry } from "./http-client.js";

const BMF_BASE = "https://www.bundesfinanzministerium.de";

const cache = new LRUCache<string>(300, 3_600_000, { persistenceName: "bmf-client" });

// ── 타입 ──

export interface BMFSchreiben {
  /** Aktenzeichen (사건번호) — 예: "IV C 6 - S 2133/19/10003" */
  az: string;
  /** 발행일 (ISO 8601: YYYY-MM-DD) */
  date: string;
  /** 제목/주제 */
  title: string;
  /** 분야 (예: "Einkommensteuer", "Umsatzsteuer", "Körperschaftsteuer") */
  subjectArea?: string;
  /** 본문 텍스트 (HTML 태그 제거 후) */
  body: string;
  /** 원본 URL */
  url: string;
  /** 첨부 파일 URL 목록 (PDF 등) */
  attachments: string[];
  /** 출처 식별자 */
  source: "BMF";
  /** 조회 시각 (ISO 8601) */
  fetchedAt: string;
  /** 출처 등급 — BMF는 1차 행정해석이므로 항상 "A" */
  grade: "A";
}

export interface BMFSearchFilters {
  /** 검색어 (제목/본문) */
  query?: string;
  /** 시작일 (YYYY-MM-DD) */
  dateFrom?: string;
  /** 종료일 (YYYY-MM-DD) */
  dateTo?: string;
  /** 분야 키워드 (예: "Einkommensteuer") */
  subjectArea?: string;
  /** AZ 패턴 (부분 매칭) */
  azPattern?: string;
  /** 최대 결과 수 (기본 25) */
  limit?: number;
}

export interface BMFSearchResult {
  az: string;
  date: string;
  title: string;
  subjectArea?: string;
  url: string;
}

// ── 내부 유틸 ──

/**
 * BMF HTML을 가져온다 (UTF-8)
 */
async function fetchBmfHtml(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetchWithRetry(url, {}, { timeoutMs: 20_000, source: "BMF" });

  if (!res.ok) {
    throw new Error(`BMF error: ${res.status} — ${url}`);
  }

  const text = await res.text();
  cache.set(url, text);
  return text;
}

/**
 * HTML 태그를 제거하고 텍스트만 남긴다
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|dl|dt|dd|table|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * BMF 상세 페이지 HTML에서 메타데이터를 추출한다.
 *
 * BMF 사이트 패턴 (2024 기준):
 *   - 제목: <h1> 또는 og:title 메타태그
 *   - 본문: <div class="content"> / <article> / role="main"
 *   - AZ/날짜: 보통 본문 상단에 "GZ: IV C 6 - S 2133/19/10003 / DOK: ..." 형태
 *   - 첨부: <a href="...pdf">
 */
function parseBmfDetail(html: string, url: string): Omit<BMFSchreiben, "fetchedAt"> {
  // 제목 추출 — og:title 우선, 폴백 <h1>
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = (ogTitleMatch?.[1] ?? (h1Match ? stripHtml(h1Match[1]) : "")).trim() || "Unbekannt";

  // 본문 추출 — <article> 또는 main content div
  let bodyHtml = "";
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    bodyHtml = articleMatch[1];
  } else {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) bodyHtml = mainMatch[1];
  }
  const body = bodyHtml ? stripHtml(bodyHtml) : stripHtml(html);

  // AZ 추출 — "GZ: ..." 또는 "Aktenzeichen: ..." 패턴
  const azMatch =
    body.match(/(?:GZ|Aktenzeichen|Geschäftszeichen)\s*:?\s*([IVX]+\s+[A-Z]\s+\d+[^\n,;]*)/i) ??
    body.match(/\b([IVX]+\s+[A-Z]\s+\d+\s*-\s*S\s+\d+[\/\d]*)/);
  const az = azMatch ? azMatch[1].trim().replace(/\s+/g, " ") : "";

  // 날짜 추출 — "vom DD. MMMM YYYY" 또는 ISO/DE 날짜
  const date = extractDate(body) ?? extractDate(html) ?? "";

  // 분야 추출 — URL 경로 또는 빵부스러기 네비게이션
  const subjectArea = extractSubjectArea(url, html);

  // 첨부 PDF 추출
  const attachments: string[] = [];
  const seen = new Set<string>();
  const pdfRegex = /<a[^>]+href=["']([^"']+\.pdf[^"']*)["']/gi;
  let m;
  while ((m = pdfRegex.exec(html)) !== null) {
    const href = m[1].startsWith("http") ? m[1] : `${BMF_BASE}${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
    if (!seen.has(href)) {
      seen.add(href);
      attachments.push(href);
    }
  }

  return {
    az,
    date,
    title,
    subjectArea,
    body,
    url,
    attachments,
    source: "BMF",
    grade: "A",
  };
}

const GERMAN_MONTHS: Record<string, string> = {
  januar: "01", februar: "02", märz: "03", maerz: "03", april: "04",
  mai: "05", juni: "06", juli: "07", august: "08",
  september: "09", oktober: "10", november: "11", dezember: "12",
};

function extractDate(text: string): string | null {
  // ISO: YYYY-MM-DD
  const iso = text.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // German: "15. März 2024" / "15.03.2024"
  const deLong = text.match(/\b(\d{1,2})\.\s*(Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember)\s+(20\d{2})/i);
  if (deLong) {
    const month = GERMAN_MONTHS[deLong[2].toLowerCase()];
    if (month) return `${deLong[3]}-${month}-${deLong[1].padStart(2, "0")}`;
  }

  const deShort = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (deShort) {
    return `${deShort[3]}-${deShort[2].padStart(2, "0")}-${deShort[1].padStart(2, "0")}`;
  }

  return null;
}

function extractSubjectArea(url: string, html: string): string | undefined {
  // URL 경로에서 추출: /Themen/Steuern/Steuerarten/Einkommensteuer/...
  const urlMatch = url.match(/\/Steuerarten\/([^/]+)\//i);
  if (urlMatch) return decodeURIComponent(urlMatch[1]).replace(/-/g, " ");

  // 빵부스러기에서 추출
  const crumbMatch = html.match(/<nav[^>]*breadcrumb[^>]*>([\s\S]*?)<\/nav>/i);
  if (crumbMatch) {
    const crumbs = stripHtml(crumbMatch[1])
      .split(/\s*[>›/]\s*/)
      .filter(Boolean);
    const known = crumbs.find((c) => /steuer/i.test(c));
    if (known) return known;
  }

  return undefined;
}

// ── 공개 API ──

/**
 * BMF-Schreiben 상세를 URL로 조회한다.
 */
export async function getBmfSchreibenByUrl(url: string): Promise<BMFSchreiben> {
  const normalized = url.startsWith("http") ? url : `${BMF_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
  const html = await fetchBmfHtml(normalized);
  const parsed = parseBmfDetail(html, normalized);

  if (!parsed.body) {
    throw new Error(`Could not extract BMF-Schreiben body from ${normalized}`);
  }

  return {
    ...parsed,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * BMF-Schreiben 목록을 조회한다.
 *
 * 기본 진입점: BMF "Schreiben" 검색 페이지를 스크랩한다.
 *   https://www.bundesfinanzministerium.de/SiteGlobals/Forms/Suche/Expertensuche/Expertensuche_Formular.html
 *     ?gtp=*_list%253D1
 *     &resourceId=...
 *     &sortOrder=dateOfIssue_dt+desc
 *     &templateQueryString=<query>
 *     &dateOfIssue.GROUP=1&dateOfIssue.START=YYYY-MM-DD&dateOfIssue.END=YYYY-MM-DD
 */
export async function searchBmfSchreiben(
  filters: BMFSearchFilters = {},
): Promise<BMFSearchResult[]> {
  const limit = filters.limit ?? 25;
  const params = new URLSearchParams();
  params.set("gtp", "*_list%253D1");
  params.set("sortOrder", "dateOfIssue_dt+desc");
  if (filters.query) params.set("templateQueryString", filters.query);
  if (filters.dateFrom) {
    params.set("dateOfIssue.GROUP", "1");
    params.set("dateOfIssue.START", filters.dateFrom);
  }
  if (filters.dateTo) {
    params.set("dateOfIssue.GROUP", "1");
    params.set("dateOfIssue.END", filters.dateTo);
  }

  const searchUrl = `${BMF_BASE}/SiteGlobals/Forms/Suche/Expertensuche/Expertensuche_Formular.html?${params.toString()}`;
  const html = await fetchBmfHtml(searchUrl);

  const results: BMFSearchResult[] = [];
  const seen = new Set<string>();

  // 결과 항목 패턴: <article class="result"> ... <a href="...">제목</a> ... <time>날짜</time> ... </article>
  const itemRegex = /<(?:article|li)[^>]*class="[^"]*(?:result|searchResult|teaser)[^"]*"[^>]*>([\s\S]*?)<\/(?:article|li)>/gi;
  let m;
  while ((m = itemRegex.exec(html)) !== null && results.length < limit) {
    const block = m[1];
    const linkMatch = block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const href = linkMatch[1].startsWith("http")
      ? linkMatch[1]
      : `${BMF_BASE}${linkMatch[1].startsWith("/") ? "" : "/"}${linkMatch[1]}`;
    if (seen.has(href)) continue;
    seen.add(href);

    const title = stripHtml(linkMatch[2]).trim();
    const date = extractDate(block) ?? "";
    const azMatch = block.match(/\b([IVX]+\s+[A-Z]\s+\d+\s*-\s*S\s+\d+[\/\d]*)/);
    const az = azMatch ? azMatch[1].replace(/\s+/g, " ").trim() : "";

    if (filters.azPattern && !az.toLowerCase().includes(filters.azPattern.toLowerCase())) {
      continue;
    }
    if (filters.subjectArea) {
      const area = extractSubjectArea(href, block) ?? "";
      if (!area.toLowerCase().includes(filters.subjectArea.toLowerCase())) {
        continue;
      }
    }

    results.push({
      az,
      date,
      title,
      subjectArea: extractSubjectArea(href, block),
      url: href,
    });
  }

  return results;
}

/**
 * 주어진 인용(AZ + date)이 BMF 검색에서 매칭되는지 검증한다.
 * 반환: 매칭되는 BMFSearchResult 또는 null
 */
export async function verifyBmfCitation(params: {
  az: string;
  date?: string;
}): Promise<BMFSearchResult | null> {
  const results = await searchBmfSchreiben({
    query: params.az,
    azPattern: params.az,
    dateFrom: params.date,
    dateTo: params.date,
    limit: 10,
  });

  const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const target = normalize(params.az);

  for (const r of results) {
    if (normalize(r.az) === target || normalize(r.az).includes(target)) {
      if (!params.date || r.date === params.date) {
        return r;
      }
    }
  }
  return null;
}
