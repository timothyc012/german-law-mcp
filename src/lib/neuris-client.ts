/**
 * NeuRIS API 클라이언트
 *
 * Base: https://testphase.rechtsinformationen.bund.de
 * 인증: 불필요
 * 상태: 시범 서비스 (데이터 불완전, API 변경 가능)
 */

import { LRUCache } from "./cache.js";
import { fetchWithRetry } from "./http-client.js";

const BASE_URL = "https://testphase.rechtsinformationen.bund.de";
const DEFAULT_SIZE = 10;
const MAX_SIZE = 50;

const cache = new LRUCache<string>(500, 3_600_000);

// ── 타입 ──

export interface LegislationSearchResult {
  totalItems: number;
  items: LegislationItem[];
}

export interface LegislationItem {
  id: string;
  name: string;
  abbreviation: string | null;
  alternateName: string | null;
  eli: string | null;
  status: string | null;
  textMatches: TextMatch[];
  htmlUrl: string | null;
}

export interface CaseLawSearchResult {
  totalItems: number;
  items: CaseLawItem[];
}

export interface CaseLawItem {
  documentNumber: string;
  ecli: string | null;
  headline: string | null;
  decisionDate: string | null;
  fileNumbers: string[];
  courtType: string | null;
  courtName: string | null;
  documentType: string | null;
  judicialBody: string | null;
  textMatches: TextMatch[];
}

export interface TextMatch {
  name: string | null;
  text: string;
  location: string | null;
}

export interface CourtEntry {
  id: string;
  count: number;
  label: string;
}

export interface UnifiedSearchResult {
  totalItems: number;
  items: Array<{
    type: "Legislation" | "Decision" | string;
    id: string;
    name: string | null;
    textMatches: TextMatch[];
  }>;
}

// ── 내부 유틸 ──

function clampSize(size: number | undefined): number {
  return Math.min(Math.max(size ?? DEFAULT_SIZE, 1), MAX_SIZE);
}

/**
 * 움라우트를 기본형으로 변환 (검색 폴백용)
 * ä→ae, ö→oe, ü→ue, ß→ss
 */
function deUmlaut(text: string): string {
  return text
    .replace(/ä/g, "ae").replace(/Ä/g, "Ae")
    .replace(/ö/g, "oe").replace(/Ö/g, "Oe")
    .replace(/ü/g, "ue").replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

/** <mark>...</mark> 태그 제거 */
function stripMark(html: string): string {
  return html.replace(/<\/?mark>/gi, "");
}

async function fetchJson<T>(url: string): Promise<T> {
  const cached = cache.get(url);
  if (cached) return JSON.parse(cached) as T;

  const res = await fetchWithRetry(url, {
    headers: { Accept: "application/json" },
  }, { timeoutMs: 15_000, source: "NeuRIS" });

  if (!res.ok) {
    throw new Error(`NeuRIS API error: ${res.status} ${res.statusText} — ${url}`);
  }

  const text = await res.text();
  cache.set(url, text);
  return JSON.parse(text) as T;
}

async function fetchText(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetchWithRetry(url, {}, { timeoutMs: 15_000, source: "NeuRIS" });

  if (!res.ok) {
    throw new Error(`NeuRIS API error: ${res.status} ${res.statusText} — ${url}`);
  }

  const text = await res.text();
  cache.set(url, text);
  return text;
}

// ── JSON-LD 파싱 헬퍼 ──

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseLegislationItem(raw: any): LegislationItem {
  const item = raw.item ?? raw;
  const matches: TextMatch[] = (raw.textMatches ?? []).map((m: any) => ({
    name: m.name ?? null,
    text: stripMark(m.text ?? ""),
    location: m.location ?? null,
  }));

  const htmlEncoding = (item.encoding ?? []).find((e: any) =>
    e.encodingFormat === "text/html"
  );

  return {
    id: item["@id"] ?? "",
    name: item.name ?? "",
    abbreviation: item.abbreviation ?? null,
    alternateName: item.alternateName ?? null,
    eli: item.legislationIdentifier ?? null,
    status: item.legislationLegalForce ?? null,
    textMatches: matches,
    htmlUrl: htmlEncoding?.contentUrl ?? null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseCaseLawItem(raw: any): CaseLawItem {
  const item = raw.item ?? raw;
  const matches: TextMatch[] = (raw.textMatches ?? []).map((m: any) => ({
    name: m.name ?? null,
    text: stripMark(m.text ?? ""),
    location: m.location ?? null,
  }));

  return {
    documentNumber: item.documentNumber ?? "",
    ecli: item.ecli ?? null,
    headline: item.headline ?? null,
    decisionDate: item.decisionDate ?? null,
    fileNumbers: item.fileNumbers ?? [],
    courtType: item.courtType ?? null,
    courtName: item.courtName ?? null,
    documentType: item.documentType ?? null,
    judicialBody: item.judicialBody ?? null,
    textMatches: matches,
  };
}

// ── 공개 API ──

/**
 * 법령 키워드 검색
 * 움라우트 검색 실패 시 기본형으로 재시도
 */
export async function searchLegislation(
  query: string,
  size?: number,
): Promise<LegislationSearchResult> {
  const s = clampSize(size);
  const url = `${BASE_URL}/v1/legislation?searchTerm=${encodeURIComponent(query)}&size=${s}`;
  const data = await fetchJson<any>(url);

  let result: LegislationSearchResult = {
    totalItems: data.totalItems ?? 0,
    items: (data.member ?? []).map(parseLegislationItem),
  };

  // 결과 없고 움라우트 포함 시 기본형으로 재시도
  if (result.totalItems === 0 && query !== deUmlaut(query)) {
    const fallbackUrl = `${BASE_URL}/v1/legislation?searchTerm=${encodeURIComponent(deUmlaut(query))}&size=${s}`;
    const fallbackData = await fetchJson<any>(fallbackUrl);
    result = {
      totalItems: fallbackData.totalItems ?? 0,
      items: (fallbackData.member ?? []).map(parseLegislationItem),
    };
  }

  return result;
}

/**
 * 판례 검색
 */
export async function searchCaseLaw(
  query: string,
  court?: string,
  size?: number,
): Promise<CaseLawSearchResult> {
  const s = clampSize(size);
  let url = `${BASE_URL}/v1/case-law?searchTerm=${encodeURIComponent(query)}&size=${s}`;
  if (court) {
    url += `&court=${encodeURIComponent(court)}`;
  }

  const data = await fetchJson<any>(url);

  let result: CaseLawSearchResult = {
    totalItems: data.totalItems ?? 0,
    items: (data.member ?? []).map(parseCaseLawItem),
  };

  // 움라우트 폴백
  if (result.totalItems === 0 && query !== deUmlaut(query)) {
    let fallbackUrl = `${BASE_URL}/v1/case-law?searchTerm=${encodeURIComponent(deUmlaut(query))}&size=${s}`;
    if (court) fallbackUrl += `&court=${encodeURIComponent(court)}`;
    const fallbackData = await fetchJson<any>(fallbackUrl);
    result = {
      totalItems: fallbackData.totalItems ?? 0,
      items: (fallbackData.member ?? []).map(parseCaseLawItem),
    };
  }

  return result;
}

/**
 * 판례 메타데이터 조회
 */
export async function getCaseLawMeta(documentNumber: string): Promise<CaseLawItem> {
  const url = `${BASE_URL}/v1/case-law/${encodeURIComponent(documentNumber)}`;
  const data = await fetchJson<any>(url);
  return parseCaseLawItem({ item: data, textMatches: [] });
}

/**
 * 판결문 HTML 전문 조회
 */
export async function getCaseLawHtml(documentNumber: string): Promise<string> {
  const url = `${BASE_URL}/v1/case-law/${encodeURIComponent(documentNumber)}.html`;
  return fetchText(url);
}

/**
 * 법원 목록 조회
 */
export async function getCourts(): Promise<CourtEntry[]> {
  const url = `${BASE_URL}/v1/case-law/courts`;
  return fetchJson<CourtEntry[]>(url);
}

/**
 * 통합 검색 (법령 + 판례)
 */
export async function searchAll(
  query: string,
  size?: number,
): Promise<UnifiedSearchResult> {
  const s = clampSize(size);
  const url = `${BASE_URL}/v1/document?searchTerm=${encodeURIComponent(query)}&size=${s}`;
  const data = await fetchJson<any>(url);

  return {
    totalItems: data.totalItems ?? 0,
    items: (data.member ?? []).map((raw: any) => {
      const item = raw.item ?? raw;
      return {
        type: item["@type"] ?? "Unknown",
        id: item["@id"] ?? "",
        name: item.name ?? item.headline ?? null,
        textMatches: (raw.textMatches ?? []).map((m: any) => ({
          name: m.name ?? null,
          text: stripMark(m.text ?? ""),
          location: m.location ?? null,
        })),
      };
    }),
  };
}

/**
 * Lucene 고급 검색
 */
export async function luceneSearch(
  query: string,
  size?: number,
): Promise<UnifiedSearchResult> {
  const s = clampSize(size);
  const url = `${BASE_URL}/v1/document/lucene-search?query=${encodeURIComponent(query)}&size=${s}`;
  const data = await fetchJson<any>(url);

  return {
    totalItems: data.totalItems ?? 0,
    items: (data.member ?? []).map((raw: any) => {
      const item = raw.item ?? raw;
      return {
        type: item["@type"] ?? "Unknown",
        id: item["@id"] ?? "",
        name: item.name ?? item.headline ?? null,
        textMatches: (raw.textMatches ?? []).map((m: any) => ({
          name: m.name ?? null,
          text: stripMark(m.text ?? ""),
          location: m.location ?? null,
        })),
      };
    }),
  };
}
