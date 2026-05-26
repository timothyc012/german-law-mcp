import type { ContractRulebook } from "./types.js";

export const EMPLOYMENT_RULEBOOK: ContractRulebook = {
  contractType: "Employment",
  version: "0.1.0",
  items: [
    {
      id: "essential_terms",
      titleKo: "근로조건 명시",
      titleDe: "Wesentliche Arbeitsbedingungen",
      patternStr: "(employment|arbeitsvertrag|employee|arbeitnehmer|근로계약|근로조건|임금|근무지)",
      rules: {
        DE: [{
          norm: "NachwG / BGB § 611a",
          level: "mittel",
          reason: { ko: "근로조건 명시가 부족하면 독일 Nachweisgesetz 및 근로계약 실무상 리스크가 있습니다.", de: "Wesentliche Bedingungen müssen nachvollziehbar dokumentiert sein." },
          suggestion: { ko: "직무, 근무지, 시작일, 보수, 근로시간, 휴가, 해지기간을 명시하세요.", de: "Tätigkeit, Ort, Beginn, Vergütung, Arbeitszeit, Urlaub und Kündigungsfristen aufnehmen." },
          citationAnchor: "NachwG; BGB § 611a",
        }],
        KR: [{
          norm: "근로기준법 제17조",
          level: "hoch",
          reason: { ko: "임금·소정근로시간·휴일·연차 등 명시의무 위반 리스크가 있습니다.", de: "Koreanische Arbeitsbedingungen müssen schriftlich klar sein." },
          suggestion: { ko: "근로조건 서면명시 항목을 별도 표로 정리하세요.", de: "Pflichtangaben als klare Tabelle aufnehmen." },
          citationAnchor: "근로기준법 제17조",
        }],
      },
    },
    {
      id: "probation_termination",
      titleKo: "수습·해지",
      titleDe: "Probezeit / Kündigung",
      patternStr: "(probation|probezeit|termination|kündigung|notice period|수습|해고|해지|통지기간)",
      rules: {
        DE: [{
          norm: "BGB § 622 / KSchG",
          level: "hoch",
          reason: { ko: "해지기간, 수습, 해고보호 적용 여부가 불명확하면 분쟁 위험이 큽니다.", de: "Kündigungsfristen, Probezeit und Kündigungsschutz sind zentrale Streitpunkte." },
          suggestion: { ko: "수습기간, 법정/계약상 해지기간, 중대한 사유 해지, KSchG 유보를 명확히 하세요.", de: "Probezeit, gesetzliche und vertragliche Fristen sowie außerordentliche Kündigung sauber regeln." },
          citationAnchor: "BGB § 622; KSchG",
        }],
        KR: [{
          norm: "근로기준법 제23조, 제26조",
          level: "hoch",
          reason: { ko: "정당한 이유 없는 해고 및 해고예고 위반 위험이 있습니다.", de: "Kündigung braucht sachlichen Grund und ggf. Notice." },
          suggestion: { ko: "해고 사유, 절차, 예고/예고수당, 수습평가 기준을 분리하세요.", de: "Kündigungsgründe, Verfahren und Notice klar regeln." },
          citationAnchor: "근로기준법 제23조, 제26조",
        }],
      },
    },
    {
      id: "working_time_overtime",
      titleKo: "근로시간·초과근로",
      titleDe: "Arbeitszeit / Überstunden",
      patternStr: "(working time|overtime|überstunden|arbeitszeit|mehrarbeit|근로시간|초과근로|연장근로)",
      rules: {
        DE: [{
          norm: "ArbZG / BGB § 307",
          level: "mittel",
          reason: { ko: "포괄적 초과근로 포함 조항은 투명성 문제가 됩니다.", de: "Pauschale Überstundenklauseln sind transparenz- und kontrollbedürftig." },
          suggestion: { ko: "초과근로 승인, 보상, 최대시간, 기록의무를 명확히 하세요.", de: "Anordnung, Vergütung/Freizeitausgleich, Höchstzeiten und Zeiterfassung regeln." },
          citationAnchor: "ArbZG; BGB § 307",
        }],
        KR: [{
          norm: "근로기준법 제50조, 제56조",
          level: "hoch",
          reason: { ko: "연장·야간·휴일근로와 가산수당 누락은 고위험입니다.", de: "Overtime and premium pay require clear treatment." },
          suggestion: { ko: "연장근로 동의, 한도, 가산수당, 포괄임금제 한계를 검토하세요.", de: "Overtime consent, caps and premiums expressly regulate." },
          citationAnchor: "근로기준법 제50조, 제56조",
        }],
      },
    },
    {
      id: "vacation_leave",
      titleKo: "휴가",
      titleDe: "Urlaub / Leave",
      patternStr: "(vacation|leave|urlaub|annual leave|연차|휴가|병가)",
      rules: {
        DE: [{
          norm: "BUrlG",
          level: "mittel",
          reason: { ko: "법정휴가와 추가휴가를 분리하지 않으면 이월/소멸 분쟁이 납니다.", de: "Gesetzlicher und zusätzlicher Urlaub sollten getrennt geregelt werden." },
          suggestion: { ko: "법정/추가휴가, 신청절차, 이월, 퇴직정산을 분리하세요.", de: "Gesetzlichen/zusätzlichen Urlaub, Beantragung, Übertrag und Abgeltung trennen." },
          citationAnchor: "BUrlG",
        }],
        KR: [{
          norm: "근로기준법 제60조",
          level: "mittel",
          reason: { ko: "연차휴가 발생·사용촉진·미사용수당 쟁점이 생깁니다.", de: "Annual leave accrual and payout need clarity." },
          suggestion: { ko: "연차 발생, 사용촉진, 미사용수당 처리 기준을 명시하세요.", de: "Accrual, use encouragement and payout treatment define." },
          citationAnchor: "근로기준법 제60조",
        }],
      },
    },
    {
      id: "non_compete_confidentiality",
      titleKo: "경업금지·비밀유지",
      titleDe: "Wettbewerbsverbot / Geheimhaltung",
      patternStr: "(non-compete|competition|wettbewerbsverbot|confidential|geheimhaltung|경업금지|전직금지|비밀유지)",
      rules: {
        DE: [{
          norm: "HGB §§ 74 ff. / BGB § 138",
          level: "hoch",
          reason: { ko: "퇴직 후 경업금지는 보상·기간·범위 없으면 무효 위험이 큽니다.", de: "Nachvertragliche Wettbewerbsverbote brauchen Karenzentschädigung und enge Grenzen." },
          suggestion: { ko: "기간, 지역, 업무범위, 보상, 고객/직원유인 금지를 별도로 제한하세요.", de: "Dauer, Gebiet, Tätigkeitsbereich, Entschädigung und Kundenschutz eng regeln." },
          citationAnchor: "HGB §§ 74 ff.; BGB § 138",
        }],
        KR: [{
          norm: "근로기준법 / 민법 / 대법원 전직금지 판례",
          level: "hoch",
          reason: { ko: "보상 없는 광범위 전직금지는 직업선택 자유 침해로 무효 위험이 있습니다.", de: "Weite Non-competes ohne Ausgleich sind hochriskant." },
          suggestion: { ko: "합리적 기간·지역·직무·보상과 영업비밀 범위를 좁히세요.", de: "Dauer, Gebiet, Tätigkeit, Kompensation und Secret-Scope beschränken." },
          citationAnchor: "대법원 전직금지 판례",
        }],
      },
    },
  ],
};

