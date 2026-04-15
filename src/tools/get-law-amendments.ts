/**
 * get_law_amendments — 법률 개정 이력 조회
 *
 * GII의 법률 인덱스 페이지를 파싱하여 개정 이력(Stand)을 추출한다.
 * 어떤 법률에 의해 언제 개정되었는지를 보여준다.
 */

import { z } from "zod";
import { findLaw } from "../lib/law-abbreviations.js";
import { LRUCache } from "../lib/cache.js";

const GII_BASE = "https://www.gesetze-im-internet.de";
const cache = new LRUCache<string>(100, 3_600_000);

export const getLawAmendmentsSchema = z.object({
  law: z.string().describe("법률 약어 (예: 'BGB', 'StGB', 'GG')"),
});

export type GetLawAmendmentsInput = z.infer<typeof getLawAmendmentsSchema>;

export async function getLawAmendments(input: GetLawAmendmentsInput): Promise<string> {
  const { law } = input;

  try {
    const lawInfo = findLaw(law);
    if (!lawInfo) {
      return `[오류] 알 수 없는 법률 약어: "${law}". BGB, StGB, GG 등의 약어를 사용하세요.`;
    }

    const url = `${GII_BASE}/${lawInfo.slug}/index.html`;
    const cacheKey = `amendments:${lawInfo.slug}`;
    let html: string;

    const cached = cache.get(cacheKey);
    if (cached) {
      html = cached;
    } else {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        throw new Error(`GII error: ${res.status} — ${url}`);
      }
      const buffer = await res.arrayBuffer();
      html = new TextDecoder("iso-8859-1").decode(buffer);
      cache.set(cacheKey, html);
    }

    const lines: string[] = [
      `[VERIFIED — GII 원문확인] ${new Date().toISOString().slice(0, 10)}`,
      `[${law} — ${lawInfo.name}]`,
      ``,
    ];

    // Extract "Stand:" (amendment status)
    // Pattern: "Stand: Zuletzt geändert durch ..."
    const standMatch = html.match(/Stand:\s*([\s\S]*?)(?:<\/|<br|<p)/i);
    if (standMatch) {
      const standText = standMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      lines.push(`현행 상태: ${standText}`);
      lines.push("");
    }

    // Extract "Hinweis:" (notes)
    const hinweisMatch = html.match(/Hinweis:\s*([\s\S]*?)(?:<\/|<br|<p)/i);
    if (hinweisMatch) {
      const hinweisText = hinweisMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      if (hinweisText) {
        lines.push(`참고: ${hinweisText}`);
        lines.push("");
      }
    }

    // Extract Fußnoten (footnotes) which contain detailed amendment history
    const footnotePattern = /(?:Fu(?:ß|ss)note|FN\b|Textnachweis)[^<]*([\s\S]*?)(?=<\/div>|<h[1-4])/gi;
    let fnMatch;
    const footnotes: string[] = [];
    while ((fnMatch = footnotePattern.exec(html)) !== null) {
      const fnText = fnMatch[1]
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      if (fnText.length > 10) {
        footnotes.push(fnText);
      }
    }

    // Also look for amendment entries in the page body
    // Pattern: "Art. X G v. DD.MM.YYYY" or "Artikel X des Gesetzes vom ..."
    const amendmentPattern = /(?:ge[aä]ndert|eingef[uü]gt|aufgehoben|neugefasst)\s+durch\s+(?:Art\.?\s*\d+[a-z]?\s+)?(?:(?:des\s+)?(?:Gesetz(?:es)?|G|Verordnung|VO)\s+(?:vom|v\.)\s+\d{1,2}\.\s*\d{1,2}\.\s*\d{4}[^<)]*)/gi;
    const amendments: string[] = [];
    const seen = new Set<string>();

    // Search in full HTML
    const bodyText = html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&sect;/g, "§")
      .replace(/\s+/g, " ");

    let amMatch;
    while ((amMatch = amendmentPattern.exec(bodyText)) !== null) {
      const text = amMatch[0].trim();
      // Deduplicate
      const key = text.replace(/\s+/g, " ").substring(0, 80);
      if (!seen.has(key)) {
        seen.add(key);
        amendments.push(text);
      }
    }

    if (amendments.length > 0) {
      lines.push(`── 개정 이력 (${amendments.length}건) ──`);
      for (let i = 0; i < Math.min(amendments.length, 20); i++) {
        lines.push(`  ${i + 1}. ${amendments[i]}`);
      }
      if (amendments.length > 20) {
        lines.push(`  ... 외 ${amendments.length - 20}건`);
      }
      lines.push("");
    }

    if (footnotes.length > 0) {
      lines.push(`── 주석 ──`);
      for (const fn of footnotes.slice(0, 5)) {
        lines.push(`  ${fn.substring(0, 300)}`);
      }
      lines.push("");
    }

    lines.push(`출처: ${url}`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[개정 이력 조회 오류] ${message}`;
  }
}
