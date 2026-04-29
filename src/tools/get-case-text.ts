/**
 * get_case_text — 판결문 전문 조회
 *
 * NeuRIS에서 판결문 HTML을 가져와 텍스트로 변환한다.
 * search_case_law 결과의 documentNumber를 입력으로 사용한다.
 */

import { z } from "zod";
import { getCaseLawMeta, getCaseLawHtml } from "../lib/neuris-client.js";

export const getCaseTextSchema = z.object({
  documentNumber: z.string().describe("NeuRIS 문서번호 (예: 'JURE120015069'). search_case_law 결과에서 획득."),
  section: z
    .enum(["full", "summary", "tenor", "facts", "reasons"])
    .optional()
    .default("full")
    .describe("반환할 판결문 구간. full=본문, summary=Leitsatz/요지, tenor=주문, facts=Tatbestand/Sachverhalt, reasons=Entscheidungsgründe."),
  offset: z
    .number()
    .int()
    .min(0)
    .optional()
    .default(0)
    .describe("긴 판결문 페이지네이션 시작 위치(문자 offset)."),
  maxChars: z
    .number()
    .int()
    .min(500)
    .max(20000)
    .optional()
    .default(8000)
    .describe("반환할 최대 문자 수. 기본 8000, 최대 20000."),
});

export type GetCaseTextInput = z.input<typeof getCaseTextSchema>;

type CaseTextSection = z.output<typeof getCaseTextSchema>["section"];

const SECTION_LABEL: Record<CaseTextSection, string> = {
  full: "Volltext",
  summary: "Leitsatz/Orientierungssatz",
  tenor: "Tenor",
  facts: "Tatbestand/Sachverhalt",
  reasons: "Entscheidungsgründe",
};

const SECTION_PATTERNS: Record<Exclude<CaseTextSection, "full">, RegExp[]> = {
  summary: [/Leits[aä]tz(?:e)?/i, /amtlicher\s+Leits[aä]tz/i, /Orientierungss[aä]tz(?:e)?/i],
  tenor: [/Tenor/i, /Entscheidungsformel/i],
  facts: [/Tatbestand/i, /Sachverhalt/i],
  reasons: [/Entscheidungsgr[üu]nde/i, /Gr[üu]nde/i, /Aus\s+den\s+Gr[üu]nden/i],
};

const ALL_SECTION_HEADINGS = [
  ...SECTION_PATTERNS.summary,
  ...SECTION_PATTERNS.tenor,
  ...SECTION_PATTERNS.facts,
  ...SECTION_PATTERNS.reasons,
];

export async function getCaseText(input: GetCaseTextInput): Promise<string> {
  const { documentNumber, section, offset, maxChars } = getCaseTextSchema.parse(input);

  try {
    // 메타데이터 조회
    const meta = await getCaseLawMeta(documentNumber);

    // HTML 전문 조회
    const html = await getCaseLawHtml(documentNumber);
    const text = stripHtml(html);
    const availableSections = detectAvailableSections(text);
    const selectedText = selectCaseTextSection(text, section, meta.headline);
    const page = sliceTextWindow(selectedText.text, offset, maxChars);

    const lines: string[] = [
      `[VERIFIED — NeuRIS 원문확인] ${new Date().toISOString().slice(0, 10)}`,
      `[판결문: ${documentNumber}]`,
      "",
      `법원: ${meta.courtName ?? "불명"} (${meta.courtType ?? ""})`,
      `재판부: ${meta.judicialBody ?? "불명"}`,
      `일자: ${meta.decisionDate ?? "불명"}`,
      `유형: ${meta.documentType ?? "불명"}`,
      `사건번호: ${meta.fileNumbers.join(", ") || "불명"}`,
    ];

    if (meta.ecli) {
      lines.push(`ECLI: ${meta.ecli}`);
    }
    if (meta.headline) {
      lines.push(`요지: ${meta.headline}`);
    }
    lines.push(`요청 구간: ${SECTION_LABEL[section]}`);
    lines.push(`발견된 구간: ${availableSections.join(", ") || "자동 인식 없음"}`);

    lines.push("");
    lines.push("─".repeat(60));
    lines.push("");

    if (selectedText.warning) {
      lines.push(`[Hinweis] ${selectedText.warning}`);
      lines.push("");
    }

    lines.push(`[Ausschnitt: Zeichen ${page.start + 1}-${page.end} von ${page.total}]`);
    lines.push("");

    if (page.text) {
      lines.push(page.text);
    } else {
      lines.push("(요청한 offset 이후에 표시할 텍스트가 없습니다.)");
    }

    if (page.hasMore) {
      lines.push("");
      lines.push(`... (${page.total}자 중 ${page.end}자까지 표시)`);
      lines.push(`다음 구간: get_case_text({ documentNumber: "${documentNumber}", section: "${section}", offset: ${page.end}, maxChars: ${maxChars} })`);
    }
    lines.push(`원문: https://testphase.rechtsinformationen.bund.de/v1/case-law/${documentNumber}.html`);

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] 판결문 조회 실패: ${message}\n\n문서번호를 확인해 주세요. search_case_law로 먼저 검색하세요.`;
  }
}

export function stripHtml(html: string): string {
  return decodeHtmlEntities(html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|section|article|header|footer|table|tr|ul|ol|blockquote)[^>]*>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n  - ")
    .replace(/<td[^>]*>/gi, " | ")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " "))
    .trim();
}

export function selectCaseTextSection(
  text: string,
  section: CaseTextSection,
  headline: string | null,
): { text: string; warning: string | null } {
  if (section === "full") {
    return { text, warning: null };
  }

  const extracted = extractSection(text, SECTION_PATTERNS[section]);
  if (extracted) {
    return { text: extracted, warning: null };
  }

  if (section === "summary" && headline) {
    return {
      text: headline,
      warning: "Leitsatz/Orientierungssatz wurde im Volltext nicht eindeutig erkannt; die NeuRIS-Headline wird angezeigt.",
    };
  }

  return {
    text: "",
    warning: `${SECTION_LABEL[section]} wurde im Volltext nicht eindeutig erkannt. Verwenden Sie section="full" oder prüfen Sie die Originalquelle.`,
  };
}

function detectAvailableSections(text: string): string[] {
  return (Object.keys(SECTION_PATTERNS) as Exclude<CaseTextSection, "full">[])
    .filter((section) => SECTION_PATTERNS[section].some((pattern) => findHeadingLine(text, pattern) >= 0))
    .map((section) => SECTION_LABEL[section]);
}

function extractSection(text: string, headingPatterns: RegExp[]): string | null {
  const lines = text.split("\n");
  const startLine = lines.findIndex((line) => headingPatterns.some((pattern) => isHeadingLine(line, pattern)));

  if (startLine < 0) {
    return null;
  }

  const nextHeadingLine = lines.findIndex((line, index) =>
    index > startLine && ALL_SECTION_HEADINGS.some((pattern) => isHeadingLine(line, pattern))
  );
  const endLine = nextHeadingLine >= 0 ? nextHeadingLine : lines.length;

  return lines.slice(startLine + 1, endLine).join("\n").trim() || null;
}

function findHeadingLine(text: string, pattern: RegExp): number {
  const lines = text.split("\n");
  let position = 0;
  for (const line of lines) {
    if (isHeadingLine(line, pattern)) {
      return position;
    }
    position += line.length + 1;
  }
  return -1;
}

function isHeadingLine(line: string, pattern: RegExp): boolean {
  const normalized = line.trim().replace(/:$/, "");
  if (normalized.length === 0 || normalized.length > 100) {
    return false;
  }
  return pattern.test(normalized) && /^[A-ZÄÖÜ][A-Za-zÄÖÜäöüß\s.-]+$/.test(normalized);
}

function sliceTextWindow(text: string, offset: number, maxChars: number) {
  const start = Math.min(offset, text.length);
  const end = Math.min(start + maxChars, text.length);
  return {
    text: text.slice(start, end),
    start,
    end,
    total: text.length,
    hasMore: end < text.length,
  };
}

function decodeHtmlEntities(text: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    bdquo: "„",
    gt: ">",
    ldquo: "“",
    lt: "<",
    nbsp: " ",
    quot: '"',
    sect: "§",
    szlig: "ß",
    auml: "ä",
    ouml: "ö",
    uuml: "ü",
    Auml: "Ä",
    Ouml: "Ö",
    Uuml: "Ü",
  };

  return text
    .replace(/&([A-Za-z]+);/g, (match, name: string) => named[name] ?? match)
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-fA-F]+);/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 16)));
}
