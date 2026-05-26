import type { ContractRulebook } from "./types.js";

export const LICENSE_RULEBOOK: ContractRulebook = {
  contractType: "License",
  version: "0.1.0",
  items: [
    {
      id: "license_scope",
      titleKo: "라이선스 범위",
      titleDe: "Lizenzumfang",
      patternStr: "(license|licence|lizenz|licensed rights|nutzungsrecht|라이선스|이용허락)",
      rules: {
        DE: [{
          norm: "UrhG §§ 31 ff.",
          level: "hoch",
          reason: { ko: "이용권의 종류, 지역, 기간, 독점성, 목적이 불명확하면 사용권 분쟁이 큽니다.", de: "Nutzungsrechte müssen nach Art, Umfang, Gebiet, Dauer und Exklusivität bestimmt sein." },
          suggestion: { ko: "사용목적, 매체, 지역, 기간, 독점/비독점, 양도가능성을 명시하세요.", de: "Nutzungsart, Medium, Gebiet, Dauer, Exklusivität und Übertragbarkeit regeln." },
          citationAnchor: "UrhG §§ 31 ff.",
        }],
        KR: [{
          norm: "저작권법",
          level: "hoch",
          reason: { ko: "이용허락 범위가 불명확하면 허락 범위를 좁게 해석할 위험이 있습니다.", de: "Unklarer Lizenzumfang erhöht Auslegungsrisiken." },
          suggestion: { ko: "복제·배포·공중송신·2차적저작물 작성 등 권리별로 허락 범위를 쓰세요.", de: "Rechtekatalog nach Nutzungshandlungen konkretisieren." },
          citationAnchor: "저작권법",
        }],
      },
    },
    {
      id: "sublicense_assignment",
      titleKo: "재라이선스·양도",
      titleDe: "Sublicense / Assignment",
      patternStr: "(sublicen[cs]e|assign|transfer|unterlizenz|abtretung|재라이선스|재허락|양도)",
      rules: {
        DE: [{
          norm: "UrhG § 34",
          level: "mittel",
          reason: { ko: "재라이선스와 양도 가능성이 불명확하면 그룹사/고객/협력사 사용에 제약이 생깁니다.", de: "Unklare Übertragung und Unterlizenzierung blockiert Nutzung durch Affiliates oder Kunden." },
          suggestion: { ko: "재허락 가능 주체, 조건, 승인권, 양도 제한을 명시하세요.", de: "Unterlizenzberechtigte, Zustimmung, Bedingungen und Assignment regeln." },
          citationAnchor: "UrhG § 34",
        }],
      },
    },
    {
      id: "ownership_reservation",
      titleKo: "권리귀속·유보",
      titleDe: "Ownership / Rechtevorbehalt",
      patternStr: "(ownership|retain all rights|all rights reserved|eigentum|rechte verbleiben|권리귀속|권리 유보)",
      rules: {
        DE: [{
          norm: "BGB § 307 / UrhG",
          level: "mittel",
          reason: { ko: "소유권 유보가 라이선스 범위와 충돌하면 계약 목적 달성이 어려울 수 있습니다.", de: "Rechtevorbehalte dürfen den vertraglichen Lizenzzweck nicht unterlaufen." },
          suggestion: { ko: "선재 IP, 개선물, 피드백, 파생물 권리를 분리하세요.", de: "Background IP, Verbesserungen, Feedback und Derivate trennen." },
          citationAnchor: "BGB § 307; UrhG",
        }],
      },
    },
    {
      id: "open_source",
      titleKo: "오픈소스/제3자 구성요소",
      titleDe: "Open Source / Drittkomponenten",
      patternStr: "(open source|oss|third[-\\s]?party component|copyleft|gpl|mit license|오픈소스|제3자 구성요소)",
      rules: {
        DE: [{
          norm: "UrhG / BGB § 307",
          level: "hoch",
          reason: { ko: "오픈소스 고지·라이선스 준수·copyleft 영향이 빠지면 배포 리스크가 큽니다.", de: "OSS-Pflichten und Copyleft-Risiken müssen transparent allokiert werden." },
          suggestion: { ko: "OSS 목록, 고지의무, 금지 라이선스, 침해 면책, 업데이트 절차를 두세요.", de: "OSS-Inventar, Notice, verbotene Lizenzen, Freistellung und Updateprozess aufnehmen." },
          citationAnchor: "UrhG",
        }],
      },
    },
    {
      id: "royalty_audit",
      titleKo: "로열티·감사",
      titleDe: "Royalty / Audit",
      patternStr: "(royalt|audit|reporting|minimum guarantee|license fee|로열티|감사|정산|보고)",
      rules: {
        DE: [{
          norm: "BGB § 242 / § 307",
          level: "mittel",
          reason: { ko: "로열티 산정식과 감사권이 불명확하면 정산 분쟁이 납니다.", de: "Unklare Royalty-Formeln und Audit-Rechte erzeugen Abrechnungsstreit." },
          suggestion: { ko: "순매출 정의, 공제항목, 보고주기, 감사범위, 과소지급 비용부담을 정하세요.", de: "Net Revenue, Abzüge, Reporting, Auditumfang und Kostenfolge definieren." },
          citationAnchor: "BGB §§ 242, 307",
        }],
      },
    },
  ],
};

