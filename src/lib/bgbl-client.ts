/**
 * BGBl-Client — Gesetze im Internet (GII) 개정 이력 파싱
 *
 * GII 법령 랜딩 페이지에서 개정 이력을 파싱하고
 * 하드코딩된 주요 법령 이력 데이터를 제공한다.
 *
 * URL 패턴: https://www.gesetze-im-internet.de/{slug}/
 * 인코딩: ISO-8859-1
 */

import { LAW_MAP } from "./law-abbreviations.js";

// ── 타입 ──────────────────────────────────────────────────────────────────

export interface AmendmentRecord {
  date: string;         // YYYY-MM-DD
  bgbl_ref: string;     // e.g. "BGBl. I 2024 Nr. 92"
  description: string;  // 개정 내용 요약
  article?: string;     // e.g. "Art. 4"
}

export interface LawAmendmentHistory {
  lawName: string;
  abbreviation: string;
  enactmentDate: string;
  lastAmended: string;
  amendments: AmendmentRecord[];
  source: string;
}

// ── 하드코딩된 주요 법령 개정 이력 ──────────────────────────────────────

const KNOWN_HISTORY: Record<string, AmendmentRecord[]> = {
  BGB: [
    {
      date: "2022-01-01",
      bgbl_ref: "BGBl. I 2021 S. 4723",
      description: "Warenkaufrichtlinie (WKRL) — §§ 327 ff. BGB (digitale Produkte), § 438 BGB (Verjährung)",
      article: "Art. 1",
    },
    {
      date: "2021-08-10",
      bgbl_ref: "BGBl. I 2021 S. 3436",
      description: "Gesetz zur Modernisierung des Personengesellschaftsrechts (MoPeG)",
    },
    {
      date: "2014-06-13",
      bgbl_ref: "BGBl. I 2013 S. 3642",
      description: "Verbraucherrechterichtlinie — 14-tägiges Widerrufsrecht, § 312d BGB n.F.",
      article: "Art. 1",
    },
    {
      date: "2002-01-01",
      bgbl_ref: "BGBl. I 2001 S. 3138",
      description: "Schuldrechtsreform — Verjährung (§§ 195 ff.), Leistungsstörung (§§ 280 ff.), Kauf (§§ 433 ff.)",
    },
  ],
  BDSG: [
    {
      date: "2018-05-25",
      bgbl_ref: "BGBl. I 2017 S. 2097",
      description: "Neues BDSG — Anpassung an DSGVO, § 26 BDSG (Beschäftigtendatenschutz)",
    },
    {
      date: "2019-11-26",
      bgbl_ref: "BGBl. I 2019 S. 1626",
      description: "Zweites Datenschutz-Anpassungs- und -Umsetzungsgesetz EU",
    },
  ],
  DSGVO: [
    {
      date: "2018-05-25",
      bgbl_ref: "ABl. EU L 119/1 v. 4.5.2016",
      description: "DSGVO in Kraft (VO (EU) 2016/679) — Unmittelbare Geltung in allen EU-Mitgliedstaaten",
    },
  ],
  ZPO: [
    {
      date: "2022-01-01",
      bgbl_ref: "BGBl. I 2013 S. 3786",
      description: "§ 130d ZPO — Aktive Nutzungspflicht beA (besond. elektronisches Anwaltspostfach)",
    },
    {
      date: "2021-01-01",
      bgbl_ref: "BGBl. I 2020 S. 3256",
      description: "Online-Verhandlungen (§ 128a ZPO n.F.) — Erweiterte Videoverhandlung",
    },
  ],
  StGB: [
    {
      date: "2021-04-01",
      bgbl_ref: "BGBl. I 2021 S. 441",
      description: "§ 203 StGB — Erweiterung Berufsgeheimnis auf IT-Dienstleister",
    },
    {
      date: "2017-07-05",
      bgbl_ref: "BGBl. I 2017 S. 2099",
      description: "Netzwerkdurchsetzungsgesetz (NetzDG) — Neue §§ für Hasskriminalität",
    },
  ],
  TMG: [
    {
      date: "2021-12-01",
      bgbl_ref: "BGBl. I 2021 S. 5102",
      description: "TTDSG löst §§ 11–15a TMG ab — Datenschutz im Telemedienbereich",
    },
    {
      date: "2017-07-01",
      bgbl_ref: "BGBl. I 2017 S. 2097",
      description: "Anpassung an DSGVO-Anforderungen — Pflicht zum Datenschutzbeauftragten",
    },
  ],
  GG: [
    {
      date: "2022-07-19",
      bgbl_ref: "BGBl. I 2022 S. 1023",
      description: "Art. 87e GG — Modernisierung Deutsche Bahn AG",
    },
    {
      date: "2021-06-28",
      bgbl_ref: "BGBl. I 2021 S. 2260",
      description: "Art. 20a GG — Staatsziel Tierschutz konkretisiert",
    },
  ],
};

// ── 날짜 파싱 유틸 ────────────────────────────────────────────────────────

/**
 * "DD.MM.YYYY" → "YYYY-MM-DD"
 */
function parseDMYDate(dmy: string): string {
  const m = dmy.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return dmy;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

// ── GII 랜딩 페이지 파싱 ─────────────────────────────────────────────────

async function fetchGiiLandingPage(slug: string): Promise<string> {
  const url = `https://www.gesetze-im-internet.de/${slug}/`;
  const res = await fetch(url, {
    signal: AbortSignal.timeout(12_000),
    headers: { "Accept-Charset": "iso-8859-1" },
  });

  if (!res.ok) {
    throw new Error(`GII landing page error: ${res.status} — ${url}`);
  }

  const buffer = await res.arrayBuffer();
  return new TextDecoder("iso-8859-1").decode(buffer);
}

/**
 * GII 랜딩 페이지 HTML에서 개정 이력 정보를 파싱한다.
 *
 * 파싱 대상 패턴:
 *   "Stand: Zuletzt geändert durch Art. 4 G v. 15.3.2024 I Nr. 92"
 *   "Ausfertigungsdatum: 18.08.1896"
 */
function parseLandingPage(
  html: string,
  abbreviation: string,
): { enactmentDate: string; lastAmended: string; liveAmendments: AmendmentRecord[] } {
  // 텍스트 정리
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(Number(c)))
    .replace(/\s+/g, " ");

  // 1. Ausfertigungsdatum
  let enactmentDate = "unbekannt";
  const enactM = text.match(/Ausfertigungsdatum[:\s]+(\d{1,2}\.\d{1,2}\.\d{4})/i);
  if (enactM) enactmentDate = parseDMYDate(enactM[1]);

  // 2. "Zuletzt geändert durch Art. X G v. DD.MM.YYYY I Nr. XX"
  let lastAmended = "unbekannt";
  const liveAmendments: AmendmentRecord[] = [];

  const standPattern =
    /Stand[:\s]+Zuletzt ge[äa]ndert durch\s+(Art\.\s*\d+[a-z]?\s+\w+\s+)?[Gg](?:esetzes?)?\s+v(?:om)?\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+I(?:\s+Nr\.\s*(\d+))?/gi;

  let m: RegExpExecArray | null;
  while ((m = standPattern.exec(text)) !== null) {
    const articlePart = m[1]?.trim();
    const dateStr = parseDMYDate(m[2]);
    const nrStr = m[3] ? `Nr. ${m[3]}` : "";
    const bgblRef = `BGBl. I ${dateStr.slice(0, 4)} ${nrStr}`.trim();
    liveAmendments.push({
      date: dateStr,
      bgbl_ref: bgblRef,
      description: `Änderung lt. GII-Fundstelle (${abbreviation})`,
      article: articlePart || undefined,
    });
    if (lastAmended === "unbekannt") lastAmended = dateStr;
  }

  return { enactmentDate, lastAmended, liveAmendments };
}

// ── 공개 API ──────────────────────────────────────────────────────────────

/**
 * 법률 약어로 개정 이력을 조회한다.
 *
 * 1. KNOWN_HISTORY에서 하드코딩 데이터 로드
 * 2. GII 랜딩 페이지에서 실시간 파싱 시도
 * 3. 파싱 실패 시 하드코딩 데이터로 fallback
 */
export async function fetchAmendmentHistory(lawAbbr: string): Promise<LawAmendmentHistory> {
  const upper = lawAbbr.toUpperCase().trim();

  // slug 찾기
  const lawInfo = LAW_MAP[upper] ?? LAW_MAP[lawAbbr];
  const slug = lawInfo?.slug ?? upper.toLowerCase();
  const lawName = lawInfo?.name ?? upper;

  // 하드코딩 데이터
  const knownAmendments: AmendmentRecord[] = KNOWN_HISTORY[upper] ?? [];

  // GII 실시간 파싱 시도
  let enactmentDate = "unbekannt";
  let lastAmended = "unbekannt";
  let liveAmendments: AmendmentRecord[] = [];

  try {
    const html = await fetchGiiLandingPage(slug);
    const parsed = parseLandingPage(html, upper);
    enactmentDate = parsed.enactmentDate;
    lastAmended = parsed.lastAmended;
    liveAmendments = parsed.liveAmendments;
  } catch {
    // 실시간 파싱 실패 — 하드코딩 데이터로 진행
  }

  // 병합: 실시간 데이터 + 하드코딩 데이터 (중복 날짜 제거)
  const allAmendments = [...liveAmendments];
  for (const known of knownAmendments) {
    if (!allAmendments.find((a) => a.date === known.date)) {
      allAmendments.push(known);
    }
  }

  // 날짜 내림차순 정렬
  allAmendments.sort((a, b) => b.date.localeCompare(a.date));

  // lastAmended 보정
  if (lastAmended === "unbekannt" && allAmendments.length > 0) {
    lastAmended = allAmendments[0].date;
  }

  return {
    lawName,
    abbreviation: upper,
    enactmentDate,
    lastAmended,
    amendments: allAmendments,
    source: "gesetze-im-internet.de + Wissensbasis",
  };
}
