import type { ContractRulebook } from "./types.js";

export const DPA_RULEBOOK: ContractRulebook = {
  contractType: "DPA",
  version: "0.1.0",
  items: [
    {
      id: "controller_processor_roles",
      titleKo: "관리자/처리자 역할 정의",
      titleDe: "Controller-/Processor-Rollen",
      patternStr: "(controller|processor|verantwortliche|auftragsverarbeiter|관리자|처리자|수탁자|위탁자)",
      rules: {
        EU: [{
          norm: "GDPR Art. 28(3)",
          level: "mittel",
          reason: { ko: "DPA는 처리자 역할과 처리 범위를 계약 또는 법적 행위로 명확히 해야 합니다.", de: "Eine AVV/DPA muss Rollen und Verarbeitung auftragsbezogen klar zuordnen." },
          suggestion: { ko: "controller/processor, 처리 목적, 처리 대상, 개인정보 유형, 정보주체 범주를 명시하세요.", de: "Rollen, Gegenstand, Zweck, Datenarten und Kategorien betroffener Personen ausdrücklich aufnehmen." },
          citationAnchor: "CELEX:32016R0679 Art. 28(3)",
        }],
        KR: [{
          norm: "개인정보보호법 제26조",
          level: "mittel",
          reason: { ko: "개인정보 처리위탁은 업무내용과 수탁자를 포함한 필수 고지/계약 항목이 문제됩니다.", de: "Bei Verarbeitung im Auftrag sind Aufgabeninhalt und Auftragsnehmer transparent zu regeln." },
          suggestion: { ko: "위탁업무, 수탁자, 재위탁, 안전조치, 감독권을 조항화하세요.", de: "Auftragsinhalt, Unterauftragsverarbeitung, Sicherheitsmaßnahmen und Kontrollrechte regeln." },
          citationAnchor: "개인정보보호법 제26조",
        }],
      },
    },
    {
      id: "instructions_only",
      titleKo: "문서화된 지시 범위",
      titleDe: "Verarbeitung nur auf dokumentierte Weisung",
      patternStr: "(instruction|weisung|documented|지시|문서화)",
      rules: {
        EU: [{
          norm: "GDPR Art. 28(3)(a)",
          level: "hoch",
          reason: { ko: "처리자가 문서화된 지시 없이 처리할 수 있으면 Art. 28 핵심 요건이 흔들립니다.", de: "Verarbeitung ohne dokumentierte Weisung unterläuft eine Kernpflicht aus Art. 28." },
          suggestion: { ko: "처리자는 관리자의 문서화된 지시에 따라서만 처리한다고 명시하세요.", de: "Verarbeitung ausschließlich auf dokumentierte Weisung des Controllers zulassen." },
          citationAnchor: "CELEX:32016R0679 Art. 28(3)(a)",
        }],
      },
    },
    {
      id: "subprocessors",
      titleKo: "재처리자/재위탁 승인",
      titleDe: "Subprocessor-Genehmigung",
      patternStr: "(subprocessor|sub-processor|unterauftragsverarbeiter|subcontract|재위탁|재처리자|하위처리자)",
      rules: {
        EU: [{
          norm: "GDPR Art. 28(2), Art. 28(4)",
          level: "hoch",
          reason: { ko: "재처리자 투입에는 사전 특정 또는 일반 서면 승인이 필요하고, 동일한 의무를 흘려보내야 합니다.", de: "Subprocessor benötigen vorherige Genehmigung und gleichwertige Pflichten." },
          suggestion: { ko: "승인 방식, 변경 통지, 이의권, 동일 의무 부과, 처리자 책임을 명시하세요.", de: "Genehmigung, Änderungsnotice, Widerspruchsrecht, Flow-down und Haftung klar regeln." },
          citationAnchor: "CELEX:32016R0679 Art. 28(2), 28(4)",
        }],
        KR: [{
          norm: "개인정보보호법 제26조",
          level: "mittel",
          reason: { ko: "재위탁 통제와 감독권이 약하면 위탁자 책임 리스크가 큽니다.", de: "Unkontrollierte Unterbeauftragung erhöht Verantwortlichkeitsrisiken." },
          suggestion: { ko: "재위탁 사전승인, 수탁자 관리·감독, 재위탁 현황 통지를 두세요.", de: "Vorabgenehmigung und Kontrollrechte für Unteraufträge vorsehen." },
          citationAnchor: "개인정보보호법 제26조",
        }],
      },
    },
    {
      id: "toms_security",
      titleKo: "기술적·관리적 보호조치",
      titleDe: "TOMs / Sicherheit",
      patternStr: "(technical and organisational|technical and organizational|tom[s]?|security measures|encryption|pseudonym|보호조치|암호화|접근통제)",
      rules: {
        EU: [{
          norm: "GDPR Art. 28(3)(c), Art. 32",
          level: "hoch",
          reason: { ko: "보호조치가 추상적이면 보안책임과 감사 가능성이 약해집니다.", de: "Zu abstrakte TOMs schwächen Sicherheits- und Nachweisfähigkeit." },
          suggestion: { ko: "암호화, 접근통제, 로그, 백업, 사고대응, 정기 테스트를 별첨으로 구체화하세요.", de: "TOM-Anlage mit Zugriff, Verschlüsselung, Logging, Backup, Incident Response und Tests ergänzen." },
          citationAnchor: "CELEX:32016R0679 Art. 32",
        }],
        KR: [{
          norm: "개인정보보호법 제29조",
          level: "hoch",
          reason: { ko: "안전조치의무가 불명확하면 침해사고 시 방어가 어렵습니다.", de: "Unklare Sicherheitsmaßnahmen erschweren die Verteidigung bei Vorfällen." },
          suggestion: { ko: "접근권한, 암호화, 접속기록, 보관·파기, 위탁점검 절차를 명시하세요.", de: "Zugriff, Verschlüsselung, Protokolle, Löschung und Prüfprozesse festlegen." },
          citationAnchor: "개인정보보호법 제29조",
        }],
      },
    },
    {
      id: "assistance_audit",
      titleKo: "지원·감사·자료제공",
      titleDe: "Unterstützung, Audit, Nachweise",
      patternStr: "(audit|inspection|assist|support|data subject|감사|점검|지원|정보주체|자료제공)",
      rules: {
        EU: [{
          norm: "GDPR Art. 28(3)(e)-(h)",
          level: "mittel",
          reason: { ko: "정보주체 요청, 보안, 영향평가, 감사 지원이 빠지면 실무상 DPA 기능이 약합니다.", de: "Betroffenenrechte, Sicherheit, DPIA-Unterstützung und Auditnachweise müssen operationalisierbar sein." },
          suggestion: { ko: "지원 SLA, 감사 범위, 자료제공 기한, 비용, 보안 제한을 균형 있게 정하세요.", de: "Support-SLAs, Auditumfang, Nachweisfristen, Kosten und Sicherheitsgrenzen ausbalancieren." },
          citationAnchor: "CELEX:32016R0679 Art. 28(3)(e)-(h)",
        }],
      },
    },
    {
      id: "return_delete",
      titleKo: "반환·삭제",
      titleDe: "Rückgabe / Löschung",
      patternStr: "(return|delete|deletion|erase|lösch|rückgabe|반환|삭제|파기)",
      rules: {
        EU: [{
          norm: "GDPR Art. 28(3)(g)",
          level: "mittel",
          reason: { ko: "계약 종료 시 반환/삭제와 백업 처리 방식이 없으면 잔존 데이터 리스크가 남습니다.", de: "Ohne Rückgabe-/Löschprozess bleiben Restdatenrisiken." },
          suggestion: { ko: "종료 시 선택권, 삭제증명, 백업 보존기간, 법정보존 예외를 명시하세요.", de: "Wahlrecht, Löschbestätigung, Backup-Fristen und gesetzliche Aufbewahrungsausnahmen regeln." },
          citationAnchor: "CELEX:32016R0679 Art. 28(3)(g)",
        }],
      },
    },
  ],
};

