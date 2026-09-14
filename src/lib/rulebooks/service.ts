import type { ContractRulebook } from "./types.js";

export const SERVICE_RULEBOOK: ContractRulebook = {
  contractType: "Service",
  version: "0.1.0",
  items: [
    {
      id: "contract_type_boundary",
      titleKo: "용역/도급/위임 경계",
      titleDe: "Dienst-/Werk-/Auftragsgrenze",
      patternStr: "(service|dienstleistung|werkvertrag|statement of work|deliverable|용역|도급|위임|성과물)",
      rules: {
        DE: [{
          norm: "BGB §§ 611, 631",
          level: "mittel",
          reason: { ko: "독일법상 단순 용역(Dienst)인지 결과물 도급(Werk)인지에 따라 보수, 하자, 검수 구조가 달라집니다.", de: "Dienst- und Werkvertrag lösen unterschiedliche Vergütungs-, Abnahme- und Gewährleistungsfolgen aus." },
          suggestion: { ko: "성과보장 여부, 검수, 하자보수, 투입시간형인지 결과물형인지 분리하세요.", de: "Erfolgspflicht, Abnahme, Mängelrechte und Zeit-/Ergebnisvergütung trennen." },
          citationAnchor: "BGB §§ 611, 631",
        }],
        KR: [{
          norm: "민법 제664조 / 제680조",
          level: "mittel",
          reason: { ko: "한국 민법상 도급/위임 구별에 따라 완성책임과 선관주의 의무가 달라집니다.", de: "Nach koreanischem Zivilrecht unterscheiden sich Werk- und Mandats-/Auftragsrisiken." },
          suggestion: { ko: "완성 의무인지 사무처리 의무인지 계약 본문에서 명확히 하세요.", de: "Erfolgspflicht versus Geschäftsbesorgungspflicht ausdrücklich regeln." },
          citationAnchor: "민법 제664조, 제680조",
        }],
      },
    },
    {
      id: "scope_change_control",
      titleKo: "범위·변경관리",
      titleDe: "Leistungsumfang und Change Control",
      patternStr: "(scope|change request|change control|out of scope|leistungsumfang|änderungs|범위|변경요청|추가업무)",
      rules: {
        DE: [{
          norm: "BGB §§ 631, 650b",
          level: "mittel",
          reason: { ko: "범위와 변경절차가 약하면 추가비용/납기 분쟁이 커집니다.", de: "Unklare Leistungs- und Änderungsprozesse erzeugen Vergütungs- und Terminrisiken." },
          suggestion: { ko: "변경요청 승인권자, 비용산정, 일정영향, 서면승인 요건을 두세요.", de: "Change Request, Preis-/Terminfolge und Freigabeprozess aufnehmen." },
          citationAnchor: "BGB § 631; § 650b if construction-related",
        }],
      },
    },
    {
      id: "acceptance_payment",
      titleKo: "검수·지급",
      titleDe: "Abnahme und Zahlung",
      patternStr: "(acceptance|abnahme|milestone|invoice|payment|검수|인수|마일스톤|대금|지급)",
      rules: {
        DE: [{
          norm: "BGB §§ 640, 641",
          level: "hoch",
          reason: { ko: "도급형이면 검수와 보수지급 시점이 핵심입니다. 누락 시 대금/하자 분쟁이 큽니다.", de: "Bei Werkverträgen sind Abnahme und Fälligkeit zentrale Risikopunkte." },
          suggestion: { ko: "검수 기준, 간주검수, 보완기간, 지급 마일스톤, 이의제기 기간을 명시하세요.", de: "Abnahmekriterien, fiktive Abnahme, Nachbesserung und Zahlungsmeilensteine regeln." },
          citationAnchor: "BGB §§ 640, 641",
        }],
        KR: [{
          norm: "민법 제665조 이하",
          level: "mittel",
          reason: { ko: "완성·검수·하자담보 구조가 없으면 도급 분쟁에서 불리합니다.", de: "Fertigstellung, Abnahme und Mängelrechte sollten im Werkvertrag klar sein." },
          suggestion: { ko: "완성 기준과 하자보수 절차를 별도 조항화하세요.", de: "Fertigstellungskriterien und Mängelbehebung gesondert regeln." },
          citationAnchor: "민법 제665조 이하",
        }],
      },
    },
    {
      id: "service_level",
      titleKo: "서비스수준/SLA",
      titleDe: "Service Level / SLA",
      patternStr: "(sla|service level|uptime|availability|response time|wartung|가용성|응답시간|서비스수준)",
      rules: {
        DE: [{
          norm: "BGB § 307",
          level: "mittel",
          reason: { ko: "SLA가 있어도 측정방식·제외사유·구제수단이 없으면 실효성이 낮습니다.", de: "SLA ohne Messmethode, Exclusions und Remedies sind streitanfällig." },
          suggestion: { ko: "측정기간, 제외 downtime, service credit, 중대한 반복위반 해지를 명시하세요.", de: "Messperiode, Exclusions, Service Credits und Kündigungsrechte bei Wiederholung regeln." },
          citationAnchor: "BGB § 307",
        }],
      },
    },
    {
      id: "ip_deliverables",
      titleKo: "성과물 권리귀속",
      titleDe: "IP an Deliverables",
      patternStr: "(intellectual property|ip rights|copyright|urheberrecht|work product|deliverable|저작권|지식재산|성과물)",
      rules: {
        DE: [{
          norm: "UrhG §§ 31 ff.",
          level: "hoch",
          reason: { ko: "성과물 사용권 범위가 없으면 납품 후 사용/수정/재사용 분쟁이 발생합니다.", de: "Nutzungsrechte an Arbeitsergebnissen müssen in Umfang und Zweck bestimmt sein." },
          suggestion: { ko: "양도/라이선스, 지역, 기간, 수정권, 오픈소스, 선재자료를 분리하세요.", de: "Nutzungsart, Dauer, Gebiet, Bearbeitung, OSS und Background IP trennen." },
          citationAnchor: "UrhG §§ 31 ff.",
        }],
        KR: [{
          norm: "저작권법",
          level: "hoch",
          reason: { ko: "한국 저작권도 권리 이전/이용허락 범위를 명확히 해야 합니다.", de: "Auch nach koreanischem Urheberrecht muss der Rechteumfang klar sein." },
          suggestion: { ko: "저작재산권 귀속, 2차적저작물 작성권, 오픈소스 책임을 명시하세요.", de: "Vermögensrechte, Bearbeitungsrechte und OSS-Verantwortung regeln." },
          citationAnchor: "저작권법",
        }],
      },
    },
  ],
};

