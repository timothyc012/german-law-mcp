import type { ContractRulebook } from "./types.js";

export const GENERAL_RULEBOOK: ContractRulebook = {
  contractType: "General",
  version: "0.1.0",
  items: [
    {
      id: "parties_authority",
      titleKo: "당사자·권한",
      titleDe: "Parteien und Vertretungsmacht",
      patternStr: "(party|parties|between|represented by|vertreten durch|당사자|대표자|권한)",
      rules: {
        DE: [{
          norm: "BGB §§ 164 ff.",
          level: "mittel",
          reason: { ko: "당사자와 대표권이 불명확하면 체결권한 분쟁이 생깁니다.", de: "Unklare Parteien oder Vertretungsmacht gefährden Abschluss und Durchsetzung." },
          suggestion: { ko: "법인명, 등록번호/주소, 대표권, 서명권한을 확인하세요.", de: "Firma, Registerdaten, Adresse, Vertreter und Signaturbefugnis prüfen." },
          citationAnchor: "BGB §§ 164 ff.",
        }],
      },
    },
    {
      id: "scope_price",
      titleKo: "급부·대금",
      titleDe: "Leistung und Vergütung",
      patternStr: "(scope|deliverable|price|fee|payment|leistung|vergütung|대금|수수료|급부|목적물)",
      rules: {
        DE: [{
          norm: "BGB §§ 241, 311",
          level: "mittel",
          reason: { ko: "급부와 대금이 불명확하면 이행/지급 분쟁이 기본적으로 발생합니다.", de: "Unklare Leistung und Vergütung sind Kernstreitpunkte jedes Vertrags." },
          suggestion: { ko: "급부범위, 제외사항, 지급조건, 세금, 지연이자를 명시하세요.", de: "Scope, Exclusions, Zahlungsbedingungen, Steuern und Verzug regeln." },
          citationAnchor: "BGB §§ 241, 311",
        }],
      },
    },
    {
      id: "term_termination",
      titleKo: "기간·해지",
      titleDe: "Laufzeit und Kündigung",
      patternStr: "(term|termination|kündigung|laufzeit|renewal|해지|기간|갱신)",
      rules: {
        DE: [{
          norm: "BGB § 314",
          level: "mittel",
          reason: { ko: "기간, 갱신, 해지권, 중대한 사유 해지가 없으면 탈출권 분쟁이 납니다.", de: "Laufzeit, Verlängerung und Kündigungsrechte müssen praktisch handhabbar sein." },
          suggestion: { ko: "일반해지, 특별해지, cure period, 종료효과, 생존조항을 정하세요.", de: "Ordentliche/außerordentliche Kündigung, Cure Period, Exit und Survival regeln." },
          citationAnchor: "BGB § 314",
        }],
      },
    },
    {
      id: "liability",
      titleKo: "책임제한",
      titleDe: "Haftung",
      patternStr: "(liability|damages|exclude|cap|haftung|schaden|책임|손해배상|면책)",
      rules: {
        DE: [{
          norm: "BGB §§ 276, 307-309",
          level: "hoch",
          reason: { ko: "포괄적 책임배제는 고의·중과실·신체손해에서 특히 위험합니다.", de: "Pauschale Haftungsbeschränkung ist bei Vorsatz, grober Fahrlässigkeit und Personenschäden riskant." },
          suggestion: { ko: "책임한도, 제외손해, 강행책임 예외, 간접손해를 분리하세요.", de: "Cap, ausgeschlossene Schäden und zwingende Haftungsausnahmen trennen." },
          citationAnchor: "BGB §§ 276, 307-309",
        }],
      },
    },
    {
      id: "law_forum",
      titleKo: "준거법·분쟁해결",
      titleDe: "Rechtswahl / Gerichtsstand",
      patternStr: "(governing law|jurisdiction|venue|arbitration|anwendbares recht|gerichtsstand|준거법|관할|중재)",
      rules: {
        DE: [{
          norm: "Rome I / Brussels Ia / ZPO",
          level: "mittel",
          reason: { ko: "준거법과 관할이 거래 구조와 맞지 않으면 집행·소송비용 리스크가 생깁니다.", de: "Rechtswahl und Forum müssen zur Transaktion und Vollstreckung passen." },
          suggestion: { ko: "준거법, 전속/비전속 관할, 중재지, 언어, 긴급구제를 명시하세요.", de: "Rechtswahl, Forum, Schiedsort, Sprache und Eilrechtsschutz regeln." },
          citationAnchor: "Rome I; Brussels Ia; ZPO",
        }],
        KR: [{
          norm: "국제사법 / 민사소송법",
          level: "mittel",
          reason: { ko: "국제계약이면 준거법·국제재판관할·집행 가능성을 같이 봐야 합니다.", de: "Internationale Zuständigkeit und Durchsetzung sollten geprüft werden." },
          suggestion: { ko: "한국 관련 당사자/이행지/자산 소재에 따른 관할·집행을 확인하세요.", de: "Korea-Bezug, Erfüllungsort und assets for enforcement prüfen." },
          citationAnchor: "국제사법 / 민사소송법",
        }],
      },
    },
  ],
};

