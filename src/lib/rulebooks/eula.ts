import type { ContractRulebook } from "./types.js";

export const EULA_RULEBOOK: ContractRulebook = {
  contractType: "EULA",
  version: "0.1.0",
  items: [
    {
      id: "consumer_agb_control",
      titleKo: "소비자 약관 통제",
      titleDe: "AGB-/Consumer-Kontrolle",
      patternStr: "(end user|eula|consumer|verbraucher|terms of use|최종사용자|소비자|이용약관)",
      rules: {
        DE: [{
          norm: "BGB §§ 305 ff., §§ 307-309",
          level: "hoch",
          reason: { ko: "EULA는 약관으로 쓰이는 경우가 많아 독일 AGB 통제 리스크가 큽니다.", de: "EULAs sind regelmäßig AGB und unterliegen Transparenz- und Inhaltskontrolle." },
          suggestion: { ko: "책임제한, 해지, 변경권, 보증배제를 소비자/사업자별로 분리하세요.", de: "Haftung, Kündigung, Änderungsrechte und Gewährleistung nach B2C/B2B trennen." },
          citationAnchor: "BGB §§ 305 ff., 307-309",
        }],
        EU: [{
          norm: "Directive 93/13/EEC / consumer acquis",
          level: "mittel",
          reason: { ko: "EU 소비자 약관 불공정성 기준이 문제될 수 있습니다.", de: "EU-Verbraucherrecht kann unfair terms kontrollieren." },
          suggestion: { ko: "소비자용 조항은 투명성, 철회/해지, 책임제한 예외를 재검토하세요.", de: "Consumer Terms transparent und ausgewogen gestalten." },
          citationAnchor: "Directive 93/13/EEC",
        }],
      },
    },
    {
      id: "license_restrictions",
      titleKo: "사용 제한",
      titleDe: "Nutzungsbeschränkungen",
      patternStr: "(reverse engineer|decompile|benchmark|transfer|concurrent users|seat|역공학|디컴파일|사용자 수|양도금지)",
      rules: {
        DE: [{
          norm: "UrhG §§ 69a ff.",
          level: "mittel",
          reason: { ko: "소프트웨어 사용 제한은 저작권법상 허용행위와 충돌할 수 있습니다.", de: "Software-Nutzungsbeschränkungen können mit zwingenden Schranken kollidieren." },
          suggestion: { ko: "역공학/백업/상호운용성 예외와 허용 사용자 범위를 균형 있게 쓰세요.", de: "Interoperabilität, Backup und zulässige Nutzer klar und gesetzeskonform regeln." },
          citationAnchor: "UrhG §§ 69a ff.",
        }],
      },
    },
    {
      id: "updates_changes",
      titleKo: "업데이트·일방 변경",
      titleDe: "Updates / einseitige Änderungen",
      patternStr: "(update|upgrade|modify terms|change terms|jederzeit ändern|업데이트|약관 변경|일방 변경)",
      rules: {
        DE: [{
          norm: "BGB § 307",
          level: "mittel",
          reason: { ko: "일방 변경권은 사유·통지·거절권/해지권 없으면 불공정 리스크가 있습니다.", de: "Einseitige Änderungsrechte brauchen Anlass, Notice und Ausweichrechte." },
          suggestion: { ko: "보안 업데이트와 기능 변경을 나누고, 중대한 변경에는 사전통지/해지권을 두세요.", de: "Security Updates von Funktionsänderungen trennen; Notice und Kündigung vorsehen." },
          citationAnchor: "BGB § 307",
        }],
      },
    },
    {
      id: "warranty_liability",
      titleKo: "보증·책임제한",
      titleDe: "Gewährleistung / Haftung",
      patternStr: "(as is|no warranty|exclude liability|limitation of liability|keine gewährleistung|책임 제한|보증 배제)",
      rules: {
        DE: [{
          norm: "BGB §§ 307-309",
          level: "hoch",
          reason: { ko: "포괄적 보증·책임 배제는 특히 소비자 및 신체손해/고의·중과실에서 위험합니다.", de: "Pauschale Haftungs- und Gewährleistungsausschlüsse sind besonders kontrollbedürftig." },
          suggestion: { ko: "고의·중과실, 생명·신체·건강 손해, 강행책임 예외를 명시하세요.", de: "Vorsatz, grobe Fahrlässigkeit, Körper-/Gesundheitsschäden und zwingende Haftung ausnehmen." },
          citationAnchor: "BGB §§ 307-309",
        }],
      },
    },
    {
      id: "data_telemetry",
      titleKo: "데이터·텔레메트리",
      titleDe: "Daten / Telemetrie",
      patternStr: "(telemetry|analytics|personal data|usage data|tracking|개인정보|사용데이터|분석데이터|추적)",
      rules: {
        EU: [{
          norm: "GDPR Art. 5, 6, 13, 28",
          level: "hoch",
          reason: { ko: "EULA의 데이터 수집 조항은 GDPR 법적근거/고지/DPA 필요성과 연결됩니다.", de: "Datenklauseln in EULAs müssen Rechtsgrundlage, Transparenz und ggf. AVV abdecken." },
          suggestion: { ko: "필수/선택 데이터, 법적근거, 목적, 보관기간, 처리자 관계를 분리하세요.", de: "Pflicht-/Optionale Daten, Rechtsgrundlage, Zweck, Retention und Processor-Rollen trennen." },
          citationAnchor: "CELEX:32016R0679 Art. 5, 6, 13, 28",
        }],
        KR: [{
          norm: "개인정보보호법",
          level: "hoch",
          reason: { ko: "사용데이터가 개인정보면 고지·동의·위탁·국외이전 쟁점이 생깁니다.", de: "Nutzungsdaten können koreanische Datenschutzpflichten auslösen." },
          suggestion: { ko: "개인정보 처리방침/DPA/국외이전 동의와 EULA를 일관되게 맞추세요.", de: "Privacy Notice, DPA und Auslandstransfer mit der EULA abstimmen." },
          citationAnchor: "개인정보보호법",
        }],
      },
    },
  ],
};

