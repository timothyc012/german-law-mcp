/**
 * get_law_toc — 법률 목차(Inhaltsverzeichnis) 조회
 *
 * GII 인덱스 페이지를 파싱하여 법률의 전체 구조(편/장/절/조)를 보여준다.
 */

import { z } from "zod";
import { findLaw } from "../lib/law-abbreviations.js";
import { LRUCache } from "../lib/cache.js";
import { fetchWithRetry } from "../lib/http-client.js";

const GII_BASE = "https://www.gesetze-im-internet.de";
const cache = new LRUCache<string>(100, 3_600_000, { persistenceName: "get-law-toc" });

export const getLawTocSchema = z.object({
  law: z.string().describe("법률 약어 (예: 'BGB', 'StGB', 'GG')"),
});

export type GetLawTocInput = z.infer<typeof getLawTocSchema>;

interface TocItem {
  level: "part" | "chapter" | "section" | "article";
  label: string;
  slug: string;
}

export async function getLawToc(input: GetLawTocInput): Promise<string> {
  const { law } = input;

  try {
    const lawInfo = findLaw(law);
    if (!lawInfo) {
      return `[오류] 알 수 없는 법률 약어: "${law}". BGB, StGB, GG 등의 약어를 사용하세요.`;
    }

    const url = `${GII_BASE}/${lawInfo.slug}/index.html`;
    const cacheKey = `toc:${lawInfo.slug}`;
    let html: string;

    const cached = cache.get(cacheKey);
    if (cached) {
      html = cached;
    } else {
      const res = await fetchWithRetry(url, {}, { timeoutMs: 15_000, source: "GII TOC page" });
      if (!res.ok) {
        throw new Error(`GII error: ${res.status} — ${url}`);
      }
      const buffer = await res.arrayBuffer();
      html = new TextDecoder("iso-8859-1").decode(buffer);
      cache.set(cacheKey, html);
    }

    const items = parseToc(html);

    if (items.length === 0) {
      return `[목차 조회 오류] ${law}의 목차를 파싱할 수 없습니다.\n출처: ${url}`;
    }

    const lines: string[] = [
      `[VERIFIED — GII 원문확인] ${new Date().toISOString().slice(0, 10)}`,
      `[${law} — ${lawInfo.name}]`,
      `[목차: ${items.length}개 항목]`,
      ``,
    ];

    for (const item of items) {
      const indent = item.level === "part" ? "" :
        item.level === "chapter" ? "  " :
        item.level === "section" ? "    " : "      ";
      lines.push(`${indent}${item.label}`);
    }

    lines.push(``);
    lines.push(`출처: ${url}`);
    lines.push(`get_law_section 도구로 구체적인 조문을 조회하세요.`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[목차 조회 오류] ${message}`;
  }
}

function parseToc(html: string): TocItem[] {
  const items: TocItem[] = [];

  // GII TOC structure uses nested divs/spans with specific classes
  // Look for links to sections: <a href="__437.html">§ 437 Rechte des Käufers</a>
  // And structural headers: Buch 1, Teil 1, Abschnitt 1, etc.

  // Extract all links and structural elements from the TOC area
  const tocMatch = html.match(/<div[^>]*class="[^"]*jnnorm[^"]*"[^>]*>([\s\S]*)/i) ??
    html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

  if (!tocMatch) return items;

  const tocHtml = tocMatch[1];

  // Combined approach: go through HTML line by line
  const allLines = tocHtml.split("\n");

  for (const line of allLines) {
    // Check for structural headers
    const hMatch = line.match(/(Buch|Teil|Kapitel|Abschnitt|Unterabschnitt|Titel)\s+(\d+[^<]*)/i);
    if (hMatch) {
      const type = hMatch[1].toLowerCase();
      const label = hMatch[0].replace(/<[^>]+>/g, "").trim();
      const level = (type === "buch" || type === "teil") ? "part" as const :
        (type === "kapitel") ? "chapter" as const : "section" as const;
      items.push({ level, label, slug: "" });
    }

    // Check for section links
    const sMatch = line.match(/<a[^>]*href="([^"]*)"[^>]*>\s*((?:§|Art\.?)\s*\d+[a-z]?\s*[^<]*)<\/a>/i);
    if (sMatch) {
      const label = sMatch[2].replace(/\s+/g, " ").trim();
      items.push({ level: "article", label, slug: sMatch[1] });
    }
  }

  return items;
}
