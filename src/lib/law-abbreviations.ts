/**
 * 독일 법률 약어 → Gesetze im Internet (GII) slug 매핑
 *
 * GII URL 패턴: https://www.gesetze-im-internet.de/{slug}/__{section}.html
 * slug는 GII가 내부적으로 사용하는 URL 경로명이며, 약어와 다를 수 있다.
 */

export interface LawInfo {
  slug: string;
  name: string;
  /** § (대부분) 또는 Art. (Grundgesetz 등) */
  sectionPrefix: "§" | "Art.";
}

export const LAW_MAP: Record<string, LawInfo> = {
  // ── 민법 / 상법 ──
  "BGB": { slug: "bgb", name: "Bürgerliches Gesetzbuch", sectionPrefix: "§" },
  "HGB": { slug: "hgb", name: "Handelsgesetzbuch", sectionPrefix: "§" },
  "ZPO": { slug: "zpo", name: "Zivilprozessordnung", sectionPrefix: "§" },
  "FamFG": { slug: "famfg", name: "Gesetz über das Verfahren in Familiensachen und in den Angelegenheiten der freiwilligen Gerichtsbarkeit", sectionPrefix: "§" },
  "InsO": { slug: "inso", name: "Insolvenzordnung", sectionPrefix: "§" },
  "BeurkG": { slug: "beurkg", name: "Beurkundungsgesetz", sectionPrefix: "§" },
  "GVG": { slug: "gvg", name: "Gerichtsverfassungsgesetz", sectionPrefix: "§" },
  "EGBGB": { slug: "bgbeg", name: "Einführungsgesetz zum Bürgerlichen Gesetzbuche", sectionPrefix: "Art." },

  // ── 형법 ──
  "StGB": { slug: "stgb", name: "Strafgesetzbuch", sectionPrefix: "§" },
  "StPO": { slug: "stpo", name: "Strafprozessordnung", sectionPrefix: "§" },
  "OWiG": { slug: "owig_1968", name: "Gesetz über Ordnungswidrigkeiten", sectionPrefix: "§" },
  "JGG": { slug: "jgg", name: "Jugendgerichtsgesetz", sectionPrefix: "§" },

  // ── 헌법 / 공법 ──
  "GG": { slug: "gg", name: "Grundgesetz für die Bundesrepublik Deutschland", sectionPrefix: "Art." },
  "VwVfG": { slug: "vwvfg", name: "Verwaltungsverfahrensgesetz", sectionPrefix: "§" },
  "VwGO": { slug: "vwgo", name: "Verwaltungsgerichtsordnung", sectionPrefix: "§" },
  "BVerfGG": { slug: "bverfgg", name: "Bundesverfassungsgerichtsgesetz", sectionPrefix: "§" },
  "PolG": { slug: "bgsg_1994", name: "Bundespolizeigesetz", sectionPrefix: "§" },
  "AufenthG": { slug: "aufenthg_2004", name: "Aufenthaltsgesetz", sectionPrefix: "§" },
  "StAG": { slug: "stag", name: "Staatsangehörigkeitsgesetz", sectionPrefix: "§" },

  // ── 세법 / 재정 ──
  "AO": { slug: "ao_1977", name: "Abgabenordnung", sectionPrefix: "§" },
  "EStG": { slug: "estg", name: "Einkommensteuergesetz", sectionPrefix: "§" },
  "UStG": { slug: "ustg_1980", name: "Umsatzsteuergesetz", sectionPrefix: "§" },
  "KStG": { slug: "kstg_1977", name: "Körperschaftsteuergesetz", sectionPrefix: "§" },
  "GewStG": { slug: "gewstg", name: "Gewerbesteuergesetz", sectionPrefix: "§" },
  "FGO": { slug: "fgo", name: "Finanzgerichtsordnung", sectionPrefix: "§" },

  // ── 노동법 ──
  "KSchG": { slug: "kschg", name: "Kündigungsschutzgesetz", sectionPrefix: "§" },
  "BUrlG": { slug: "burlg", name: "Bundesurlaubsgesetz", sectionPrefix: "§" },
  "BetrVG": { slug: "betrvg", name: "Betriebsverfassungsgesetz", sectionPrefix: "§" },
  "ArbZG": { slug: "arbzg", name: "Arbeitszeitgesetz", sectionPrefix: "§" },
  "TzBfG": { slug: "tzbfg", name: "Teilzeit- und Befristungsgesetz", sectionPrefix: "§" },
  "MuSchG": { slug: "muschg_2018", name: "Mutterschutzgesetz", sectionPrefix: "§" },
  "AGG": { slug: "agg", name: "Allgemeines Gleichbehandlungsgesetz", sectionPrefix: "§" },
  "ArbGG": { slug: "arbgg", name: "Arbeitsgerichtsgesetz", sectionPrefix: "§" },

  // ── 사회법 ──
  "SGB I": { slug: "sgb_1", name: "Sozialgesetzbuch Erstes Buch — Allgemeiner Teil", sectionPrefix: "§" },
  "SGB II": { slug: "sgb_2", name: "Sozialgesetzbuch Zweites Buch — Grundsicherung für Arbeitsuchende", sectionPrefix: "§" },
  "SGB III": { slug: "sgb_3", name: "Sozialgesetzbuch Drittes Buch — Arbeitsförderung", sectionPrefix: "§" },
  "SGB IV": { slug: "sgb_4", name: "Sozialgesetzbuch Viertes Buch — Gemeinsame Vorschriften", sectionPrefix: "§" },
  "SGB V": { slug: "sgb_5", name: "Sozialgesetzbuch Fünftes Buch — Gesetzliche Krankenversicherung", sectionPrefix: "§" },
  "SGB VI": { slug: "sgb_6", name: "Sozialgesetzbuch Sechstes Buch — Gesetzliche Rentenversicherung", sectionPrefix: "§" },
  "SGB VII": { slug: "sgb_7", name: "Sozialgesetzbuch Siebtes Buch — Gesetzliche Unfallversicherung", sectionPrefix: "§" },
  "SGB VIII": { slug: "sgb_8", name: "Sozialgesetzbuch Achtes Buch — Kinder- und Jugendhilfe", sectionPrefix: "§" },
  "SGB IX": { slug: "sgb_9_2018", name: "Sozialgesetzbuch Neuntes Buch — Rehabilitation und Teilhabe", sectionPrefix: "§" },
  "SGB X": { slug: "sgb_10", name: "Sozialgesetzbuch Zehntes Buch — Sozialverwaltungsverfahren", sectionPrefix: "§" },
  "SGB XI": { slug: "sgb_11", name: "Sozialgesetzbuch Elftes Buch — Soziale Pflegeversicherung", sectionPrefix: "§" },
  "SGB XII": { slug: "sgb_12", name: "Sozialgesetzbuch Zwölftes Buch — Sozialhilfe", sectionPrefix: "§" },

  // ── IT / 데이터보호 ──
  "BDSG": { slug: "bdsg_2018", name: "Bundesdatenschutzgesetz", sectionPrefix: "§" },
  "TMG": { slug: "tmg", name: "Telemediengesetz", sectionPrefix: "§" },
  "TTDSG": { slug: "ttdsg", name: "Telekommunikation-Telemedien-Datenschutz-Gesetz", sectionPrefix: "§" },
  "TKG": { slug: "tkg_2021", name: "Telekommunikationsgesetz", sectionPrefix: "§" },

  // ── 지적재산 ──
  "UrhG": { slug: "urhg", name: "Urheberrechtsgesetz", sectionPrefix: "§" },
  "PatG": { slug: "patg", name: "Patentgesetz", sectionPrefix: "§" },
  "MarkenG": { slug: "markeng", name: "Markengesetz", sectionPrefix: "§" },
  "DesignG": { slug: "geschmg", name: "Designgesetz", sectionPrefix: "§" },
  "UWG": { slug: "uwg_2004", name: "Gesetz gegen den unlauteren Wettbewerb", sectionPrefix: "§" },
  "GWB": { slug: "gwb", name: "Gesetz gegen Wettbewerbsbeschränkungen", sectionPrefix: "§" },

  // ── 건설 / 환경 ──
  "BauGB": { slug: "bbaug", name: "Baugesetzbuch", sectionPrefix: "§" },
  "BauNVO": { slug: "baunvo", name: "Baunutzungsverordnung", sectionPrefix: "§" },
  "BImSchG": { slug: "bimschg", name: "Bundes-Immissionsschutzgesetz", sectionPrefix: "§" },

  // ── 도로교통 ──
  "StVG": { slug: "stvg", name: "Straßenverkehrsgesetz", sectionPrefix: "§" },
  "StVO": { slug: "stvo_2013", name: "Straßenverkehrs-Ordnung", sectionPrefix: "§" },

  // ── 세법 추가 ──
  "ErbStG": { slug: "erbstg_1974", name: "Erbschaftsteuer- und Schenkungsteuergesetz", sectionPrefix: "§" },
  "GrEStG": { slug: "grestg_1983", name: "Grunderwerbsteuergesetz", sectionPrefix: "§" },
  "BewG": { slug: "bewg", name: "Bewertungsgesetz", sectionPrefix: "§" },
  "SolZG": { slug: "solzg_1995", name: "Solidaritätszuschlaggesetz", sectionPrefix: "§" },
  "LStDV": { slug: "lstdv_1990", name: "Lohnsteuer-Durchführungsverordnung", sectionPrefix: "§" },
  "EStDV": { slug: "estdv_1955", name: "Einkommensteuer-Durchführungsverordnung", sectionPrefix: "§" },

  // ── 기타 ──
  "GmbHG": { slug: "gmbhg", name: "Gesetz betreffend die Gesellschaften mit beschränkter Haftung", sectionPrefix: "§" },
  "AktG": { slug: "aktg", name: "Aktiengesetz", sectionPrefix: "§" },
  "WEG": { slug: "woeigg", name: "Wohnungseigentumsgesetz", sectionPrefix: "§" },
  "MietR": { slug: "bgb", name: "Mietrecht (BGB §§ 535-580a)", sectionPrefix: "§" },
  "VVG": { slug: "vvg_2008", name: "Versicherungsvertragsgesetz", sectionPrefix: "§" },
};

/**
 * 약어로 법률 정보를 찾는다 (대소문자 무시)
 */
export function findLaw(abbreviation: string): LawInfo | undefined {
  const upper = abbreviation.toUpperCase().trim();
  // 정확한 매칭 시도
  if (LAW_MAP[abbreviation]) return LAW_MAP[abbreviation];
  // 대소문자 무시 매칭
  for (const [key, value] of Object.entries(LAW_MAP)) {
    if (key.toUpperCase() === upper) return value;
  }
  return undefined;
}

/**
 * GII 조문 URL을 생성한다
 */
export function buildGiiSectionUrl(slug: string, section: string, prefix: "§" | "Art."): string {
  const base = "https://www.gesetze-im-internet.de";
  const sectionPart = prefix === "Art." ? `art_${section}` : section;
  return `${base}/${slug}/__${sectionPart}.html`;
}
