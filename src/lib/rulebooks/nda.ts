/**
 * NDA rulebook — 11 standard checklist items × 3 jurisdictions (DE / EU / KR).
 *
 * Scope: triage screening, not enforceability opinion. Rules cite primary norms
 * (BGB / GeschGehG / Trade Secrets Directive 2016/943 / GDPR / 부정경쟁방지법 / 민법 /
 * 개인정보보호법) so the dispatcher can hand them to verify_citation for grade-A grounding.
 *
 * Asymmetry: rules are written from a neutral standpoint; the review-nda formatter
 * applies receiving-side weighting (MVP scope per architect decision).
 */

import type { ContractRulebook, ChecklistItem } from "./types.js";

const ITEM_DEFINITION: ChecklistItem = {
  id: "definition",
  titleKo: "기밀정보 정의",
  titleDe: "Definition der vertraulichen Informationen",
  patternStr: "(vertrauliche\\s+informationen|confidential\\s+information|geheime\\s+informationen|영업비밀|기밀\\s*정보|비밀\\s*정보)",
  rules: {
    DE: [
      {
        norm: "GeschGehG § 2 Nr. 1",
        level: "hoch",
        triggerWhen: "absent",
        reason: {
          de: "Ohne klare Definition der 'vertraulichen Information' fehlt die Grundlage für 'angemessene Geheimhaltungsmaßnahmen' nach GeschGehG § 2 Nr. 1 lit. b.",
          ko: "기밀정보 정의가 없으면 GeschGehG §2 Nr.1 lit.b의 '적절한 비밀유지 조치' 요건을 입증하기 어렵습니다.",
        },
        suggestion: {
          de: "Vertrauliche Information eng definieren: Form (schriftlich/mündlich), Kennzeichnungspflicht, ausdrückliche Aufzählung von Kategorien.",
          ko: "기밀정보를 좁게 정의하세요 — 형태(서면·구두), 표시의무, 카테고리 명시.",
        },
        citationAnchor: "BJNR046610019",
      },
    ],
    EU: [
      {
        norm: "Trade Secrets Directive (EU) 2016/943, Art. 2(1)",
        level: "mittel",
        triggerWhen: "absent",
        reason: {
          ko: "EU 영업비밀지침 Art.2(1) 3요건(비공지성·경제적 가치·합리적 비밀유지조치) 충족 입증을 위해 정의 조항이 필요합니다.",
        },
        suggestion: {
          ko: "Art.2(1) 세 요건을 그대로 반영하는 정의를 두세요.",
        },
        citationAnchor: "32016L0943",
      },
    ],
    KR: [
      {
        norm: "부정경쟁방지법 §2②",
        level: "hoch",
        triggerWhen: "absent",
        reason: {
          ko: "부정경쟁방지법 §2②의 영업비밀 3요건(비공지성·경제적 유용성·비밀관리성) 중 '비밀관리성'을 약정으로 보강하지 않으면 사후 분쟁 시 입증 부담이 큽니다.",
        },
        suggestion: {
          ko: "정의 조항에 표시·접근통제·교육 등 비밀관리 조치를 명시하세요.",
        },
      },
    ],
  },
};

const ITEM_PURPOSE: ChecklistItem = {
  id: "purpose",
  titleKo: "목적 한정 (Permitted Use)",
  titleDe: "Zweckbindung",
  patternStr: "(zweck|purpose|verwendungszweck|목적|용도)",
  rules: {
    DE: [
      {
        norm: "BGB § 241 Abs. 2",
        level: "hoch",
        triggerWhen: "absent",
        reason: {
          de: "Ohne Zweckbindung kann der Empfänger die Information für beliebige Sekundärzwecke nutzen — die Rücksichtnahmepflicht aus § 241 Abs. 2 BGB greift nur, wenn der Schutzzweck klar ist.",
          ko: "목적 한정 조항이 없으면 수령자가 정보를 임의 용도로 사용 가능 — BGB §241 Abs.2 부수의무는 보호목적이 명확해야 작동.",
        },
        suggestion: {
          de: "Permitted-Purpose-Klausel mit konkretem Geschäftszweck (z.B. 'Evaluation einer möglichen Geschäftsbeziehung X') einfügen.",
          ko: "구체적 사업목적(예: '거래 X 검토')으로 사용 목적을 한정하세요.",
        },
      },
    ],
    KR: [
      {
        norm: "부정경쟁방지법 §9의2②",
        level: "mittel",
        triggerWhen: "absent",
        reason: {
          ko: "목적외 사용 시 영업비밀 침해 입증이 쉬워지지만, 목적 자체가 부재하면 '약정상 사용범위 초과' 주장이 약해집니다.",
        },
        suggestion: {
          ko: "사용 목적을 1-2문장으로 한정하세요.",
        },
      },
    ],
  },
};

const ITEM_DURATION: ChecklistItem = {
  id: "duration",
  titleKo: "기간 및 존속",
  titleDe: "Laufzeit und Nachwirkung",
  patternStr: "(laufzeit|dauer|term\\s+of|duration|기간|존속|years?|jahre|년)",
  rules: {
    DE: [
      {
        norm: "BGB § 138 / GeschGehG § 1 Abs. 3",
        level: "mittel",
        triggerWhen: "present",
        reason: {
          de: "Unbefristete oder sehr lange (>5-10 Jahre) Geheimhaltungsbindungen können nach § 138 BGB sittenwidrig sein, insbesondere wenn sie über die Schutzdauer des GeschGehG hinausgehen.",
          ko: "무기한·과도한 장기(5-10년 초과) NDA는 BGB §138 양속위반 리스크. GeschGehG의 보호기간을 넘어가는 구속은 특히 위험합니다.",
        },
        suggestion: {
          de: "Befristung auf typischerweise 3-5 Jahre; bei Geschäftsgeheimnissen optional 'so lange das Geheimnis besteht', aber mit Beweislast beim Discloser.",
          ko: "일반적으로 3-5년 기한. 영업비밀은 '비공지 상태 동안'으로 두되 입증책임은 공개자에게.",
        },
      },
    ],
    KR: [
      {
        norm: "민법 §103",
        level: "mittel",
        triggerWhen: "present",
        reason: {
          ko: "기간 제한 없는 비밀유지의무는 민법 §103 양속위반 또는 부정경쟁방지법 §9의2② 합리성 한계를 넘을 수 있습니다.",
        },
        suggestion: {
          ko: "3-5년 또는 영업비밀 존속 기간으로 한정. 무기한 금지.",
        },
      },
    ],
  },
};

const ITEM_RETURN_DESTRUCTION: ChecklistItem = {
  id: "return_destruction",
  titleKo: "반환 및 파기 의무",
  titleDe: "Rückgabe und Vernichtung",
  patternStr: "(zurückgeben|rückgabe|vernichten|löschen|return|destroy|delete|반환|폐기|파기)",
  rules: {
    DE: [
      {
        norm: "GeschGehG § 6 / BGB § 667 analog",
        level: "mittel",
        triggerWhen: "absent",
        reason: {
          de: "Ohne explizite Rückgabe-/Vernichtungspflicht ist der Herausgabeanspruch nur über § 667 BGB (Auftragsanalogie) konstruierbar — Beweislast und Reichweite unklar.",
          ko: "명시적 반환·파기 의무가 없으면 BGB §667 위임 유추로만 청구 가능 — 입증·범위 불명확.",
        },
        suggestion: {
          de: "Klausel mit Frist (z.B. 30 Tage nach Vertragsende), Bestätigungspflicht und Ausnahme für Backups/Compliance-Aufbewahrung.",
          ko: "기한(예: 종료 후 30일), 확인서 의무, 백업·컴플라이언스 보관 예외를 둔 조항 추가.",
        },
      },
    ],
  },
};

const ITEM_CARVEOUT: ChecklistItem = {
  id: "carveout",
  titleKo: "Carve-out (예외 사유)",
  titleDe: "Ausnahmen (Carve-out)",
  patternStr: "(allgemein\\s+bekannt|public(ly)?\\s+(known|available)|independently\\s+developed|unabhängig\\s+entwickelt|compelled\\s+disclosure|gerichtliche\\s+anordnung|법적\\s+(강제|의무)|독자\\s+개발|공지|이미\\s+보유)",
  rules: {
    DE: [
      {
        norm: "GeschGehG § 5",
        level: "hoch",
        triggerWhen: "absent",
        reason: {
          de: "Ohne Carve-out (öffentlich bekannt / unabhängig entwickelt / gesetzlich angeordnet / vorbekannt) kollidiert die Geheimhaltung mit GeschGehG § 5 (zulässige Handlungen) und ggf. § 17 GeschGehG (Whistleblower).",
          ko: "Carve-out(공지·독자개발·법적강제·이미보유)가 없으면 GeschGehG §5 허용행위와 충돌하고, §17 내부고발 보호와도 마찰.",
        },
        suggestion: {
          de: "Standard-Carve-out: (a) öffentlich bekannt, (b) vorbekannt, (c) unabhängig entwickelt, (d) gesetzlich/gerichtlich verlangt, (e) Whistleblowing nach HinSchG.",
          ko: "표준 4-5개 예외 사유를 명시: 공지·이미보유·독자개발·법적강제·내부고발 보호.",
        },
      },
    ],
    EU: [
      {
        norm: "Trade Secrets Directive 2016/943, Art. 3, 5",
        level: "hoch",
        triggerWhen: "absent",
        reason: {
          ko: "EU 지침 Art.3·5의 적법취득·표현의 자유·내부고발 예외와 충돌. Carve-out 부재 시 무효 위험.",
        },
        suggestion: {
          ko: "Art.3(적법취득)·Art.5(예외) 사유를 그대로 carve-out 조항에 반영.",
        },
        citationAnchor: "32016L0943",
      },
    ],
    KR: [
      {
        norm: "부정경쟁방지법 §2②, 공익신고자보호법",
        level: "mittel",
        triggerWhen: "absent",
        reason: {
          ko: "공지 정보·독자개발·법적 강제·공익신고는 영업비밀 보호 범위 밖. 명시 예외 없으면 약정 자체의 유효성 다툼 가능.",
        },
        suggestion: {
          ko: "한국 표준 carve-out 4개 + 공익신고자 보호 예외 추가.",
        },
      },
    ],
  },
};

const ITEM_RESIDUAL: ChecklistItem = {
  id: "residual",
  titleKo: "잔여지식 (Residual Knowledge)",
  titleDe: "Restkenntnisse",
  patternStr: "(residual\\s+knowledge|restkenntnisse|behaltene\\s+kenntnisse|잔여\\s*지식|기억\\s*잔존)",
  rules: {
    DE: [
      {
        norm: "GeschGehG § 4 Abs. 3",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          de: "Residual-Klauseln erlauben dem Empfänger, 'in seinem Gedächtnis verbleibende' Informationen frei zu nutzen — das kollidiert mit GeschGehG § 4 Abs. 3 (unrechtmäßige Nutzung erlangter Geheimnisse).",
          ko: "잔여지식 조항은 수령자가 '기억에 남은' 정보를 자유롭게 사용하도록 허용 — GeschGehG §4(3) 위반 우려.",
        },
        suggestion: {
          de: "Residual-Klausel streichen oder sehr eng fassen (z.B. 'allgemeines Know-how, das nicht in spezifischen Memos enthalten ist').",
          ko: "잔여지식 조항을 삭제하거나 매우 좁게 한정.",
        },
      },
    ],
    KR: [
      {
        norm: "부정경쟁방지법 §9의2",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          ko: "잔여지식 조항은 사실상 영업비밀 침해 면책에 가까워 §9의2 침해 책임을 회피 수단으로 악용될 수 있습니다.",
        },
        suggestion: {
          ko: "수령측이 강하게 요구하는 경우에만 인정하되 적용 범위를 구체적으로 좁힐 것.",
        },
      },
    ],
  },
  asymmetry: {
    receiving: {
      weight: -1,
      note: {
        de: "Residual schützt den Empfänger und schwächt den Discloser.",
        ko: "잔여지식 조항은 수령자에게 유리·공개자에게 불리.",
      },
    },
    disclosing: {
      weight: 2,
      note: {
        de: "Aus Discloser-Sicht ist eine Residual-Klausel hochriskant.",
        ko: "공개자 입장에서 잔여지식 조항은 매우 위험.",
      },
    },
  },
};

const ITEM_MUTUALITY: ChecklistItem = {
  id: "mutuality",
  titleKo: "Mutual / Unilateral 구조",
  titleDe: "Gegenseitigkeit",
  rules: {
    DE: [
      {
        norm: "BGB § 307 Abs. 1",
        level: "mittel",
        triggerWhen: { roles: ["receiving"] },
        reason: {
          de: "Einseitige NDA, die nur den Empfänger bindet, kann bei vorformulierter Verwendung gegenüber dem Empfänger unangemessen benachteiligend sein (§ 307 BGB).",
          ko: "수령자만 구속하는 일방 NDA는 사전작성 약관 형태일 때 §307 BGB상 부당불이익 위험.",
        },
        suggestion: {
          de: "Bei kommerzieller Diskussion eher mutual; bei einseitigem Disclosure die Schutzpflichten ausgewogen ausgestalten.",
          ko: "상업적 협의는 상호 NDA, 일방 공개라도 보호의무 균형 유지.",
        },
      },
    ],
  },
  asymmetry: {
    receiving: { weight: 1, note: { ko: "일방 NDA는 수령자에게 불리." } },
  },
};

const ITEM_NON_SOLICIT: ChecklistItem = {
  id: "non_solicit",
  titleKo: "Non-solicit / 경쟁금지 끼워팔기",
  titleDe: "Abwerbeverbot / Wettbewerbsverbot (Red Flag)",
  patternStr: "(abwerb|abwerbung|non[- ]?solicit|non[- ]?compete|wettbewerbsverbot|nicht\\s+anstellen|nicht\\s+einstellen|채용\\s*금지|모집\\s*금지|경쟁\\s*금지|전직\\s*금지)",
  rules: {
    DE: [
      {
        norm: "BGB § 138 / GWB § 1",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          de: "Abwerbeverbote in NDAs sind regelmäßig nach § 138 BGB nichtig, wenn sie über 2 Jahre laufen oder eine Karenzentschädigung fehlt. Wettbewerbsverbote ohne Gegenleistung sind unwirksam.",
          ko: "NDA 안에 끼워 넣은 경쟁금지·채용금지는 2년 초과 또는 보상 미지급 시 BGB §138 무효 — GWB §1과도 충돌.",
        },
        suggestion: {
          de: "Abwerbe-/Wettbewerbsverbote aus dem NDA herausnehmen und gesondert mit Karenzentschädigung regeln.",
          ko: "NDA와 분리해 별도 약정 + 보상 조건으로 처리.",
        },
      },
    ],
    KR: [
      {
        norm: "민법 §103, 헌법 §15 (직업선택의 자유)",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          ko: "전직금지 약정은 대법원 판례(2009다82244 등)상 합리적 보상·기간·지역 제한 없이는 무효. NDA에 끼워 넣으면 본 NDA 효력까지 영향 가능.",
        },
        suggestion: {
          ko: "별도 전직금지 약정으로 분리 + 보상금 명시.",
        },
      },
    ],
  },
};

const ITEM_DATA_PROTECTION: ChecklistItem = {
  id: "data_protection",
  titleKo: "개인정보 / GDPR",
  titleDe: "Personenbezogene Daten / DSGVO",
  patternStr: "(personenbezogene?\\s+daten|personal\\s+data|gdpr|dsgvo|datenschutz|개인정보|민감정보)",
  crossBorderSignal: "gdprDataTransfer",
  rules: {
    EU: [
      {
        norm: "GDPR Art. 28",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          ko: "NDA가 개인정보를 다루면 GDPR Art.28 데이터처리계약(DPA) 요건을 함께 충족해야 하며, NDA만으로는 부족합니다.",
        },
        suggestion: {
          ko: "별도 DPA(Art.28) 첨부 + 국외이전 시 SCC(Art.46) 또는 적정성 결정 근거 명시.",
        },
        citationAnchor: "32016R0679",
      },
    ],
    DE: [
      {
        norm: "BDSG § 26 / Art. 28 DSGVO",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          de: "Werden im NDA-Kontext personenbezogene Daten verarbeitet, ist ein AV-Vertrag nach Art. 28 DSGVO i.V.m. BDSG verpflichtend — der NDA ersetzt ihn nicht.",
          ko: "독일 NDA가 개인정보를 다룰 경우 Art.28 GDPR + BDSG 위탁처리계약 필수 — NDA로 대체 불가.",
        },
        suggestion: {
          de: "AVV beilegen, Verarbeitungszwecke und TOMs spezifizieren.",
          ko: "AV-Vertrag 별도 부속서로 첨부.",
        },
      },
    ],
    KR: [
      {
        norm: "개인정보보호법 §26",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          ko: "개인정보를 수탁자에게 제공하면 개인정보보호법 §26 위탁처리 의무 — 위탁사실 공개, 문서화, 관리·감독 필요.",
        },
        suggestion: {
          ko: "위탁계약 별도 + 위탁사실 개인정보처리방침 공개.",
        },
      },
    ],
  },
};

const ITEM_GOVERNING_LAW: ChecklistItem = {
  id: "governing_law",
  titleKo: "준거법 및 관할",
  titleDe: "Anwendbares Recht und Gerichtsstand",
  patternStr: "(anwendbares?\\s+recht|governing\\s+law|jurisdiction|gerichtsstand|준거법|관할|중재지|arbitration\\s+seat|schiedsort)",
  crossBorderSignal: "foreignGoverningLaw",
  rules: {
    EU: [
      {
        norm: "Rome I Regulation (EC) 593/2008, Art. 3-4",
        level: "mittel",
        triggerWhen: "absent",
        reason: {
          ko: "준거법 조항 부재 시 Rome I Art.4 객관연결로 추정 — 결과 예측 불가능, 분쟁 시 비용 증가.",
        },
        suggestion: {
          ko: "Art.3 명시 선택. EU 외 법 선택 시 Art.9 강행규정(국제적 강행규정) 검토 필요.",
        },
        citationAnchor: "32008R0593",
      },
    ],
    KR: [
      {
        norm: "국제사법 §25",
        level: "mittel",
        triggerWhen: "absent",
        reason: {
          ko: "준거법 미지정 시 국제사법 §25(당사자 선택)·§26(객관연결)로 결정 — 한국 법원 분쟁이면 한국법 적용 가능성 높지만 불확실.",
        },
        suggestion: {
          ko: "당사자 합의로 준거법 명시. 외국법 선택 시 §27 소비자·근로 강행규정 예외 확인.",
        },
      },
    ],
  },
};

const ITEM_REMEDIES: ChecklistItem = {
  id: "remedies",
  titleKo: "구제수단 (가처분·손해배상)",
  titleDe: "Rechtsbehelfe (Unterlassung / Vertragsstrafe)",
  patternStr: "(unterlassung|injunction|vertragsstrafe|liquidated\\s+damages|penalty|위약벌|손해배상액\\s*예정|가처분|금지청구)",
  rules: {
    DE: [
      {
        norm: "AGB § 309 Nr. 6 BGB",
        level: "hoch",
        triggerWhen: "present",
        reason: {
          de: "Pauschalierte Vertragsstrafen in vorformulierten NDAs sind gegenüber Verbrauchern (B2C) regelmäßig unwirksam (§ 309 Nr. 6 BGB); im B2B-Bereich Inhaltskontrolle nach § 307.",
          ko: "사전작성 NDA의 정액 위약벌은 B2C에서 §309 Nr.6 무효 위험, B2B에선 §307 내용통제.",
        },
        suggestion: {
          de: "Vertragsstrafe individualvertraglich aushandeln und am typischen Schaden orientieren; pauschale 'Mindeststrafen' vermeiden.",
          ko: "개별 협상으로 명시 + 전형적 손해 기준. 무차별 '최소 위약벌' 회피.",
        },
      },
      {
        norm: "GeschGehG § 6",
        level: "niedrig",
        triggerWhen: "absent",
        reason: {
          de: "Unterlassungs-/Beseitigungsansprüche ergeben sich bereits aus GeschGehG § 6 — explizite Klausel ist erlaubt, aber nicht zwingend.",
          ko: "금지·제거청구권은 GeschGehG §6에서 도출 가능 — 명시 조항은 보조적.",
        },
        suggestion: {
          de: "Klausel optional, aber Klarstellung zur Eilkompetenz (§ 935 ZPO) sinnvoll.",
          ko: "보전처분 관할 명시는 실효성 측면에서 유용.",
        },
      },
    ],
    KR: [
      {
        norm: "민법 §398 / 부정경쟁방지법 §10",
        level: "mittel",
        triggerWhen: "present",
        reason: {
          ko: "손해배상액 예정은 §398③에 따라 부당히 과다하면 법원이 감액 — 과도한 위약벌 조항은 분쟁 시 무효 위험.",
        },
        suggestion: {
          ko: "예측 가능한 손해 범위로 한정. 가처분 청구권은 부정경쟁방지법 §10으로 충분.",
        },
      },
    ],
  },
};

export const NDA_RULEBOOK: ContractRulebook = {
  contractType: "NDA",
  version: "1.0.0",
  items: [
    ITEM_DEFINITION,
    ITEM_PURPOSE,
    ITEM_DURATION,
    ITEM_RETURN_DESTRUCTION,
    ITEM_CARVEOUT,
    ITEM_RESIDUAL,
    ITEM_MUTUALITY,
    ITEM_NON_SOLICIT,
    ITEM_DATA_PROTECTION,
    ITEM_GOVERNING_LAW,
    ITEM_REMEDIES,
  ],
};
