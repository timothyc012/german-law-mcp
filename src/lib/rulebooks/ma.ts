import type { ContractRulebook } from "./types.js";

export const MA_RULEBOOK: ContractRulebook = {
  contractType: "MA",
  version: "0.1.0",
  items: [
    {
      id: "transaction_structure",
      titleKo: "거래구조",
      titleDe: "Transaktionsstruktur",
      patternStr: "(share purchase|asset purchase|merger|spa\\b|apa\\b|closing|인수합병|주식양수도|영업양수도|합병)",
      rules: {
        DE: [{
          norm: "BGB / HGB / AktG / GmbHG",
          level: "mittel",
          reason: { ko: "주식/자산/합병 구조에 따라 승계, 책임, 승인, 등기 요건이 달라집니다.", de: "Share Deal, Asset Deal und Merger haben unterschiedliche Haftungs- und Vollzugsfolgen." },
          suggestion: { ko: "거래대상, 이전방식, 승인, 등기, 제3자 동의, 세무효과를 구조표로 분리하세요.", de: "Target, Transfer Mechanik, Approvals, Register, Consents und Tax gesondert strukturieren." },
          citationAnchor: "BGB / HGB / AktG / GmbHG",
        }],
        KR: [{
          norm: "상법 / 자본시장법",
          level: "mittel",
          reason: { ko: "한국 회사법상 주주총회, 이사회, 공시/신고, 반대주주권 등이 문제될 수 있습니다.", de: "Korean corporate approvals and disclosure rules may be triggered." },
          suggestion: { ko: "회사형태, 승인기관, 공시/신고, 주식매수청구권 여부를 확인하세요.", de: "Entity type, approvals, filings and appraisal rights check." },
          citationAnchor: "상법 / 자본시장법",
        }],
      },
    },
    {
      id: "conditions_precedent",
      titleKo: "선행조건",
      titleDe: "Conditions Precedent",
      patternStr: "(condition precedent|cp|closing condition|regulatory approval|consent|선행조건|인허가|동의)",
      rules: {
        DE: [{
          norm: "BGB § 158 / regulatory approvals",
          level: "hoch",
          reason: { ko: "선행조건과 불충족 효과가 불명확하면 closing 분쟁이 큽니다.", de: "Unklare CPs führen zu Closing- und Rücktrittsstreit." },
          suggestion: { ko: "각 CP의 책임자, 기한, waiver, long-stop date, 미충족 효과를 명시하세요.", de: "Owner, Frist, Waiver, Long-stop und Rechtsfolge je CP regeln." },
          citationAnchor: "BGB § 158",
        }],
      },
    },
    {
      id: "reps_warranties",
      titleKo: "진술·보장",
      titleDe: "Representations & Warranties",
      patternStr: "(representation|warrant|garantie|zusicherung|disclosure schedule|진술|보장|공시목록)",
      rules: {
        DE: [{
          norm: "BGB §§ 280, 311, 444",
          level: "hoch",
          reason: { ko: "보장 범위, 지식한정, 공시예외, 구제수단이 M&A 핵심 리스크입니다.", de: "Garantien, Knowledge Qualifier, Disclosure und Remedies sind zentrale M&A-Risiken." },
          suggestion: { ko: "기본보장/사업보장, 지식한정, 공시목록, 보장위반 구제를 분리하세요.", de: "Fundamental/Business Warranties, Knowledge, Disclosure und Remedies trennen." },
          citationAnchor: "BGB §§ 280, 311, 444",
        }],
      },
    },
    {
      id: "indemnity_limitations",
      titleKo: "면책·책임제한",
      titleDe: "Indemnity / Haftungsbegrenzung",
      patternStr: "(indemnif|liability cap|basket|de minimis|survival|freistellung|haftungshöchst|면책|책임한도|존속기간)",
      rules: {
        DE: [{
          norm: "BGB §§ 276, 307, 444",
          level: "hoch",
          reason: { ko: "책임한도·basket·존속기간이 보장체계와 맞지 않으면 회수 가능성이 약합니다.", de: "Caps, Basket und Survival müssen zum Garantie- und Freistellungssystem passen." },
          suggestion: { ko: "fundamental warranty, 세금/환경/노동 면책, 사기·고의 예외를 별도 처리하세요.", de: "Fundamental Warranties, Tax/Environment/Labor Indemnities und Fraud carve-outs trennen." },
          citationAnchor: "BGB §§ 276, 307, 444",
        }],
      },
    },
    {
      id: "competition_regulatory",
      titleKo: "경쟁법·규제 승인",
      titleDe: "Fusionskontrolle / Regulatory",
      patternStr: "(merger control|antitrust|competition|fusionskontrolle|foreign investment|fdi|regulatory approval|기업결합|공정거래|외국인투자)",
      rules: {
        DE: [{
          norm: "GWB / EU Merger Regulation",
          level: "hoch",
          reason: { ko: "기업결합 신고나 FDI 승인 누락은 closing 금지/제재 리스크가 큽니다.", de: "Merger-control oder FDI-Fehler können Closing-Verbot und Sanktionen auslösen." },
          suggestion: { ko: "매출 기준, gun-jumping, hell-or-high-water, 승인 전 행위제한을 검토하세요.", de: "Schwellen, Gun Jumping, HoHW und pre-closing covenants prüfen." },
          citationAnchor: "GWB; Regulation (EC) No 139/2004",
        }],
        KR: [{
          norm: "공정거래법",
          level: "hoch",
          reason: { ko: "기업결합 신고 대상이면 closing 전 신고/승인이 문제됩니다.", de: "Korean merger filings may be required before closing." },
          suggestion: { ko: "기업결합 신고대상, 시기, 행위제한, 승인조건을 확인하세요.", de: "Filing trigger, timing and conduct restrictions check." },
          citationAnchor: "공정거래법",
        }],
      },
    },
  ],
};

