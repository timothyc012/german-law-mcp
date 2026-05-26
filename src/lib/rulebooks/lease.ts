import type { ContractRulebook } from "./types.js";

export const LEASE_RULEBOOK: ContractRulebook = {
  contractType: "Lease",
  version: "0.1.0",
  items: [
    {
      id: "lease_object_rent",
      titleKo: "임대목적물·차임",
      titleDe: "Mietsache und Miete",
      patternStr: "(lease|rent|mietvertrag|mietsache|miete|kaution|임대차|차임|임대목적물|보증금)",
      rules: {
        DE: [{
          norm: "BGB § 535",
          level: "mittel",
          reason: { ko: "임대목적물, 사용범위, 차임이 불명확하면 기본 의무가 흔들립니다.", de: "Mietsache, Nutzungszweck und Miete müssen hinreichend bestimmt sein." },
          suggestion: { ko: "목적물, 면적/설비, 사용목적, 차임·부가비용, 지급일을 명시하세요.", de: "Objekt, Fläche/Ausstattung, Nutzungszweck, Miete/Nebenkosten und Fälligkeit regeln." },
          citationAnchor: "BGB § 535",
        }],
        KR: [{
          norm: "민법 임대차 / 주택임대차보호법",
          level: "mittel",
          reason: { ko: "주택임대차는 대항력·보증금·기간 쟁점이 큽니다.", de: "Koreanische Wohnraummiete hat besondere Schutz- und Deposit-Regeln." },
          suggestion: { ko: "주소, 보증금, 월세, 기간, 인도일, 확정일자/대항력 관련 확인을 분리하세요.", de: "Adresse, Deposit, rent, term and possession-date define." },
          citationAnchor: "주택임대차보호법",
        }],
      },
    },
    {
      id: "deposit_security",
      titleKo: "보증금/담보",
      titleDe: "Kaution / Sicherheit",
      patternStr: "(deposit|security|kaution|mietsicherheit|보증금|담보)",
      rules: {
        DE: [{
          norm: "BGB § 551",
          level: "hoch",
          reason: { ko: "주거임대 보증금 한도와 분할지급 규칙 위반 위험이 있습니다.", de: "Wohnraummietkaution ist gesetzlich begrenzt und zahlungsrechtlich geschützt." },
          suggestion: { ko: "주거임대면 보증금 한도, 분할, 이자/분리보관, 반환기한을 확인하세요.", de: "Kautionshöhe, Ratenzahlung, getrennte Anlage und Rückzahlung regeln." },
          citationAnchor: "BGB § 551",
        }],
        KR: [{
          norm: "주택임대차보호법",
          level: "hoch",
          reason: { ko: "보증금 보호, 우선변제, 반환 시점은 핵심 리스크입니다.", de: "Deposit protection and return are central risks." },
          suggestion: { ko: "보증금 반환, 대항력, 확정일자, 보증보험, 인도와 동시이행을 검토하세요.", de: "Deposit return, perfection and insurance mechanisms check." },
          citationAnchor: "주택임대차보호법",
        }],
      },
    },
    {
      id: "maintenance_repairs",
      titleKo: "수선·유지보수",
      titleDe: "Instandhaltung / Reparaturen",
      patternStr: "(repair|maintenance|instandhaltung|schönheitsreparatur|renovierung|수선|유지보수|원상회복)",
      rules: {
        DE: [{
          norm: "BGB §§ 535, 536; BGB § 307",
          level: "mittel",
          reason: { ko: "수선의무를 임차인에게 과도하게 전가하면 AGB 통제 리스크가 있습니다.", de: "Überwälzung von Reparatur- und Renovierungspflichten ist AGB-kritisch." },
          suggestion: { ko: "소모품/소액수선 한도, 구조적 수선, 하자통지, 임대인 의무를 분리하세요.", de: "Kleinreparaturen, strukturelle Mängel, Notice und Vermieterpflichten trennen." },
          citationAnchor: "BGB §§ 535, 536; § 307",
        }],
      },
    },
    {
      id: "term_termination",
      titleKo: "기간·해지",
      titleDe: "Laufzeit / Kündigung",
      patternStr: "(term|termination|kündigung|befristet|fixed term|해지|계약기간|갱신)",
      rules: {
        DE: [{
          norm: "BGB §§ 542 ff., §§ 573 ff.",
          level: "hoch",
          reason: { ko: "주거임대 해지와 기간제 임대는 강행 보호규정이 많습니다.", de: "Wohnraummietkündigung und Befristung sind stark reguliert." },
          suggestion: { ko: "해지사유, 통지기간, 기간제 사유, 특별해지권을 별도 검토하세요.", de: "Kündigungsgründe, Fristen, Befristungsgrund und Sonderkündigung regeln." },
          citationAnchor: "BGB §§ 542 ff., 573 ff.",
        }],
        KR: [{
          norm: "주택임대차보호법",
          level: "hoch",
          reason: { ko: "계약갱신요구권, 기간, 해지통지가 문제될 수 있습니다.", de: "Renewal rights and notices are key Korean lease risks." },
          suggestion: { ko: "갱신요구, 묵시갱신, 해지통지, 보증금 반환 일정을 확인하세요.", de: "Renewal, tacit renewal, notice and deposit timeline define." },
          citationAnchor: "주택임대차보호법",
        }],
      },
    },
    {
      id: "sublease_use",
      titleKo: "전대·사용목적",
      titleDe: "Untervermietung / Nutzungszweck",
      patternStr: "(sublease|sublet|untervermiet|use only|nutzungszweck|전대|전전세|사용목적)",
      rules: {
        DE: [{
          norm: "BGB §§ 540, 553",
          level: "mittel",
          reason: { ko: "전대와 사용목적 제한은 승인권/거절권을 명확히 해야 합니다.", de: "Untervermietung und Nutzungszweck brauchen klare Zustimmungsvoraussetzungen." },
          suggestion: { ko: "사전승인, 합리적 거절사유, 위반 시 구제수단을 정하세요.", de: "Vorabzustimmung, berechtigte Ablehnungsgründe und Remedies regeln." },
          citationAnchor: "BGB §§ 540, 553",
        }],
      },
    },
  ],
};

