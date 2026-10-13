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
  // 제목 추출 — og:title 우선(엔티티 해제, 사이트명 꼬리 제거), 폴백 <h1>("Navigation" 같은 접근성 제목 제외)
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
  const h1Candidates = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((h) => stripHtml(h[1]).replace(/\s+/g, " ").trim())
    .filter((t) => t && !/^(Navigation|Servicemenü|Hauptmenü)$/i.test(t));
  const title =
    (ogTitleMatch ? stripHtml(ogTitleMatch[1]).replace(/\s*-\s*Bundesfinanzministerium\s*-\s*\w+\s*$/i, "").trim() : "") ||
    h1Candidates[0] ||
    "Unbekannt";

  // 본문 추출 — <article>, <main>, 그 다음 role="main" 영역(2026 사이트 구조: 스크립트가 섞인 본문 밖은 버린다)
  let bodyHtml = "";
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  const roleMainMatch = html.match(/<div[^>]*role=["']main["'][^>]*>([\s\S]*?)(?=<footer\b|<div[^>]*id=["']Footer["']|<\/body>)/i);
  if (articleMatch) bodyHtml = articleMatch[1];
  else if (mainMatch) bodyHtml = mainMatch[1];
  else if (roleMainMatch) bodyHtml = roleMainMatch[1];
  let body = stripHtml((bodyHtml || html).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, ""));
  // role="main" 영역은 빵부스러기·메뉴로 시작하므로, 제목이 본문에 있으면 거기서부터 자른다.
  const titleStart = title !== "Unbekannt" ? body.indexOf(title.slice(0, 40)) : -1;
  if (titleStart > 0) body = body.slice(titleStart);

  // AZ 추출 — "GZ: ..." 또는 "Aktenzeichen: ..." 패턴. 2026 사이트는 AZ를 HTML이 아니라 첨부 PDF에만 두므로 비어 있을 수 있다.
  const azMatch =
    body.match(/(?:GZ|Aktenzeichen|Geschäftszeichen)\s*:?\s*([IVX]+\s+[A-Z]\s+\d+[^\n,;]*)/i) ??
    body.match(/\b([IVX]+\s+[A-Z]\s+\d+\s*-\s*S\s+\d+[\/\d]*)/);
  const az = azMatch ? azMatch[1].trim().replace(/\s+/g, " ") : "";

  // 날짜 추출 — URL 경로의 YYYY-MM-DD(발행일) 우선, 다음 <time datetime>, 마지막으로 본문의 날짜 표기
  const urlDate = url.match(/\/(20\d{2}-\d{2}-\d{2})-[^/]*$/);
  const timeTag = html.match(/<time[^>]+datetime=["'](20\d{2}-\d{2}-\d{2})/i);
  const date = urlDate?.[1] ?? timeTag?.[1] ?? extractDate(body) ?? "";

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
 * BMF-Schreiben 목록 페이지(SiteGlobals/Forms/Listen/DE/BMF_Schreiben)의 결과 항목.
 * AZ는 목록에 없으므로 비어 있고, 필요할 때 상세 페이지에서 채운다.
 */
export interface BMFListEntry {
  title: string;
  url: string;
  /** ISO 날짜 (YYYY-MM-DD), 목록의 <time datetime> 기준 */
  date: string;
  /** 목록 배지 텍스트 (예: "BMF-Schreiben", "Artikel") */
  badge: string;
}

/**
 * BMF 목록/검색 결과 HTML에서 항목을 뽑는다 (2026-10 사이트 구조).
 *
 *   <li class="bmf-list-entry">
 *     <h3 class="bmf-entry-title"><a href="Content/DE/Downloads/BMF_Schreiben/..." class="bmf-resultlist-teaser-link"><span>제목</span></a></h3>
 *     <div class="bmf-date"><time datetime="2025-10-15T00:00">15.10.2025</time></div>
 *     <div class="bmf-badge"><span class="bmf-badge-text">BMF-Schreiben</span></div>
 *   </li>
 */
export function parseBmfListEntries(html: string): BMFListEntry[] {
  const entries: BMFListEntry[] = [];
  const itemRegex = /<li[^>]*class="bmf-list-entry[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
  let m;
  while ((m = itemRegex.exec(html)) !== null) {
    const block = m[1];
    const link =
      block.match(/<a[^>]+href=["']([^"']+)["'][^>]*class=["'][^"']*bmf-resultlist-teaser-link[^"']*["'][^>]*>([\s\S]*?)<\/a>/i) ??
      block.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!link) continue;
    const rawHref = link[1].replace(/&amp;/g, "&");
    const url = rawHref.startsWith("http") ? rawHref : `${BMF_BASE}${rawHref.startsWith("/") ? "" : "/"}${rawHref}`;
    const timeMatch = block.match(/<time[^>]+datetime=["'](\d{4}-\d{2}-\d{2})/i);
    const badgeMatch = block.match(/bmf-badge-text["'][^>]*>\s*([^<]+?)\s*</i);
    entries.push({
      title: stripHtml(link[2]).replace(/\s+/g, " ").trim(),
      url,
      date: timeMatch?.[1] ?? extractDate(block) ?? "",
      badge: badgeMatch?.[1] ?? "",
    });
  }
  return entries;
}

/** BMF-Schreiben 전용 목록 양식 (bmf_schreiben.html의 form name="publicationSearch"). */
const BMF_LIST_FORM = `${BMF_BASE}/SiteGlobals/Forms/Listen/DE/BMF_Schreiben/BMF_Schreiben_Formular.html`;
/** 양식의 hidden resourceId — 사이트 개편 시 bmf_schreiben.html에서 다시 읽는다. */
const BMF_LIST_RESOURCE_ID = "240030";
/** 목록을 BMF-Schreiben 폴더로 한정한다 (없으면 사이트 전체 1,700여 건이 섞인다). */
const BMF_LIST_FOLDER = "/bmf/Content/DE/Downloads/BMF_Schreiben/*";
const BMF_LIST_PAGE_SIZE = 10;
/** azPattern 검증을 위해 상세 페이지를 열어 보는 최대 후보 수 */
const BMF_AZ_DETAIL_LIMIT = 10;

/**
 * BMF-Schreiben 목록을 조회한다.
 *
 * 2026-10 기준 사이트 구조: 예전 Expertensuche(/Suche/Expertensuche/…)는 404이고,
 * 전용 목록 양식이 GET 파라미터로 검색어·기간을 받는다.
 *   BMF_Schreiben_Formular.html?resourceId=240030&pageLocale=de&submit=Anwenden
 *     &folder=/bmf/Content/DE/Downloads/BMF_Schreiben/*
 *     &sortOrder=dateOfIssue_dt desc
 *     &templateQueryString=<query>
 *     &dateOfIssueAfter5=YYYY-MM-DD&dateOfIssueBefore5=YYYY-MM-DD
 *     &pageNo=<n>
 * baseDocType=BMFSchreiben 을 붙이면 빈 페이지가 오므로 쓰지 않는다. AZ는 목록에 없어
 * azPattern 필터는 상세 페이지를 열어 확인한다(최대 BMF_AZ_DETAIL_LIMIT건).
 */
export async function searchBmfSchreiben(
  filters: BMFSearchFilters = {},
): Promise<BMFSearchResult[]> {
  const limit = filters.limit ?? 25;
  const maxPages = Math.ceil(limit / BMF_LIST_PAGE_SIZE) + 1;
  const results: BMFSearchResult[] = [];
  const seen = new Set<string>();
  let detailLookups = 0;
  // 페이징은 GSB 방식 `gtp=<listId>_list=<n>`; listId(예: 240018)는 1페이지의 페이저 링크에서 읽는다.
  let listId: string | null = null;

  for (let page = 1; page <= maxPages && results.length < limit; page++) {
    const params = new URLSearchParams({
      resourceId: BMF_LIST_RESOURCE_ID,
      pageLocale: "de",
      submit: "Anwenden",
      folder: BMF_LIST_FOLDER,
      sortOrder: "dateOfIssue_dt desc",
    });
    if (filters.query) params.set("templateQueryString", filters.query);
    if (filters.dateFrom) params.set("dateOfIssueAfter5", filters.dateFrom);
    if (filters.dateTo) params.set("dateOfIssueBefore5", filters.dateTo);
    if (page > 1) {
      if (!listId) break;
      params.set("gtp", `${listId}_list=${page}`);
    }

    const html = await fetchBmfHtml(`${BMF_LIST_FORM}?${params.toString()}`);
    listId ??= html.match(/gtp=(\d+)_list/)?.[1] ?? null;
    const entries = parseBmfListEntries(html);
    let newOnPage = 0;

    for (const entry of entries) {
      if (results.length >= limit) break;
      if (seen.has(entry.url)) continue;
      seen.add(entry.url);
      newOnPage++;

      // 목록에는 안내 기사(Artikel)도 섞여 들어오므로 BMF-Schreiben만 남긴다.
      if (entry.badge && !/BMF-Schreiben/i.test(entry.badge) && !/BMF_Schreiben/.test(entry.url)) continue;
      if (filters.dateFrom && entry.date && entry.date < filters.dateFrom) continue;
      if (filters.dateTo && entry.date && entry.date > filters.dateTo) continue;

      const subjectArea = extractSubjectArea(entry.url, "");
      if (filters.subjectArea && !(subjectArea ?? "").toLowerCase().includes(filters.subjectArea.toLowerCase())) {
        continue;
      }

      let az = "";
      if (filters.azPattern) {
        if (detailLookups >= BMF_AZ_DETAIL_LIMIT) break;
        detailLookups++;
        try {
          az = (await getBmfSchreibenByUrl(entry.url)).az;
        } catch {
          continue;
        }
        // AZ가 HTML에 없으면(2026 사이트는 PDF에만 둔다) 후보로 남기고, AZ가 있는데 다르면 버린다.
        if (az && !az.toLowerCase().replace(/\s+/g, " ").includes(filters.azPattern.toLowerCase().replace(/\s+/g, " "))) {
          continue;
        }
      }

      results.push({ az, date: entry.date, title: entry.title, subjectArea, url: entry.url });
    }

    // 새 항목이 없거나 페이지가 다 차지 않았으면 마지막 페이지다.
    if (newOnPage === 0 || entries.length < BMF_LIST_PAGE_SIZE) break;
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
