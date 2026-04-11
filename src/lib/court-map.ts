/**
 * 독일 연방법원 코드 정규화
 *
 * 사용자 입력(소문자, 약어)을 NeuRIS API의 court 파라미터 값으로 변환한다.
 * NeuRIS의 court 파라미터는 대소문자를 구분하며 도시명을 포함할 수 있다.
 */

export interface CourtInfo {
  /** NeuRIS API에서 사용하는 court 파라미터 값 */
  neurisId: string;
  /** 법원 전체 이름 (독일어) */
  name: string;
  /** 한국어 설명 */
  nameKo: string;
  /** NeuRIS에 등록된 판례 수 (2026-04-11 기준) */
  caseCount: number;
}

export const COURT_MAP: Record<string, CourtInfo> = {
  "bgh": {
    neurisId: "BGH",
    name: "Bundesgerichtshof",
    nameKo: "연방대법원",
    caseCount: 34023,
  },
  "bfh": {
    neurisId: "BFH",
    name: "Bundesfinanzhof",
    nameKo: "연방재정법원",
    caseCount: 11479,
  },
  "bverwg": {
    neurisId: "BVerwG",
    name: "Bundesverwaltungsgericht",
    nameKo: "연방행정법원",
    caseCount: 10128,
  },
  "bpatg": {
    neurisId: "BPatG München",
    name: "Bundespatentgericht",
    nameKo: "연방특허법원",
    caseCount: 7236,
  },
  "bag": {
    neurisId: "BAG",
    name: "Bundesarbeitsgericht",
    nameKo: "연방노동법원",
    caseCount: 7163,
  },
  "bsg": {
    neurisId: "BSG",
    name: "Bundessozialgericht",
    nameKo: "연방사회법원",
    caseCount: 6316,
  },
  "bverfg": {
    neurisId: "BVerfG",
    name: "Bundesverfassungsgericht",
    nameKo: "연방헌법재판소",
    caseCount: 5579,
  },
};

/** 모든 법원 키 목록 */
export const ALL_COURTS = Object.keys(COURT_MAP);

/**
 * 사용자 입력을 정규화하여 CourtInfo를 반환한다.
 * "bgh", "BGH", "Bundesgerichtshof" 모두 매칭.
 */
export function findCourt(input: string): CourtInfo | undefined {
  const lower = input.toLowerCase().trim();

  // 키로 직접 매칭
  if (COURT_MAP[lower]) return COURT_MAP[lower];

  // neurisId로 매칭
  for (const info of Object.values(COURT_MAP)) {
    if (info.neurisId.toLowerCase() === lower) return info;
  }

  // 이름(독일어)으로 부분 매칭
  for (const info of Object.values(COURT_MAP)) {
    if (info.name.toLowerCase().includes(lower)) return info;
  }

  return undefined;
}
