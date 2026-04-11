/**
 * Gesetze im Internet (GII) 클라이언트
 *
 * Base: https://www.gesetze-im-internet.de
 * 인코딩: ISO-8859-1 (latin-1) — UTF-8 변환 필요
 * 커버리지: ~6,450 연방법률 전체
 */

import { LRUCache } from "./cache.js";
import { findLaw, buildGiiSectionUrl, type LawInfo } from "./law-abbreviations.js";

const GII_BASE = "https://www.gesetze-im-internet.de";

const cache = new LRUCache<string>(300, 3_600_000);

// ── 타입 ──

export interface CrossReference {
  law: string;
  section: string;
  display: string;
}

export interface LawSection {
  law: string;
  lawName: string;
  section: string;
  title: string;
  content: string;
  url: string;
  crossReferences: CrossReference[];
  source: "GII" | "NeuRIS";
  fetchedAt: string;
}

export interface TocEntry {
  title: string;
  slug: string;
  xmlUrl: string;
}

// ── 내부 유틸 ──

/**
 * GII HTML을 가져온다 (ISO-8859-1 → UTF-8 변환)
 */
async function fetchGiiHtml(url: string): Promise<string> {
  const cached = cache.get(url);
  if (cached) return cached;

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`GII error: ${res.status} — ${url}`);
  }

  // ISO-8859-1 디코딩
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("iso-8859-1").decode(buffer);
  cache.set(url, text);
  return text;
}

/**
 * GII HTML에서 조문 제목을 추출한다
 */
function extractTitle(html: string): string {
  // <span class="jnenbez">§ 437</span> <span class="jnentitel">Rechte des Käufers bei Mängeln</span>
  const titleMatch = html.match(/<span[^>]*class="jnentitel"[^>]*>(.*?)<\/span>/i);
  const sectionMatch = html.match(/<span[^>]*class="jnenbez"[^>]*>(.*?)<\/span>/i);

  const parts: string[] = [];
  if (sectionMatch) parts.push(sectionMatch[1].trim());
  if (titleMatch) parts.push(titleMatch[1].trim());

  return parts.join(" — ") || "Unbekannt";
}

/**
 * GII HTML에서 조문 본문을 추출한다
 */
function extractContent(html: string): string {
  // <div class="jnhtml"> 안의 텍스트 추출
  const bodyMatch = html.match(/<div[^>]*class="jnhtml"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|\s*<!--)/i);
  if (!bodyMatch) {
    // 폴백: body 전체에서 텍스트 추출
    const fallback = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (!fallback) return "";
    return stripHtml(fallback[1]);
  }

  return stripHtml(bodyMatch[1]);
}

/**
 * HTML 태그를 제거하고 텍스트만 남긴다
 */
function stripHtml(html: string): string {
  return html
    // <br> → 줄바꿈
    .replace(/<br\s*\/?>/gi, "\n")
    // <p>, </p> → 줄바꿈
    .replace(/<\/?(p|div|dl|dt|dd|table|tr)[^>]*>/gi, "\n")
    // <li> → 줄바꿈 + 들여쓰기
    .replace(/<li[^>]*>/gi, "\n  ")
    // 나머지 태그 제거
    .replace(/<[^>]+>/g, "")
    // HTML 엔티티 변환
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    // 연속 공백/줄바꿈 정리
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * 조문 텍스트에서 교차참조(§ 참조)를 추출한다
 *
 * 패턴 예시:
 *   § 439 → { law: same, section: "439" }
 *   §§ 440, 323 → 두 개 추출
 *   § 280 Abs. 1 → { law: same, section: "280" }
 *   Art. 1 GG → { law: "GG", section: "1" }
 */
function extractCrossReferences(content: string, currentLaw: string): CrossReference[] {
  const refs: CrossReference[] = [];
  const seen = new Set<string>();

  // §§ 440, 323 und 326 Abs. 5 패턴
  const multiPattern = /§§?\s*([\d]+[a-z]?)(?:\s*(?:,|und|bis|oder)\s*([\d]+[a-z]?))*(?:\s+(\w+))?/gi;
  let match;
  while ((match = multiPattern.exec(content)) !== null) {
    const fullMatch = match[0];
    // 숫자만 추출
    const numbers = fullMatch.match(/\d+[a-z]?/g);
    // 법률명이 뒤에 있는지 확인
    const lawMatch = fullMatch.match(/\d+[a-z]?\s+(BGB|StGB|GG|HGB|ZPO|StPO|AO|EStG|UStG|KStG|GewStG|VwVfG|VwGO|InsO|GmbHG|AktG|SGB|BetrVG|KSchG|BauGB|UrhG|PatG|MarkenG|UWG|GWB|BDSG|BImSchG|FGO|OWiG|AGG)\b/i);
    const refLaw = lawMatch ? lawMatch[1] : currentLaw;

    if (numbers) {
      for (const num of numbers) {
        const key = `${refLaw}:${num}`;
        if (!seen.has(key) && num !== "0") {
          seen.add(key);
          const prefix = refLaw === "GG" ? "Art." : "§";
          refs.push({
            law: refLaw,
            section: num,
            display: `${prefix} ${num} ${refLaw}`,
          });
        }
      }
    }
  }

  // Art. N GG 패턴
  const artPattern = /Art\.?\s*(\d+[a-z]?)\s+(GG|EGBGB)\b/gi;
  while ((match = artPattern.exec(content)) !== null) {
    const key = `${match[2]}:${match[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      refs.push({
        law: match[2],
        section: match[1],
        display: `Art. ${match[1]} ${match[2]}`,
      });
    }
  }

  // 자기 자신 제거
  return refs.filter((r) => !(r.law === currentLaw && r.section === content));
}

// ── 공개 API ──

/**
 * 법률 약어 + 조문 번호로 조문을 조회한다
 *
 * @param abbreviation 법률 약어 (예: "BGB", "StGB", "GG")
 * @param section 조문 번호 (예: "437", "1", "823")
 */
export async function getLawSection(
  abbreviation: string,
  section: string,
): Promise<LawSection> {
  const lawInfo = findLaw(abbreviation);
  if (!lawInfo) {
    throw new Error(
      `Unknown law abbreviation: "${abbreviation}". ` +
      `Use common German law abbreviations like BGB, StGB, GG, etc.`
    );
  }

  const url = buildGiiSectionUrl(lawInfo.slug, section, lawInfo.sectionPrefix);
  const html = await fetchGiiHtml(url);

  const title = extractTitle(html);
  const content = extractContent(html);

  if (!content) {
    throw new Error(
      `Could not extract content for ${abbreviation} ${lawInfo.sectionPrefix} ${section}. ` +
      `The section may not exist or the page structure may have changed.`
    );
  }

  const crossReferences = extractCrossReferences(content, abbreviation);

  return {
    law: abbreviation,
    lawName: lawInfo.name,
    section,
    title,
    content,
    url,
    crossReferences,
    source: "GII" as const,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * GII 전체 목차(법률 목록)를 조회한다
 */
export async function getToc(): Promise<TocEntry[]> {
  const cached = cache.get("gii-toc");
  if (cached) return JSON.parse(cached);

  const url = `${GII_BASE}/gii-toc.xml`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`GII TOC error: ${res.status}`);
  }

  const xml = await res.text();

  // 간단한 XML 파싱 (외부 라이브러리 없이)
  const entries: TocEntry[] = [];
  const itemRegex = /<item>\s*<title>(.*?)<\/title>\s*<link>(.*?)<\/link>\s*<\/item>/gs;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const title = match[1].trim();
    const link = match[2].trim();
    // slug 추출: URL의 마지막 경로 부분
    const slugMatch = link.match(/\/([^/]+)\.zip$/);
    entries.push({
      title,
      slug: slugMatch ? slugMatch[1] : "",
      xmlUrl: link,
    });
  }

  cache.set("gii-toc", JSON.stringify(entries));
  return entries;
}

/**
 * 약어로 GII 목차에서 법률을 찾는다 (폴백 검색용)
 */
export async function searchTocByAbbreviation(
  abbreviation: string,
): Promise<TocEntry | null> {
  const toc = await getToc();
  const lower = abbreviation.toLowerCase();

  // slug가 약어와 일치하는 항목 찾기
  const exact = toc.find((e) => e.slug.toLowerCase() === lower);
  if (exact) return exact;

  // 제목에 약어가 포함된 항목 찾기
  const partial = toc.find((e) =>
    e.title.toLowerCase().includes(lower) ||
    e.slug.toLowerCase().includes(lower)
  );
  return partial ?? null;
}
