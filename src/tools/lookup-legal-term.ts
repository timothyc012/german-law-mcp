/**
 * lookup-legal-term.ts
 *
 * Rechtswörterbuch — 독일 법률 용어 사전
 *
 * 독일어 법률 용어를 한국어/영어로 설명.
 * 퍼지 검색으로 유사 용어도 제안.
 */

import { z } from "zod";

// ── Schema ────────────────────────────────────────────────────────────────

export const lookupLegalTermSchema = z.object({
  term: z
    .string()
    .describe(
      "검색할 독일 법률 용어 (예: 'Sachmangel', 'Verjährung', 'Anspruchsgrundlage')",
    ),
  language: z
    .enum(["ko", "en", "both"])
    .default("both")
    .describe("설명 언어: 'ko'(한국어), 'en'(영어), 'both'(둘 다)"),
});

export type LookupLegalTermInput = z.infer<typeof lookupLegalTermSchema>;

// ── 사전 데이터 타입 ──────────────────────────────────────────────────────

interface LegalTermEntry {
  term: string;
  plural?: string;
  ko: string;
  en: string;
  definition_de: string;
  definition_ko: string;
  related_norms: string[];
  synonyms?: string[];
  example?: string;
  category: string;
}

// ── 법률 용어 사전 (40+ 항목) ─────────────────────────────────────────────

const LEGAL_DICTIONARY: LegalTermEntry[] = [
  // ── 민법 / 매매법 (BGB) ──────────────────────────────────────────────────
  {
    term: "Sachmangel",
    plural: "Sachmängel",
    ko: "물건의 하자 / 재료적 결함",
    en: "Material defect / Non-conformity of goods",
    definition_de:
      "Eine Sache ist mangelhaft, wenn sie bei Gefahrübergang nicht die vereinbarte Beschaffenheit hat. (§ 434 BGB)",
    definition_ko:
      "물건을 판매할 때 계약에서 약속한 품질·상태를 갖추지 못한 경우. 중고차 엔진 결함, 신제품 기능 불량 등이 대표적 사례.",
    related_norms: ["§ 434 BGB — Sachmangel (정의)", "§ 437 BGB — 하자 시 매수인의 권리", "§ 439 BGB — 추완청구 (Nacherfüllung)", "§ 438 BGB — 소멸시효"],
    synonyms: ["Mangel", "Defekt", "Fehler"],
    example: 'Das gekaufte Auto hat einen Sachmangel — der Motor war schon bei Übergabe defekt. (구매한 차에 물건 하자가 있다)',
    category: "민법 / Kaufrecht (매매법)",
  },
  {
    term: "Verjährung",
    plural: "Verjährungen",
    ko: "소멸시효",
    en: "Statute of limitations / Prescription",
    definition_de:
      "Durch Zeitablauf erlischt die Durchsetzbarkeit eines Anspruchs, nicht der Anspruch selbst. (§§ 194 ff. BGB)",
    definition_ko:
      "일정 기간이 지나면 권리를 법원에서 강제로 실현할 수 없게 되는 제도. 권리 자체는 소멸하지 않으나 항변권이 발생한다.",
    related_norms: ["§ 195 BGB — 정규 소멸시효 3년", "§ 199 BGB — 시효 기산점", "§ 214 BGB — 시효 완성의 효과"],
    synonyms: ["Verjährungsfrist", "Ausschlussfrist"],
    example: "Der Anspruch auf Schadensersatz aus § 280 BGB verjährt regelmäßig in 3 Jahren.",
    category: "민법 / Allgemeines Schuldrecht",
  },
  {
    term: "Anspruchsgrundlage",
    plural: "Anspruchsgrundlagen",
    ko: "청구권 근거 / 청구원인 조문",
    en: "Legal basis of a claim / Cause of action",
    definition_de:
      "Die Rechtsnorm, auf die ein Anspruch gestützt wird (z.B. § 280 Abs. 1 BGB für Schadensersatz).",
    definition_ko:
      "청구를 정당화하는 법률 조문. 법률 감정서에서 먼저 청구권 근거를 특정한 후 요건을 검토한다.",
    related_norms: ["§ 280 BGB — Schadensersatz", "§ 823 BGB — Deliktische Haftung", "§ 985 BGB — Herausgabeanspruch"],
    synonyms: ["Anspruch", "Rechtsgrundlage"],
    example: "Anspruchsgrundlage: V könnte gegen K einen Anspruch auf Kaufpreiszahlung aus § 433 Abs. 2 BGB haben.",
    category: "민법 / Juristische Methodik",
  },
  {
    term: "Schuldverhältnis",
    plural: "Schuldverhältnisse",
    ko: "채권관계",
    en: "Obligatory relationship / Obligation",
    definition_de:
      "Rechtsverhältnis zwischen Schuldner und Gläubiger, aus dem sich Leistungspflichten ergeben. (§ 241 BGB)",
    definition_ko:
      "채권자와 채무자 사이의 법률관계. 계약, 불법행위, 부당이득 등에서 발생한다.",
    related_norms: ["§ 241 BGB — Pflichten aus dem Schuldverhältnis", "§ 311 BGB — Rechtsgeschäftliche Schuldverhältnisse"],
    synonyms: ["Obligation", "Schuldrecht"],
    category: "민법 / Allgemeines Schuldrecht",
  },
  {
    term: "Pflichtverletzung",
    plural: "Pflichtverletzungen",
    ko: "의무위반",
    en: "Breach of duty / Breach of obligation",
    definition_de:
      "Nichterfüllung oder nicht ordnungsgemäße Erfüllung einer Leistungspflicht oder Nebenpflicht. (§ 280 Abs. 1 BGB)",
    definition_ko:
      "채무자가 계약상 의무를 이행하지 않거나 불완전하게 이행한 경우. 손해배상청구의 핵심 요건.",
    related_norms: ["§ 280 BGB — Schadensersatz wegen Pflichtverletzung", "§ 241 Abs. 2 BGB — Nebenpflichten"],
    category: "민법 / Leistungsstörungsrecht",
  },
  {
    term: "Schadensersatz",
    ko: "손해배상",
    en: "Damages / Compensation",
    definition_de:
      "Ersatz des durch eine Pflichtverletzung oder unerlaubte Handlung entstandenen Schadens. (§§ 249 ff. BGB)",
    definition_ko:
      "위법행위나 계약 위반으로 발생한 손해를 금전 또는 원상회복으로 보상하는 것.",
    related_norms: ["§ 249 BGB — 원상회복 원칙", "§ 251 BGB — 금전 배상", "§ 280 BGB — 채무불이행 배상"],
    synonyms: ["Schadenersatz", "Entschädigung"],
    category: "민법 / Schadensrecht",
  },
  {
    term: "Gewährleistung",
    ko: "하자담보책임 / 보증",
    en: "Warranty / Guarantee (statutory)",
    definition_de:
      "Gesetzliche Haftung des Verkäufers für Mängel der verkauften Sache. (§§ 434 ff. BGB)",
    definition_ko:
      "판매자가 물건의 하자에 대해 법률상 부담하는 책임. 당사자간 약정과 무관하게 발생한다.",
    related_norms: ["§ 437 BGB — Rechte bei Sachmangel", "§ 476 BGB — 소비자 매매 특칙"],
    synonyms: ["Mängelhaftung", "Sachmängelhaftung"],
    category: "민법 / Kaufrecht",
  },
  {
    term: "Kaufvertrag",
    plural: "Kaufverträge",
    ko: "매매계약",
    en: "Sales contract / Contract of sale",
    definition_de:
      "Gegenseitiger Vertrag, durch den sich der Verkäufer zur Übergabe und Eigentumsübertragung, der Käufer zur Zahlung des Kaufpreises verpflichtet. (§ 433 BGB)",
    definition_ko:
      "매도인이 물건을 인도하고 소유권을 이전할 의무를, 매수인이 대금을 지급할 의무를 부담하는 계약.",
    related_norms: ["§ 433 BGB — 매매계약의 의무", "§ 434 BGB — Sachmangel", "§ 438 BGB — Verjährung"],
    category: "민법 / Kaufrecht",
  },
  {
    term: "Rücktritt",
    ko: "계약 해제",
    en: "Withdrawal / Rescission",
    definition_de:
      "Gestaltungsrecht zur Aufhebung eines Vertrags mit Rückabwicklungspflicht. (§§ 346 ff. BGB)",
    definition_ko:
      "계약을 소급하여 없애는 형성권. 해제 후 양 당사자는 원상회복 의무를 진다.",
    related_norms: ["§ 323 BGB — Rücktritt bei Leistungsstörung", "§ 437 Nr. 2 BGB — Rücktritt bei Mangel", "§ 346 BGB — 원상회복"],
    synonyms: ["Vertragsrücktritt"],
    category: "민법 / Leistungsstörungsrecht",
  },
  {
    term: "Minderung",
    ko: "대금감액",
    en: "Price reduction / Reduction of purchase price",
    definition_de:
      "Gestaltungsrecht des Käufers auf Herabsetzung des Kaufpreises bei Sachmangel. (§ 441 BGB)",
    definition_ko:
      "물건 하자 시 매수인이 대금을 줄일 수 있는 형성권. 완전한 해제가 어려운 경우 선택.",
    related_norms: ["§ 441 BGB — Minderung", "§ 437 Nr. 2 BGB — 권리 목록"],
    category: "민법 / Kaufrecht",
  },
  {
    term: "Nacherfüllung",
    ko: "추완청구 / 보완이행",
    en: "Subsequent performance / Cure",
    definition_de:
      "Anspruch des Käufers auf Beseitigung des Mangels oder Lieferung einer mangelfreien Sache. (§ 439 BGB)",
    definition_ko:
      "하자 있는 물건을 수리하거나 하자 없는 물건으로 교체해 줄 것을 청구할 권리.",
    related_norms: ["§ 439 BGB — Nacherfüllung", "§ 440 BGB — Fristsetzung entbehrlich"],
    synonyms: ["Nachbesserung", "Ersatzlieferung"],
    category: "민법 / Kaufrecht",
  },
  {
    term: "Verzug",
    ko: "이행지체",
    en: "Default / Delay in performance",
    definition_de:
      "Schuldhaftes Nichtleisten trotz Fälligkeit und Mahnung. Unterschied: Gläubiger- und Schuldnerverzug.",
    definition_ko:
      "이행기가 도래했음에도 채무자가 귀책사유로 이행하지 않는 상태. 지연이자 등 추가 책임이 발생한다.",
    related_norms: ["§ 286 BGB — Schuldnerverzug", "§ 288 BGB — Verzugszinsen", "§ 293 BGB — Gläubigerverzug"],
    synonyms: ["Schuldnerverzug", "Leistungsverzug"],
    category: "민법 / Leistungsstörungsrecht",
  },
  {
    term: "Verschulden",
    ko: "귀책사유 / 책임",
    en: "Fault / Culpability",
    definition_de:
      "Subjektives Element der Haftung: Vorsatz oder Fahrlässigkeit des Schuldners. (§ 276 BGB)",
    definition_ko:
      "손해배상 책임의 주관적 요소. 고의(Vorsatz)와 과실(Fahrlässigkeit)을 포함한다.",
    related_norms: ["§ 276 BGB — 책임 기준", "§ 278 BGB — 이행보조자의 과실"],
    category: "민법 / Allgemeines Schuldrecht",
  },
  {
    term: "Fahrlässigkeit",
    ko: "과실 (부주의)",
    en: "Negligence",
    definition_de:
      "Außerachtlassung der im Verkehr erforderlichen Sorgfalt. (§ 276 Abs. 2 BGB)",
    definition_ko:
      "거래상 요구되는 주의를 게을리한 경우. 단순과실과 중과실(grobe Fahrlässigkeit)로 구분.",
    related_norms: ["§ 276 Abs. 2 BGB — Fahrlässigkeit", "§ 277 BGB — 자기사무 주의의무"],
    synonyms: ["Sorgfaltspflichtverletzung"],
    category: "민법 / Haftungsrecht",
  },
  {
    term: "Vorsatz",
    ko: "고의",
    en: "Intent / Wilful misconduct",
    definition_de:
      "Wissen und Wollen des tatbestandsmäßigen Erfolgs. (§ 276 Abs. 1 BGB / § 15 StGB)",
    definition_ko:
      "결과 발생을 알고도 의도적으로 행위하는 것. 민법과 형법 모두 핵심 개념.",
    related_norms: ["§ 276 Abs. 1 BGB — Vorsatz", "§ 15 StGB — 고의 원칙", "§ 826 BGB — 고의적 양속위반"],
    synonyms: ["Absicht", "Dolus"],
    category: "민법 / 형법 / Haftungsrecht",
  },
  {
    term: "Bereicherungsrecht",
    ko: "부당이득법",
    en: "Law of unjust enrichment",
    definition_de:
      "Wer ohne Rechtsgrund auf Kosten eines anderen bereichert ist, muss die Bereicherung herausgeben. (§ 812 BGB)",
    definition_ko:
      "법률상 근거 없이 타인의 재산으로 이익을 얻은 자는 반환해야 한다는 법리.",
    related_norms: ["§ 812 BGB — 부당이득 반환", "§ 818 BGB — 반환 범위"],
    synonyms: ["ungerechtfertigte Bereicherung"],
    category: "민법 / Schuldrecht",
  },
  {
    term: "Delikt",
    plural: "Delikte",
    ko: "불법행위 (민법) / 범죄 (형법)",
    en: "Tort (civil) / Criminal offence",
    definition_de:
      "Im Zivilrecht: schuldhaft begangene unerlaubte Handlung, die Schadensersatz auslöst (§ 823 BGB). Im Strafrecht: strafbare Handlung.",
    definition_ko:
      "민법상 불법행위(§ 823 BGB)는 손해배상책임을, 형법상 범죄는 형벌을 발생시킨다.",
    related_norms: ["§ 823 Abs. 1 BGB — 기본 불법행위 조항", "§ 826 BGB — 고의적 양속위반"],
    category: "민법 / 형법",
  },
  {
    term: "Eigentum",
    ko: "소유권",
    en: "Ownership / Property right",
    definition_de:
      "Das umfassende dingliche Recht an einer Sache: Besitz, Nutzung, Verfügung. (§ 903 BGB)",
    definition_ko:
      "물건을 전면적으로 지배할 수 있는 물권. 법률의 범위 내에서 임의로 처분·사용할 수 있다.",
    related_norms: ["§ 903 BGB — 소유권의 내용", "§ 985 BGB — 소유물반환청구권", "§ 929 BGB — 동산 양도"],
    synonyms: ["Eigentumsrecht"],
    category: "민법 / Sachenrecht (물권법)",
  },

  // ── 절차법 (ZPO / StPO) ──────────────────────────────────────────────────
  {
    term: "Klage",
    plural: "Klagen",
    ko: "소 / 소장 / 소의 제기",
    en: "Action / Lawsuit / Claim",
    definition_de:
      "Antrag an das Gericht auf Erlass eines Urteils gegen den Beklagten. (§ 253 ZPO)",
    definition_ko:
      "법원에 피고에 대한 판결을 구하는 신청. 소장 제출로 소송이 시작된다.",
    related_norms: ["§ 253 ZPO — Klageschrift", "§ 261 ZPO — 소송계속"],
    synonyms: ["Klageerhebung", "Klageantrag"],
    category: "절차법 / Zivilprozessrecht",
  },
  {
    term: "Beklagter",
    ko: "피고",
    en: "Defendant",
    definition_de:
      "Partei, gegen die eine Klage erhoben wird. (§ 253 ZPO)",
    definition_ko:
      "소송에서 원고의 청구에 대하여 방어하는 당사자.",
    related_norms: ["§ 253 ZPO — Parteien der Klage"],
    synonyms: ["Antragsgegner (bei einstweiliger Verfügung)"],
    category: "절차법 / Zivilprozessrecht",
  },
  {
    term: "Kläger",
    ko: "원고",
    en: "Plaintiff / Claimant",
    definition_de:
      "Partei, die die Klage erhebt. (§ 253 ZPO)",
    definition_ko:
      "소송을 제기하는 당사자.",
    related_norms: ["§ 253 ZPO"],
    synonyms: ["Antragsteller (bei einstweiliger Verfügung)"],
    category: "절차법 / Zivilprozessrecht",
  },
  {
    term: "Urteil",
    plural: "Urteile",
    ko: "판결",
    en: "Judgment / Verdict",
    definition_de:
      "Endentscheidung des Gerichts nach mündlicher Verhandlung über die Hauptsache. (§§ 300 ff. ZPO)",
    definition_ko:
      "변론을 거쳐 본안에 대해 내리는 법원의 최종 결정. 확정 시 기판력이 발생한다.",
    related_norms: ["§ 300 ZPO — Endurteil", "§ 313 ZPO — Urteilsinhalt"],
    synonyms: ["Endurteil", "Teilurteil"],
    category: "절차법 / Zivilprozessrecht",
  },
  {
    term: "Beschluss",
    plural: "Beschlüsse",
    ko: "결정",
    en: "Court order / Decision",
    definition_de:
      "Gerichtliche Entscheidung ohne mündliche Verhandlung über Verfahrensfragen. (§ 329 ZPO)",
    definition_ko:
      "변론 없이 절차적 사항에 대하여 내리는 법원의 결정.",
    related_norms: ["§ 329 ZPO — Beschlüsse und Verfügungen"],
    synonyms: ["Verfügung"],
    category: "절차법 / Zivilprozessrecht",
  },
  {
    term: "Berufung",
    ko: "항소 (민사) / 항소심",
    en: "Appeal (to second instance court)",
    definition_de:
      "Rechtsmittel gegen ein erstinstanzliches Urteil an das übergeordnete Gericht. (§ 511 ZPO)",
    definition_ko:
      "제1심 판결에 불복하여 항소심 법원에 재심사를 구하는 불복 방법.",
    related_norms: ["§ 511 ZPO — Zulässigkeit der Berufung", "§ 513 ZPO — Berufungsgründe"],
    synonyms: ["Rechtsmittel"],
    category: "절차법 / Rechtsmittelrecht",
  },
  {
    term: "Revision",
    ko: "상고 (법률심)",
    en: "Appeal on points of law (to BGH)",
    definition_de:
      "Rechtsmittel zum Bundesgerichtshof — nur Rechtsfehler werden geprüft, kein neuer Sachvortrag. (§ 542 ZPO)",
    definition_ko:
      "BGH(연방대법원)에 제기하는 법률심. 법률 적용의 오류만 심사하며 새로운 사실을 다툴 수 없다.",
    related_norms: ["§ 542 ZPO — 상고 요건", "§ 543 ZPO — Revisionszulassung"],
    category: "절차법 / Rechtsmittelrecht",
  },
  {
    term: "Beschwerde",
    ko: "즉시항고 / 불복신청",
    en: "Immediate appeal / Complaint",
    definition_de:
      "Rechtsmittel gegen Beschlüsse und Verfügungen. (§ 567 ZPO)",
    definition_ko:
      "결정에 대한 불복 수단. 판결에 대한 항소·상고와 구별된다.",
    related_norms: ["§ 567 ZPO — sofortige Beschwerde"],
    category: "절차법 / Rechtsmittelrecht",
  },
  {
    term: "einstweilige Verfügung",
    ko: "가처분",
    en: "Interim injunction / Preliminary injunction",
    definition_de:
      "Eilmaßnahme zur vorläufigen Regelung eines Rechtsverhältnisses. (§§ 935 ff. ZPO)",
    definition_ko:
      "본안 판결 전에 임시로 법률관계를 규율하는 긴급 수단. 지식재산권·경쟁법 분쟁에서 자주 활용.",
    related_norms: ["§ 935 ZPO — einstweilige Verfügung", "§ 940 ZPO — Regelungsverfügung"],
    synonyms: ["eV", "EV"],
    category: "절차법 / einstweiliger Rechtsschutz",
  },
  {
    term: "Streitwert",
    ko: "소송가액 / 소가",
    en: "Amount in controversy / Value of the claim",
    definition_de:
      "Geldwert des Streitgegenstandes, der die Gerichts- und Anwaltsgebühren bestimmt. (§§ 3 ff. ZPO)",
    definition_ko:
      "소송물의 경제적 가치. 법원 관할 및 변호사·법원 수수료 산정의 기준이 된다.",
    related_norms: ["§ 3 ZPO — Streitwertschätzung", "§ 63 GKG — Streitwertfestsetzung"],
    synonyms: ["Gegenstandswert", "Geschäftswert"],
    category: "절차법 / Gebührenrecht",
  },
  {
    term: "Beweislast",
    ko: "입증책임 / 증명책임",
    en: "Burden of proof",
    definition_de:
      "Verpflichtung einer Partei, eine Tatsache zu beweisen, bei deren Nichtbeweis sie das Prozessrisiko trägt.",
    definition_ko:
      "증명되지 않는 경우 불이익을 받는 당사자에게 주어지는 증명의 부담.",
    related_norms: ["§ 286 ZPO — Beweiswürdigung", "§ 477 BGB — 소비자 매매의 입증책임 전환"],
    synonyms: ["Darlegungslast", "Beweisführungslast"],
    category: "절차법 / Beweisrecht",
  },
  {
    term: "Prozesskostenhilfe",
    ko: "소송구조 (법률부조)",
    en: "Legal aid / Assistance with legal costs",
    definition_de:
      "Staatliche Unterstützung für bedürftige Parteien zur Finanzierung von Gerichts- und Anwaltskosten. (§§ 114 ff. ZPO)",
    definition_ko:
      "경제적으로 어려운 당사자가 소송비용을 국가 지원으로 해결하는 제도.",
    related_norms: ["§ 114 ZPO — PKH 요건", "§ 121 ZPO — 변호사 선임"],
    synonyms: ["PKH"],
    category: "절차법 / Prozesskostenrecht",
  },

  // ── 형법 (StGB) ──────────────────────────────────────────────────────────
  {
    term: "Tatbestand",
    plural: "Tatbestände",
    ko: "구성요건 (형법) / 사실관계 (일반)",
    en: "Criminal elements / Offence definition",
    definition_de:
      "Gesamtheit der Merkmale, die ein Strafgesetz beschreibt. Strafbar ist nur, wer alle Tatbestandsmerkmale erfüllt.",
    definition_ko:
      "형벌법규가 규정한 불법 행위의 요소 전체. 모든 요소를 충족해야만 처벌 가능.",
    related_norms: ["§ 16 StGB — 구성요건 착오", "§ 22 StGB — 미수"],
    synonyms: ["Tatbestandsmerkmale"],
    category: "형법 / Allgemeines Strafrecht",
  },
  {
    term: "Rechtswidrigkeit",
    ko: "위법성",
    en: "Unlawfulness / Wrongfulness",
    definition_de:
      "Widerspruch der Tat zum Recht; kann durch Rechtfertigungsgründe (Notwehr, Notstand) entfallen.",
    definition_ko:
      "행위가 법질서에 반하는 것. 정당방위·긴급피난 등 위법성 조각사유가 있으면 위법성이 없다.",
    related_norms: ["§ 32 StGB — Notwehr (정당방위)", "§ 34 StGB — Notstand (긴급피난)"],
    category: "형법 / Verbrechensaufbau",
  },
  {
    term: "Schuld",
    ko: "책임 (형법상 비난가능성)",
    en: "Culpability / Guilt (criminal)",
    definition_de:
      "Persönliche Vorwerfbarkeit der Tat; fehlt bei Schuldunfähigkeit (§ 20 StGB) oder unvermeidbarem Verbotsirrtum.",
    definition_ko:
      "행위자에 대한 개인적 비난가능성. 형사미성년자·심신상실자에게는 책임이 없다.",
    related_norms: ["§ 17 StGB — Verbotsirrtum", "§ 20 StGB — Schuldunfähigkeit (심신상실)"],
    synonyms: ["Schuldprinzip", "Schuldvorwurf"],
    category: "형법 / Verbrechensaufbau",
  },
  {
    term: "Täter",
    ko: "정범 / 행위자",
    en: "Perpetrator / Principal offender",
    definition_de:
      "Wer die Straftat selbst begeht (unmittelbarer Täter) oder durch andere begehen lässt (mittelbarer Täter). (§ 25 StGB)",
    definition_ko:
      "범죄를 직접 또는 간접적으로 실행하는 자. 공동정범·간접정범 포함.",
    related_norms: ["§ 25 StGB — Täterschaft", "§ 26 StGB — Anstiftung", "§ 27 StGB — Beihilfe"],
    synonyms: ["unmittelbarer Täter", "mittelbarer Täter"],
    category: "형법 / Beteiligungslehre (공범론)",
  },
  {
    term: "Teilnehmer",
    ko: "공범",
    en: "Participant / Accessory",
    definition_de:
      "Anstifter (§ 26 StGB) oder Gehilfe (§ 27 StGB) an einer fremden Haupttat.",
    definition_ko:
      "타인의 범죄에 가담하는 자. 교사범(Anstifter)과 방조범(Gehilfe)으로 구분.",
    related_norms: ["§ 26 StGB — Anstiftung", "§ 27 StGB — Beihilfe"],
    synonyms: ["Anstifter", "Gehilfe"],
    category: "형법 / Beteiligungslehre",
  },
  {
    term: "Strafbarkeit",
    ko: "가벌성 / 처벌가능성",
    en: "Punishability / Criminal liability",
    definition_de:
      "Vorliegen aller Voraussetzungen der Strafbarkeit: Tatbestand, Rechtswidrigkeit, Schuld + keine Strafausschlussgründe.",
    definition_ko:
      "구성요건·위법성·책임 등 처벌을 위한 모든 요건이 충족된 상태.",
    related_norms: ["§ 13 ff. StGB — allg. Strafbarkeitsvoraussetzungen"],
    category: "형법 / Verbrechensaufbau",
  },

  // ── 일반 / 방법론 ────────────────────────────────────────────────────────
  {
    term: "Rechtsgrundlage",
    ko: "법적 근거",
    en: "Legal basis / Legal authority",
    definition_de:
      "Die Norm, auf die eine Maßnahme, ein Vertrag oder eine Entscheidung gestützt wird.",
    definition_ko:
      "특정 행위나 결정을 정당화하는 법률 조문 또는 원칙.",
    related_norms: [],
    synonyms: ["Anspruchsgrundlage", "Ermächtigungsgrundlage"],
    category: "일반 / Juristische Methodik",
  },
  {
    term: "Gutachtenstil",
    ko: "감정서 문체 (법학 방법론)",
    en: "Legal opinion style / Syllogism method",
    definition_de:
      "Juristische Darstellungsweise: Obersatz → Voraussetzungen → Subsumtion → Ergebnis.",
    definition_ko:
      "독일 법학의 표준 논증 방법. 대전제(요건) → 소전제(사실) → 포섭 → 결론 순서로 전개.",
    related_norms: [],
    synonyms: ["Gutachtenform"],
    example: "Obersatz: V könnte gegen K einen Anspruch aus § 433 Abs. 2 BGB haben.",
    category: "일반 / Juristische Methodik",
  },
  {
    term: "Obersatz",
    ko: "대전제 / 주논제",
    en: "Major premise / Opening proposition",
    definition_de:
      "Einleitungssatz im Gutachtenstil, der formuliert, welcher Anspruch geprüft wird.",
    definition_ko:
      "법학 감정서에서 어떤 청구권을 검토하는지 밝히는 첫 문장.",
    related_norms: [],
    synonyms: ["Prüfungsgegenstand"],
    example: "K könnte gegen V einen Anspruch auf Schadensersatz gemäß § 280 Abs. 1 BGB haben.",
    category: "일반 / Juristische Methodik",
  },
  {
    term: "Subsumtion",
    ko: "포섭 (사실의 법률 요건 적용)",
    en: "Subsumption / Application of law to facts",
    definition_de:
      "Einordnung des konkreten Sachverhalts unter die abstrakten Merkmale der Rechtsnorm.",
    definition_ko:
      "구체적인 사실관계를 추상적인 법률 요건에 대입하는 논증 과정.",
    related_norms: [],
    category: "일반 / Juristische Methodik",
  },
  {
    term: "Treu und Glauben",
    ko: "신의성실 원칙",
    en: "Good faith / Principle of good faith",
    definition_de:
      "Grundprinzip des deutschen Schuldrechts: Parteien haben Rücksicht auf die Interessen des anderen zu nehmen. (§ 242 BGB)",
    definition_ko:
      "당사자들이 서로의 이익을 고려하며 성실하게 행동해야 한다는 민법의 기본 원칙.",
    related_norms: ["§ 242 BGB — Treu und Glauben"],
    synonyms: ["Grundsatz von Treu und Glauben", "bona fides"],
    category: "민법 / Allgemeines Schuldrecht",
  },
  {
    term: "Vertragsfreiheit",
    ko: "계약 자유의 원칙",
    en: "Freedom of contract",
    definition_de:
      "Grundsatz, dass jedermann Verträge frei gestalten, abschließen und den Partner wählen kann.",
    definition_ko:
      "계약 내용·형식·상대방을 자유롭게 결정할 수 있다는 사적 자치 원칙.",
    related_norms: ["§ 311 BGB — 계약 자유의 전제", "§ 138 BGB — 공서 위반 한계"],
    synonyms: ["Privatautonomie", "Vertragsautonomie"],
    category: "민법 / Allgemeines Schuldrecht",
  },
  {
    term: "culpa in contrahendo",
    ko: "계약 체결 전 과실 책임",
    en: "Pre-contractual liability / Culpa in contrahendo",
    definition_de:
      "Haftung für Schäden, die beim Vertragsschluss durch schuldhafte Verletzung vorvertraglicher Pflichten entstehen. (§ 311 Abs. 2, § 241 Abs. 2 BGB)",
    definition_ko:
      "계약 협상 단계에서 부주의한 행동으로 상대방에게 손해를 준 경우 발생하는 손해배상 책임.",
    related_norms: ["§ 311 Abs. 2 BGB — c.i.c. 근거", "§ 241 Abs. 2 BGB — 부수의무"],
    synonyms: ["c.i.c.", "vorvertragliche Haftung"],
    category: "민법 / Schuldrecht",
  },
];

// ── 검색 로직 (퍼지) ──────────────────────────────────────────────────────

interface SearchResult {
  entry: LegalTermEntry;
  score: number;
}

function searchDictionary(term: string): SearchResult[] {
  const lower = term.toLowerCase().trim();
  const results: SearchResult[] = [];

  for (const entry of LEGAL_DICTIONARY) {
    let score = 0;

    // 정확히 일치
    if (entry.term.toLowerCase() === lower) {
      score = 100;
    }
    // 시작 일치
    else if (entry.term.toLowerCase().startsWith(lower)) {
      score = 80;
    }
    // 포함
    else if (entry.term.toLowerCase().includes(lower)) {
      score = 60;
    }
    // 동의어 일치
    else if (entry.synonyms?.some((s) => s.toLowerCase() === lower)) {
      score = 90;
    }
    // 동의어 포함
    else if (entry.synonyms?.some((s) => s.toLowerCase().includes(lower))) {
      score = 50;
    }
    // 역방향 — 검색어가 용어를 포함
    else if (lower.includes(entry.term.toLowerCase())) {
      score = 40;
    }
    // 한국어/영어 번역 매칭
    else if (
      entry.ko.toLowerCase().includes(lower) ||
      entry.en.toLowerCase().includes(lower)
    ) {
      score = 30;
    }

    if (score > 0) {
      results.push({ entry, score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ── 출력 포맷 ─────────────────────────────────────────────────────────────

function formatEntry(
  entry: LegalTermEntry,
  language: "ko" | "en" | "both",
): string {
  const lines: string[] = [];

  lines.push(`Rechtswörterbuch — "${entry.term}"`);
  lines.push("━".repeat(50));
  lines.push("");

  if (entry.plural) {
    lines.push(`  Plural: ${entry.plural}`);
  }

  // 번역
  if (language === "ko" || language === "both") {
    lines.push(`  한국어: ${entry.ko}`);
  }
  if (language === "en" || language === "both") {
    lines.push(`  English: ${entry.en}`);
  }
  lines.push("");

  // 정의
  lines.push("  Definition (DE):");
  lines.push(`  ${entry.definition_de}`);
  lines.push("");

  if (language === "ko" || language === "both") {
    lines.push("  한국어 설명:");
    lines.push(`  ${entry.definition_ko}`);
    lines.push("");
  }

  // 관련 조문
  if (entry.related_norms.length > 0) {
    lines.push("  관련 조문:");
    for (const norm of entry.related_norms) {
      lines.push(`  • ${norm}`);
    }
    lines.push("");
  }

  // 유의어
  if (entry.synonyms && entry.synonyms.length > 0) {
    lines.push(`  유의어: ${entry.synonyms.join(", ")}`);
    lines.push("");
  }

  // 사용 예시
  if (entry.example) {
    lines.push("  사용 예시:");
    lines.push(`  "${entry.example}"`);
    lines.push("");
  }

  lines.push(`  분야: ${entry.category}`);

  return lines.join("\n");
}

// ── Hauptfunktion ─────────────────────────────────────────────────────────

export async function lookupLegalTerm(
  input: LookupLegalTermInput,
): Promise<string> {
  try {
    const lines: string[] = [];
    const results = searchDictionary(input.term);

    if (results.length === 0) {
      lines.push(`Rechtswörterbuch — Suche: "${input.term}"`);
      lines.push("━".repeat(50));
      lines.push("");
      lines.push("  Kein Eintrag gefunden.");
      lines.push("");
      lines.push("  Verfügbare Kategorien:");
      lines.push("  • 민법 / Kaufrecht: Sachmangel, Verjährung, Rücktritt, Minderung ...");
      lines.push("  • 절차법 / ZPO: Klage, Urteil, Berufung, Revision ...");
      lines.push("  • 형법 / StGB: Tatbestand, Vorsatz, Täter ...");
      lines.push("  • 방법론: Gutachtenstil, Obersatz, Subsumtion ...");
      lines.push("");
      lines.push(`  Tipp: Suchanfrage auf Deutsch eingeben (z.B. "Sachmangel", "Verzug").`);
      return lines.join("\n");
    }

    // 최상위 결과 표시
    const primary = results[0];
    lines.push(formatEntry(primary.entry, input.language));

    // 유사 용어 제안 (상위 3개 추가)
    const suggestions = results.slice(1, 4);
    if (suggestions.length > 0) {
      lines.push("");
      lines.push("  ─────────────────────────────────────────────────────────");
      lines.push("  유사 용어 (Ähnliche Begriffe):");
      for (const s of suggestions) {
        lines.push(`  → ${s.entry.term} — ${s.entry.ko} / ${s.entry.en}`);
      }
    }

    return lines.join("\n");

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `[오류] Rechtswörterbuch 실행 중 오류: ${message}`;
  }
}
