/**
 * review_contract_clauses — AGB-Kontrolle risk screening.
 *
 * Screens German contract clauses for common risks under BGB §§ 307-309.
 * This is a triage tool, not a final enforceability opinion.
 */

import { z } from "zod";

export const reviewContractClausesSchema = z.object({
  text: z.string().min(10).describe("Zu prüfende Vertrags- oder AGB-Klauseln"),
  context: z.enum(["b2c", "b2b", "unknown"]).default("unknown").describe("Vertragskontext: b2c, b2b oder unknown"),
  language: z.enum(["de", "ko", "both"]).default("both").describe("Ausgabesprache"),
  includeSuggestions: z.boolean().optional().default(true).describe("Ob risikoärmere Formulierungshinweise ausgegeben werden sollen"),
});

export type ReviewContractClausesInput = z.input<typeof reviewContractClausesSchema>;

type RiskLevel = "hoch" | "mittel" | "niedrig";

interface ClauseRisk {
  level: RiskLevel;
  norm: string;
  titleDe: string;
  titleKo: string;
  reasonDe: string;
  reasonKo: string;
  suggestionDe: string;
  suggestionKo: string;
  consumerOnly?: boolean;
  pattern: RegExp;
}

const RISK_RULES: ClauseRisk[] = [
  {
    level: "hoch",
    norm: "§ 309 Nr. 7 BGB",
    titleDe: "Haftungsausschluss für Körper-/Gesundheitsschäden oder grobes Verschulden",
    titleKo: "신체·건강 손해 또는 중과실 책임 배제",
    reasonDe: "AGB dürfen Haftung für Verletzung von Leben, Körper oder Gesundheit sowie grobes Verschulden nicht pauschal ausschließen.",
    reasonKo: "약관으로 생명·신체·건강 침해 또는 중과실 책임을 포괄적으로 배제하는 조항은 특히 위험합니다.",
    suggestionDe: "Haftungsbegrenzungen ausdrücklich ausnehmen für Vorsatz, grobe Fahrlässigkeit sowie Schäden aus Verletzung von Leben, Körper oder Gesundheit.",
    suggestionKo: "고의·중과실 및 생명·신체·건강 침해 손해는 책임제한의 예외로 명시하세요.",
    pattern: /(haftung\s+(?:ist\s+)?(?:ausgeschlossen|beschränkt)|keine\s+haftung|haften\s+nicht).{0,120}(körper|gesundheit|leben|grobe?\s+fahrlässigkeit|vorsatz)/is,
  },
  {
    level: "hoch",
    norm: "§ 309 Nr. 6 BGB",
    titleDe: "Vertragsstrafe in AGB",
    titleKo: "약관상 위약벌/계약벌",
    reasonDe: "Vertragsstrafen in vorformulierten Bedingungen sind gegenüber Verbrauchern regelmäßig unzulässig.",
    reasonKo: "소비자 상대 약관의 계약벌 조항은 BGB § 309 Nr. 6 관점에서 강한 무효 리스크가 있습니다.",
    suggestionDe: "Vertragsstrafe streichen oder als individualvertraglich ausgehandelte, verhältnismäßige Regelung außerhalb der AGB prüfen.",
    suggestionKo: "약관상 계약벌은 삭제하거나 개별 협상 조항으로 별도 검토하세요.",
    consumerOnly: true,
    pattern: /(vertragsstrafe|pauschale\s+strafe|strafe\s+von|penalty)/i,
  },
  {
    level: "hoch",
    norm: "§ 309 Nr. 12 BGB",
    titleDe: "Beweislastverschiebung",
    titleKo: "입증책임 전환",
    reasonDe: "Klauseln, die die gesetzliche Beweislast zum Nachteil des Vertragspartners verschieben, sind besonders kritisch.",
    reasonKo: "상대방에게 불리하게 법정 입증책임을 전환하는 조항은 약관통제상 고위험입니다.",
    suggestionDe: "Beweislastregeln neutral formulieren und keine gesetzlichen Nachweismöglichkeiten ausschließen.",
    suggestionKo: "입증책임은 법정 원칙을 유지하고 상대방의 반증 가능성을 배제하지 마세요.",
    consumerOnly: true,
    pattern: /(beweislast|hat\s+zu\s+beweisen|muss\s+beweisen|gilt\s+als\s+bewiesen)/i,
  },
  {
    level: "mittel",
    norm: "§ 308 Nr. 4 BGB / § 307 BGB",
    titleDe: "Einseitiger Leistungs- oder Preisänderungsvorbehalt",
    titleKo: "일방적 급부·가격 변경권",
    reasonDe: "Einseitige Änderungsrechte brauchen klare, zumutbare Voraussetzungen und dürfen den Vertragspartner nicht unangemessen benachteiligen.",
    reasonKo: "사업자의 일방적 변경권은 명확한 요건과 상당성이 없으면 BGB § 307/§ 308상 문제가 될 수 있습니다.",
    suggestionDe: "Änderungsgründe, Umfang, Vorankündigungsfrist und Sonderkündigungsrecht transparent regeln.",
    suggestionKo: "변경 사유·범위·사전통지 기간·특별해지권을 명확히 두세요.",
    consumerOnly: true,
    pattern: /(preise?.{0,60}(jederzeit|einseitig|nach\s+belieben|ändern|anpassen)|leistungen?.{0,60}(jederzeit|einseitig|ändern|anpassen))/is,
  },
  {
    level: "mittel",
    norm: "§ 309 Nr. 5 BGB",
    titleDe: "Pauschalierter Schadensersatz",
    titleKo: "손해배상액 예정/정액 배상",
    reasonDe: "Pauschalen müssen realistisch sein und dem Kunden den Nachweis eines geringeren Schadens offenlassen.",
    reasonKo: "정액 손해배상 조항은 실제 평균 손해와 맞아야 하고, 더 적은 손해 입증 가능성을 열어두어야 합니다.",
    suggestionDe: "Pauschale am typischen Schaden ausrichten und ausdrücklich den Nachweis eines geringeren oder fehlenden Schadens zulassen.",
    suggestionKo: "평균 손해에 맞춘 금액으로 제한하고 더 적거나 손해가 없다는 입증 가능성을 명시하세요.",
    consumerOnly: true,
    pattern: /(pauschal(?:e|er|ierter)?\s+(?:schadensersatz|entschädigung)|mindestens\s+\d+.{0,40}(schaden|gebühr))/i,
  },
  {
    level: "mittel",
    norm: "§ 307 BGB",
    titleDe: "Unbestimmter oder sehr weiter Rechtevorbehalt",
    titleKo: "불명확하거나 과도하게 넓은 권리 유보",
    reasonDe: "Unklare oder sehr weit gefasste Klauseln können gegen Transparenzgebot und unangemessene Benachteiligung verstoßen.",
    reasonKo: "불명확하거나 지나치게 포괄적인 조항은 투명성 원칙 및 부당한 불이익 금지에 걸릴 수 있습니다.",
    suggestionDe: "Voraussetzungen, Rechtsfolgen und Verfahren konkretisieren; offene Ermessensformulierungen vermeiden.",
    suggestionKo: "요건·효과·절차를 구체화하고 포괄적 재량 문구를 피하세요.",
    pattern: /(nach\s+eigenem\s+ermessen|ohne\s+angabe\s+von\s+gründen|jederzeit\s+ohne\s+ankündigung|beliebig)/i,
  },
  {
    level: "mittel",
    norm: "§ 309 Nr. 9 BGB / § 307 BGB",
    titleDe: "Lange Laufzeit oder automatische Vertragsverlängerung",
    titleKo: "장기 계약기간 또는 자동갱신",
    reasonDe: "Überlange Bindungen, automatische Verlängerungen oder kurze Kündigungsfenster sind im AGB-Kontext kontrollbedürftig.",
    reasonKo: "과도한 장기 구속, 자동갱신, 지나치게 짧은 해지기간은 약관통제 리스크가 있습니다.",
    suggestionDe: "Laufzeit, Verlängerung, Kündigungsfrist und elektronische Kündigungsmöglichkeit transparent und verbraucherfreundlich regeln.",
    suggestionKo: "계약기간·갱신·해지기간·전자적 해지 방법을 투명하고 소비자 친화적으로 정하세요.",
    consumerOnly: true,
    pattern: /(laufzeit|vertragsdauer|verlängert\s+sich\s+automatisch|automatische\s+verlängerung|kündigungsfrist).{0,120}(\d+\s*(?:monate|jahre)|automatisch|frist)/is,
  },
  {
    level: "mittel",
    norm: "§ 309 Nr. 13 BGB",
    titleDe: "Strenge Form für Anzeigen oder Kündigungen",
    titleKo: "통지·해지의 과도한 방식 제한",
    reasonDe: "AGB dürfen für Anzeigen oder Erklärungen regelmäßig keine strengere Form als Textform verlangen, wenn das Gesetz das nicht trägt.",
    reasonKo: "통지나 해지에 서면 원본·등기우편 등 과도한 방식을 요구하면 소비자 약관에서 문제될 수 있습니다.",
    suggestionDe: "Textform, E-Mail oder vergleichbare dauerhafte Datenträger zulassen; Schriftform nur bei gesetzlichem Grund verlangen.",
    suggestionKo: "이메일 등 텍스트 형식을 허용하고, 법적 근거가 있을 때만 엄격한 서면 형식을 요구하세요.",
    consumerOnly: true,
    pattern: /(kündigung|gekündigt|kündigen|anzeige|erklärung|widerruf).{0,100}(schriftform|schriftlich|eigenhändig|per\s+einschreiben|nur\s+per\s+brief)|(schriftform|schriftlich|eigenhändig|per\s+einschreiben|nur\s+per\s+brief).{0,100}(kündigung|gekündigt|kündigen|anzeige|erklärung|widerruf)/is,
  },
  {
    level: "mittel",
    norm: "§ 309 Nr. 3 BGB / § 307 BGB",
    titleDe: "Aufrechnungs- oder Zurückbehaltungsverbot",
    titleKo: "상계권·유치권 배제",
    reasonDe: "Pauschale Aufrechnungs- oder Zurückbehaltungsverbote sind kritisch, soweit unbestrittene oder rechtskräftig festgestellte Forderungen betroffen sind.",
    reasonKo: "다툼 없거나 확정된 채권에 대한 상계·유치권까지 배제하면 고위험입니다.",
    suggestionDe: "Aufrechnung und Zurückbehaltung mindestens für unbestrittene, entscheidungsreife oder rechtskräftig festgestellte Ansprüche zulassen.",
    suggestionKo: "다툼 없는 채권·확정판결 채권에 대해서는 상계와 유치권을 허용하세요.",
    consumerOnly: true,
    pattern: /(aufrechnung|zurückbehaltungsrecht|zurueckbehaltungsrecht).{0,100}(ausgeschlossen|nicht\s+zulässig|nur\s+mit\s+zustimmung)/is,
  },
];

function splitClauses(text: string): string[] {
  return text
    .split(/\n{2,}|(?:^|\n)\s*(?:\d+\.|§\s*\d+|[a-z]\))\s+/)
    .map((clause) => clause.replace(/\s+/g, " ").trim())
    .filter((clause) => clause.length > 0);
}

function levelRank(level: RiskLevel): number {
  return level === "hoch" ? 3 : level === "mittel" ? 2 : 1;
}

function effectiveLevel(rule: ClauseRisk, context: z.output<typeof reviewContractClausesSchema>["context"]): RiskLevel {
  if (context === "b2c" || !rule.consumerOnly) return rule.level;
  return rule.level === "hoch" ? "mittel" : "niedrig";
}

function renderRisk(
  rule: ClauseRisk,
  clause: string,
  input: Pick<z.output<typeof reviewContractClausesSchema>, "context" | "language" | "includeSuggestions">,
): string[] {
  const excerpt = clause.length > 240 ? `${clause.slice(0, 240)}...` : clause;
  const adjustedLevel = effectiveLevel(rule, input.context);
  const lines: string[] = [`- Risiko: ${adjustedLevel.toUpperCase()} | ${rule.norm}`];

  if (input.language === "de" || input.language === "both") {
    lines.push(`  Thema: ${rule.titleDe}`);
    lines.push(`  Grund: ${rule.reasonDe}`);
  }
  if (input.language === "ko" || input.language === "both") {
    lines.push(`  쟁점: ${rule.titleKo}`);
    lines.push(`  이유: ${rule.reasonKo}`);
  }
  if (rule.consumerOnly && input.context !== "b2c") {
    lines.push("  Kontext-Hinweis: Diese § 308/309-BGB-Wertung wird außerhalb B2C nur als Indiz für § 307 BGB angezeigt.");
  }

  if (input.includeSuggestions) {
    if (input.language === "de" || input.language === "both") {
      lines.push(`  Sicherere Richtung: ${rule.suggestionDe}`);
    }
    if (input.language === "ko" || input.language === "both") {
      lines.push(`  수정 방향: ${rule.suggestionKo}`);
    }
  }

  lines.push(`  Klauselauszug: "${excerpt}"`);
  return lines;
}

export async function reviewContractClauses(input: ReviewContractClausesInput): Promise<string> {
  try {
    const parsed = reviewContractClausesSchema.parse(input);
    const clauses = splitClauses(parsed.text);
    const findings: Array<{ rule: ClauseRisk; clause: string }> = [];

    for (const clause of clauses) {
      for (const rule of RISK_RULES) {
        if (rule.pattern.test(clause)) {
          findings.push({ rule, clause });
        }
      }
    }

    findings.sort((a, b) => levelRank(effectiveLevel(b.rule, parsed.context)) - levelRank(effectiveLevel(a.rule, parsed.context)));

    const high = findings.filter((finding) => effectiveLevel(finding.rule, parsed.context) === "hoch").length;
    const medium = findings.filter((finding) => effectiveLevel(finding.rule, parsed.context) === "mittel").length;
    const overall: RiskLevel = high > 0 ? "hoch" : medium > 0 ? "mittel" : "niedrig";

    const lines: string[] = [
      `[AGB-Kontrolle — BGB §§ 307-309 Screening] ${new Date().toISOString().slice(0, 10)}`,
      `Kontext: ${parsed.context}`,
      `Gesamtampel: ${overall.toUpperCase()} (${high} hoch, ${medium} mittel)`,
      "",
    ];

    if (findings.length === 0) {
      lines.push("Keine der hinterlegten Hochrisiko-Muster wurde erkannt.");
      lines.push("Hinweis: Das ersetzt keine vollständige AGB-Prüfung, insbesondere nicht bei branchenspezifischen Klauseln.");
    } else {
      lines.push("── Auffällige Klauseln ──");
      for (const finding of findings) {
        lines.push(...renderRisk(finding.rule, finding.clause, parsed));
        lines.push("");
      }
    }

    lines.push("── Prüfhinweis ──");
    lines.push("Dieses Tool markiert typische AGB-Risiken nach BGB §§ 307-309. Für eine belastbare Wirksamkeitsprüfung sind Vertragstyp, Verbraucher-/Unternehmerstatus, Individualabreden und aktuelle Rechtsprechung gesondert zu prüfen.");

    return lines.join("\n");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] AGB-Kontrolle fehlgeschlagen: ${message}`;
  }
}
