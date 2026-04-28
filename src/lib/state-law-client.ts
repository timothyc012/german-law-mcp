/**
 * state-law-client.ts — 독일 주법(Landesrecht) 클라이언트
 *
 * 전략:
 *   - Bayern: gesetze-bayern.de — GET /Content/Document/{ABBR} 직접 파싱 가능
 *   - Berlin/Hamburg/Hessen/BW/NRW: juris GmbH 엔진 기반 SPA — 약어 직접 URL 매핑
 *   - 모든 주: 알려진 주요 법령 약어 사전(KNOWN_STATE_LAWS)으로 검색 지원
 *
 * 지원 주: BY, BE, HH, HE, BW, NW, NI, SN, TH, BB, MV, RP, SL, ST, SH
 */

import { LRUCache } from "./cache.js";
import { fetchWithRetry } from "./http-client.js";

const cache = new LRUCache<StateLawSection>(200, 3_600_000);

// ── 타입 ────────────────────────────────────────────────────────────────────

export type StateCode =
  | "BY" | "BE" | "HH" | "HE" | "BW" | "NW" | "NI"
  | "SN" | "TH" | "BB" | "MV" | "RP" | "SL" | "ST" | "SH";

export const STATE_NAMES: Record<StateCode, string> = {
  BY: "Bayern",
  BE: "Berlin",
  HH: "Hamburg",
  HE: "Hessen",
  BW: "Baden-Württemberg",
  NW: "Nordrhein-Westfalen",
  NI: "Niedersachsen",
  SN: "Sachsen",
  TH: "Thüringen",
  BB: "Brandenburg",
  MV: "Mecklenburg-Vorpommern",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
};

export const STATE_PORTALS: Record<StateCode, string> = {
  BY: "https://www.gesetze-bayern.de",
  BE: "https://gesetze.berlin.de/bsbe",
  HH: "https://www.landesrecht-hamburg.de/bsha",
  HE: "https://www.rv.hessenrecht.hessen.de/bshe",
  BW: "https://www.landesrecht-bw.de/bsbw",
  NW: "https://recht.nrw.de",
  NI: "https://www.landesrecht-ni.de/bsni",
  SN: "https://www.revosax.sachsen.de",
  TH: "https://landesrecht.thueringen.de/bsth",
  BB: "https://bravors.brandenburg.de",
  MV: "https://www.landesrecht-mv.de/bsmv",
  RP: "https://landesrecht.rlp.de/bsrp",
  SL: "https://recht.saarland.de/bssl",
  ST: "https://www.landesrecht.sachsen-anhalt.de/bsst",
  SH: "https://www.gesetze-rechtsprechung.sh.juris.de/bssh",
};

export interface StateLawEntry {
  state: StateCode;
  stateName: string;
  abbreviation: string;       // 주법 약어 (예: BayBO, PolG BE)
  fullName: string;           // 법령 전체명
  docId: string;              // 포털 내부 문서 ID
  url: string;                // 직접 접근 URL
  category: string;           // 법령 분야
  lastUpdated?: string;
}

export interface StateLawSection {
  state: StateCode;
  stateName: string;
  law: string;
  lawName: string;
  section: string;
  title: string;
  content: string;
  url: string;
  fetchedAt: string;
}

export interface StateLawSearchResult {
  query: string;
  results: StateLawEntry[];
  totalFound: number;
}

// ── 알려진 주법 사전 ─────────────────────────────────────────────────────────
// 분야: police(경찰), building(건축), education(교육), press(언론), data(데이터),
//       court(법원조직), local(지방자치), environ(환경), tax(세금), health(보건)

export const KNOWN_STATE_LAWS: StateLawEntry[] = [

  // ── Bayern (BY) ──────────────────────────────────────────────────────────
  { state: "BY", stateName: "Bayern", abbreviation: "PAG", category: "police",
    fullName: "Polizeiaufgabengesetz Bayern",
    docId: "BayPAG", url: "https://www.gesetze-bayern.de/Content/Document/BayPAG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayBO", category: "building",
    fullName: "Bayerische Bauordnung",
    docId: "BayBO", url: "https://www.gesetze-bayern.de/Content/Document/BayBO" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayEUG", category: "education",
    fullName: "Bayerisches Gesetz über das Erziehungs- und Unterrichtswesen",
    docId: "BayEUG", url: "https://www.gesetze-bayern.de/Content/Document/BayEUG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayDSG", category: "data",
    fullName: "Bayerisches Datenschutzgesetz",
    docId: "BayDSG", url: "https://www.gesetze-bayern.de/Content/Document/BayDSG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayGO", category: "local",
    fullName: "Gemeindeordnung für den Freistaat Bayern",
    docId: "BayGO", url: "https://www.gesetze-bayern.de/Content/Document/BayGO" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayVwVfG", category: "admin",
    fullName: "Bayerisches Verwaltungsverfahrensgesetz",
    docId: "BayVwVfG", url: "https://www.gesetze-bayern.de/Content/Document/BayVwVfG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayPrG", category: "press",
    fullName: "Bayerisches Pressegesetz",
    docId: "BayPrG", url: "https://www.gesetze-bayern.de/Content/Document/BayPrG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayStrWG", category: "transport",
    fullName: "Bayerisches Straßen- und Wegegesetz",
    docId: "BayStrWG", url: "https://www.gesetze-bayern.de/Content/Document/BayStrWG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayNatSchG", category: "environ",
    fullName: "Bayerisches Naturschutzgesetz",
    docId: "BayNatSchG", url: "https://www.gesetze-bayern.de/Content/Document/BayNatSchG" },
  { state: "BY", stateName: "Bayern", abbreviation: "BayVGG", category: "court",
    fullName: "Bayerisches Verwaltungsgerichtsgesetz",
    docId: "BayVGG", url: "https://www.gesetze-bayern.de/Content/Document/BayVGG" },

  // ── Berlin (BE) ───────────────────────────────────────────────────────────
  { state: "BE", stateName: "Berlin", abbreviation: "ASOG", category: "police",
    fullName: "Allgemeines Sicherheits- und Ordnungsgesetz Berlin",
    docId: "jlr-ASOGBE2006rahmen", url: "https://gesetze.berlin.de/bsbe/document/jlr-ASOGBE2006rahmen" },
  { state: "BE", stateName: "Berlin", abbreviation: "BauO Bln", category: "building",
    fullName: "Bauordnung für Berlin",
    docId: "jlr-BauOBE2005rahmen", url: "https://gesetze.berlin.de/bsbe/document/jlr-BauOBE2005rahmen" },
  { state: "BE", stateName: "Berlin", abbreviation: "BlnDSG", category: "data",
    fullName: "Berliner Datenschutzgesetz",
    docId: "jlr-DSGBE2020rahmen", url: "https://gesetze.berlin.de/bsbe/document/jlr-DSGBE2020rahmen" },
  { state: "BE", stateName: "Berlin", abbreviation: "SchulG Bln", category: "education",
    fullName: "Schulgesetz für das Land Berlin",
    docId: "jlr-SchulGBE2004rahmen", url: "https://gesetze.berlin.de/bsbe/document/jlr-SchulGBE2004rahmen" },
  { state: "BE", stateName: "Berlin", abbreviation: "GO Bln", category: "local",
    fullName: "Verfassung von Berlin",
    docId: "jlr-VerfBErahmen", url: "https://gesetze.berlin.de/bsbe/document/jlr-VerfBErahmen" },

  // ── Hamburg (HH) ──────────────────────────────────────────────────────────
  { state: "HH", stateName: "Hamburg", abbreviation: "HmbPolDVG", category: "police",
    fullName: "Hamburgisches Polizeidaten-Verarbeitungsgesetz",
    docId: "jlr-PolDVGHArahmen", url: "https://www.landesrecht-hamburg.de/bsha/document/jlr-PolDVGHArahmen" },
  { state: "HH", stateName: "Hamburg", abbreviation: "HBauO", category: "building",
    fullName: "Hamburgische Bauordnung",
    docId: "jlr-BauOHArahmen", url: "https://www.landesrecht-hamburg.de/bsha/document/jlr-BauOHArahmen" },
  { state: "HH", stateName: "Hamburg", abbreviation: "HmbDSG", category: "data",
    fullName: "Hamburgisches Datenschutzgesetz",
    docId: "jlr-DSGHA2018rahmen", url: "https://www.landesrecht-hamburg.de/bsha/document/jlr-DSGHA2018rahmen" },
  { state: "HH", stateName: "Hamburg", abbreviation: "HmbPresseG", category: "press",
    fullName: "Hamburgisches Pressegesetz",
    docId: "jlr-PresseGHArahmen", url: "https://www.landesrecht-hamburg.de/bsha/document/jlr-PresseGHArahmen" },

  // ── Hessen (HE) ───────────────────────────────────────────────────────────
  { state: "HE", stateName: "Hessen", abbreviation: "HSOG", category: "police",
    fullName: "Hessisches Gesetz über die öffentliche Sicherheit und Ordnung",
    docId: "jlr-SOGNHE2018rahmen", url: "https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-SOGNHE2018rahmen" },
  { state: "HE", stateName: "Hessen", abbreviation: "HBO", category: "building",
    fullName: "Hessische Bauordnung",
    docId: "jlr-BauOHE2018rahmen", url: "https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-BauOHE2018rahmen" },
  { state: "HE", stateName: "Hessen", abbreviation: "HDSIG", category: "data",
    fullName: "Hessisches Datenschutz- und Informationsfreiheitsgesetz",
    docId: "jlr-DatSchGHE2018rahmen", url: "https://www.rv.hessenrecht.hessen.de/bshe/document/jlr-DatSchGHE2018rahmen" },

  // ── Baden-Württemberg (BW) ────────────────────────────────────────────────
  { state: "BW", stateName: "Baden-Württemberg", abbreviation: "PolG BW", category: "police",
    fullName: "Polizeigesetz Baden-Württemberg",
    docId: "jlr-PolGBWrahmen", url: "https://www.landesrecht-bw.de/bsbw/document/jlr-PolGBWrahmen" },
  { state: "BW", stateName: "Baden-Württemberg", abbreviation: "LBO BW", category: "building",
    fullName: "Landesbauordnung Baden-Württemberg",
    docId: "jlr-BauOBWrahmen", url: "https://www.landesrecht-bw.de/bsbw/document/jlr-BauOBWrahmen" },
  { state: "BW", stateName: "Baden-Württemberg", abbreviation: "LDSG BW", category: "data",
    fullName: "Landesdatenschutzgesetz Baden-Württemberg",
    docId: "jlr-DSGBW2018rahmen", url: "https://www.landesrecht-bw.de/bsbw/document/jlr-DSGBW2018rahmen" },
  { state: "BW", stateName: "Baden-Württemberg", abbreviation: "GemO BW", category: "local",
    fullName: "Gemeindeordnung Baden-Württemberg",
    docId: "jlr-GemOBWrahmen", url: "https://www.landesrecht-bw.de/bsbw/document/jlr-GemOBWrahmen" },

  // ── Nordrhein-Westfalen (NW) ──────────────────────────────────────────────
  { state: "NW", stateName: "Nordrhein-Westfalen", abbreviation: "PolG NRW", category: "police",
    fullName: "Polizeigesetz des Landes Nordrhein-Westfalen",
    docId: "SGV_NW_205", url: "https://recht.nrw.de/lmi/owa/br_bes_text?anw_nr=2&gld_nr=2&ugl_nr=205&bes_id=3017" },
  { state: "NW", stateName: "Nordrhein-Westfalen", abbreviation: "BauO NRW", category: "building",
    fullName: "Bauordnung für das Land Nordrhein-Westfalen",
    docId: "SGV_NW_232", url: "https://recht.nrw.de/lmi/owa/br_bes_text?anw_nr=2&gld_nr=2&ugl_nr=232&bes_id=53812" },
  { state: "NW", stateName: "Nordrhein-Westfalen", abbreviation: "DSG NRW", category: "data",
    fullName: "Datenschutzgesetz Nordrhein-Westfalen",
    docId: "SGV_NW_20022", url: "https://recht.nrw.de/lmi/owa/br_bes_text?anw_nr=2&gld_nr=2&ugl_nr=20022&bes_id=46663" },
  { state: "NW", stateName: "Nordrhein-Westfalen", abbreviation: "GO NRW", category: "local",
    fullName: "Gemeindeordnung für das Land Nordrhein-Westfalen",
    docId: "SGV_NW_2023", url: "https://recht.nrw.de/lmi/owa/br_bes_text?anw_nr=2&gld_nr=2&ugl_nr=2023&bes_id=3546" },
  { state: "NW", stateName: "Nordrhein-Westfalen", abbreviation: "SchulG NRW", category: "education",
    fullName: "Schulgesetz für das Land Nordrhein-Westfalen",
    docId: "SGV_NW_223", url: "https://recht.nrw.de/lmi/owa/br_bes_text?anw_nr=2&gld_nr=2&ugl_nr=223&bes_id=29106" },

  // ── Niedersachsen (NI) ────────────────────────────────────────────────────
  { state: "NI", stateName: "Niedersachsen", abbreviation: "NPOG", category: "police",
    fullName: "Niedersächsisches Polizei- und Ordnungsbehördengesetz",
    docId: "jlr-POGNI2019rahmen", url: "https://www.landesrecht-ni.de/bsni/document/jlr-POGNI2019rahmen" },
  { state: "NI", stateName: "Niedersachsen", abbreviation: "NBauO", category: "building",
    fullName: "Niedersächsische Bauordnung",
    docId: "jlr-BauONIrahmen", url: "https://www.landesrecht-ni.de/bsni/document/jlr-BauONIrahmen" },
  { state: "NI", stateName: "Niedersachsen", abbreviation: "NDSG", category: "data",
    fullName: "Niedersächsisches Datenschutzgesetz",
    docId: "jlr-DSGNI2018rahmen", url: "https://www.landesrecht-ni.de/bsni/document/jlr-DSGNI2018rahmen" },

  // ── Sachsen (SN) ──────────────────────────────────────────────────────────
  { state: "SN", stateName: "Sachsen", abbreviation: "SächsPolG", category: "police",
    fullName: "Sächsisches Polizeivollzugsdienstgesetz",
    docId: "SaechsPVDG", url: "https://www.revosax.sachsen.de/vorschrift/1714" },
  { state: "SN", stateName: "Sachsen", abbreviation: "SächsBO", category: "building",
    fullName: "Sächsische Bauordnung",
    docId: "SaechsBO", url: "https://www.revosax.sachsen.de/vorschrift/1779" },
  { state: "SN", stateName: "Sachsen", abbreviation: "SächsDSG", category: "data",
    fullName: "Sächsisches Datenschutzdurchführungsgesetz",
    docId: "SaechsDSDG", url: "https://www.revosax.sachsen.de/vorschrift/22511" },
];

// ── 카테고리 한글 레이블 ────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  police: "경찰·공공질서법",
  building: "건축법",
  education: "교육법",
  press: "언론법",
  data: "데이터보호법",
  court: "법원조직법",
  local: "지방자치법",
  environ: "환경법",
  transport: "교통·도로법",
  admin: "행정절차법",
  health: "보건법",
  tax: "세금",
};

// ── Bayern 법령 본문 파싱 ─────────────────────────────────────────────────────

async function fetchBayernSection(docId: string, section?: string): Promise<StateLawSection | null> {
  const url = section
    ? `https://www.gesetze-bayern.de/Content/Document/${docId}-${section}`
    : `https://www.gesetze-bayern.de/Content/Document/${docId}/true`;

  const cacheKey = `bayern:${docId}:${section ?? "full"}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithRetry(url, {
      headers: {
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "de-DE,de;q=0.9",
      },
    }, { timeoutMs: 10_000, source: "gesetze-bayern.de" });
    if (!res.ok) return null;

    const html = await res.text();

    // 타이틀 추출
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const rawTitle = titleMatch ? titleMatch[1].replace(/&[^;]+;/g, " ").trim() : docId;

    // 조문 내용 추출: absatz paranr + absatz paratext 패턴
    const contentParts: string[] = [];

    // paraheading (조문 번호 + 제목)
    const headingMatch = html.match(/<div class="absatz paranr">(.*?)<\/div>.*?<div class="absatz paratitel">(.*?)<\/div>/s);
    let sectionTitle = "";
    if (headingMatch) {
      const nr = headingMatch[1].replace(/<[^>]+>/g, "").trim();
      const tit = headingMatch[2].replace(/<[^>]+>/g, "").trim();
      sectionTitle = `${nr} ${tit}`;
      contentParts.push(sectionTitle);
    }

    // 본문 absatz 항목들
    const absatzMatches = [...html.matchAll(/<div class="absatz paratext">([\s\S]*?)<\/div>/g)];
    for (const m of absatzMatches) {
      const text = m[1]
        .replace(/<sup[^>]*>.*?<\/sup>/g, "")  // 각주번호 제거
        .replace(/<[^>]+>/g, "")               // HTML 태그 제거
        .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
        .replace(/&#x[\da-fA-F]+;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (text) contentParts.push(text);
    }

    const content = contentParts.join("\n\n");
    const lawName = rawTitle.split(":")[0]?.trim() ?? docId;

    const result: StateLawSection = {
      state: "BY",
      stateName: "Bayern",
      law: docId,
      lawName,
      section: section ?? "gesamt",
      title: sectionTitle || lawName,
      content: content || "(Inhalt nicht verfügbar — bitte Portal direkt besuchen)",
      url,
      fetchedAt: new Date().toISOString(),
    };

    cache.set(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ── 공개 함수 ────────────────────────────────────────────────────────────────

/**
 * 주법 검색: 약어·분야·주 코드로 필터링
 */
export function searchStateLaws(opts: {
  query?: string;
  state?: StateCode;
  category?: string;
  limit?: number;
}): StateLawSearchResult {
  const { query, state, category, limit = 20 } = opts;
  const queryLower = query?.toLowerCase() ?? "";

  const results = KNOWN_STATE_LAWS.filter((law) => {
    if (state && law.state !== state) return false;
    if (category && law.category !== category) return false;
    if (queryLower) {
      const haystack = `${law.abbreviation} ${law.fullName} ${law.category}`.toLowerCase();
      return haystack.includes(queryLower);
    }
    return true;
  });

  return {
    query: query ?? "",
    results: results.slice(0, limit),
    totalFound: results.length,
  };
}

/**
 * 주법 조문 조회:
 * - Bayern → 직접 HTML 파싱
 * - 그 외 → URL 안내 + 법령 정보 반환
 */
export async function getStateLawSection(opts: {
  state: StateCode;
  law: string;
  section?: string;
}): Promise<StateLawSection | null> {
  const { state, law, section } = opts;

  // Bayern은 직접 파싱
  if (state === "BY") {
    // docId 조회
    const entry = KNOWN_STATE_LAWS.find(
      (e) => e.state === "BY" && (e.abbreviation.toLowerCase() === law.toLowerCase() || e.docId.toLowerCase() === law.toLowerCase())
    );
    const docId = entry?.docId ?? law;
    return fetchBayernSection(docId, section);
  }

  // 그 외 주: 법령 정보 반환 (URL 안내)
  const entry = KNOWN_STATE_LAWS.find(
    (e) => e.state === state &&
      (e.abbreviation.toLowerCase() === law.toLowerCase() ||
       e.fullName.toLowerCase().includes(law.toLowerCase()))
  );

  if (!entry) return null;

  const sectionNote = section
    ? `§ ${section} 조회를 위해 아래 포털 URL을 직접 방문하세요.`
    : "전체 법령을 보려면 아래 포털 URL을 방문하세요.";

  return {
    state,
    stateName: STATE_NAMES[state],
    law: entry.abbreviation,
    lawName: entry.fullName,
    section: section ?? "gesamt",
    title: entry.fullName,
    content: `[${STATE_NAMES[state]} — ${entry.abbreviation}]\n\n${entry.fullName}\n\n${sectionNote}\n\n분야: ${CATEGORY_LABELS[entry.category] ?? entry.category}`,
    url: entry.url,
    fetchedAt: new Date().toISOString(),
  };
}
