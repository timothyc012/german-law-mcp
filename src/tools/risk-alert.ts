/**
 * risk-alert.ts — Proaktive Risiko-Warnungen
 *
 * Analysiert einen Sachverhalt auf:
 * 1. Verjährung-Countdown (§ 195 BGB: 3 Jahre)
 * 2. Frist-Risiken (Kündigungsschutzklage 3 Wochen, etc.)
 * 3. Kostenausfallrisiko (RVG-Streitwert)
 */

import { z } from "zod";

export const riskAlertSchema = z.object({
  sachverhalt: z
    .string()
    .min(20)
    .max(5000)
    .describe(
      "Der zu analysierende Sachverhalt. Beschreiben Sie: " +
      "Was ist passiert? Wann? Zwischen wem? Welcher Schaden? " +
      "Beispiel: 'Ich habe am 15.03.2024 ein Auto für 8.000€ gekauft. " +
      "Am 01.06.2024 stellte sich ein Motorschaden heraus.'"
    ),
  ereignisdatum: z
    .string()
    .optional()
    .describe(
      "Datum des schadensauslösenden Ereignisses (YYYY-MM-DD). " +
      "Wenn nicht angegeben, wird versucht, es aus dem Sachverhalt zu extrahieren."
    ),
});

export type RiskAlertInput = z.infer<typeof riskAlertSchema>;

interface RiskAlert {
  level: "critical" | "warning" | "info";
  category: string;
  title: string;
  detail: string;
  action: string;
  norm?: string;
  deadline?: string;
}

const GERMAN_MONTHS: Record<string, number> = {
  januar: 0, februar: 1, märz: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
};

function extractDate(text: string): string | null {
  // German month-name format: "15. März 2024" or "1. Januar 2023"
  const m0 = text.match(/(\d{1,2})\.\s+([A-Za-zäöüÄÖÜ]+)\s+(\d{4})/);
  if (m0) {
    const monthName = m0[2].toLowerCase();
    const monthIndex = GERMAN_MONTHS[monthName];
    if (monthIndex !== undefined) {
      const day = m0[1].padStart(2, "0");
      const month = String(monthIndex + 1).padStart(2, "0");
      return `${m0[3]}-${month}-${day}`;
    }
  }
  // DD.MM.YYYY format
  const m1 = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (m1) {
    return `${m1[3]}-${m1[2]}-${m1[1]}`;
  }
  // YYYY-MM-DD format
  const m2 = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m2) {
    return m2[0];
  }
  return null;
}


function addYears(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().slice(0, 10);
}

// § 199 Abs. 4 BGB: Regelmäßige Verjährung endet am Jahresende
// (31.12. des Jahres, in dem die Frist abläuft)
function addYearsJahresende(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  // Verjährung endet am letzten Tag des Jahres (§ 199 Abs. 4 BGB)
  return `${d.getFullYear()}-12-31`;
}

// § 199 Abs. 3 Nr. 1 BGB: Absolute Höchstfrist = 10 Jahre ab Entstehung
// Endet ebenfalls am Jahresende (§ 210 BGB analog)
function addAbsoluteJahresende(dateStr: string, years: number): string {
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() + years);
  return `${d.getFullYear()}-12-31`;
}

export async function riskAlert(input: RiskAlertInput): Promise<string> {
  const { sachverhalt } = input;
  const lower = sachverhalt.toLowerCase();
  const today = new Date().toISOString().slice(0, 10);

  const alerts: RiskAlert[] = [];

  const baseDate = input.ereignisdatum ?? extractDate(sachverhalt);

  // ── Verjährung ──────────────────────────────────────────────────────
  const verjaehrungKeywords = ["schaden", "anspruch", "kauf", "miete", "vertrag", "kündigung", "schadensersatz"];
  const hasVerjaehrungContext = verjaehrungKeywords.some(kw => lower.includes(kw));

  if (hasVerjaehrungContext) {
    if (baseDate) {
      const regelvejaehrung = addYearsJahresende(baseDate, 3);
      const kenntnisVejaehrung = addAbsoluteJahresende(baseDate, 10);

      alerts.push({
        level: "info",
        category: "Verjährung",
        title: "Regelverjährung (§ 195 BGB)",
        detail: `3 Jahre ab Kenntnis von anspruchsbegründenden Umständen und Anspruchsgegner (§ 199 Abs. 1 BGB). Endet am Jahresende (§ 199 Abs. 4 BGB). Absolute Verjährung: 10 Jahre ab Entstehung.`,
        action: "Prüfen Sie, ob die Verjährung bereits begonnen hat und wann sie endet.",
        norm: "§§ 195, 199 BGB",
        deadline: `Regel: ${regelvejaehrung} | Absolut: ${kenntnisVejaehrung}`,
      });

      // Kaufrechtliche Gewährleistungsfrist
      if (["kauf", "gekauft", "verkauft", "ware", "auto", "fahrzeug"].some(kw => lower.includes(kw))) {
        const gewaehrleistung = addYears(baseDate, 2);
        const isGebraucht = ["gebraucht", "gebrauchtwagen", "gebrauchtwaren", "oldtimer"].some(kw => lower.includes(kw));
        alerts.push({
          level: "warning",
          category: "Verjährung",
          title: `Gewährleistungsfrist ${isGebraucht ? "(Gebrauchtkauf)" : "(Neuware)"}`,
          detail: isGebraucht
            ? "Bei Gebrauchtwagenkauf von Unternehmer an Verbraucher: 2 Jahre (§ 438 Abs. 1 Nr. 3 BGB). Abdingbar auf 1 Jahr (§ 475 Abs. 2 BGB)."
            : "Gewährleistungsansprüche verjähren in 2 Jahren ab Ablieferung (§ 438 Abs. 1 Nr. 3 BGB).",
          action: "Prüfen Sie, ob die Frist noch läuft. Bei Verbrauchsgüterkauf: § 477 Abs. 1 BGB Beweislastumkehr innerhalb 1 Jahr.",
          norm: "§ 438 BGB",
          deadline: gewaehrleistung,
        });

        // Beweislastumkehr-Frist
        const beweislastEnde = addYears(baseDate, 1);
        alerts.push({
          level: "info",
          category: "Beweislast",
          title: "Beweislastumkehr-Frist (§ 477 Abs. 1 BGB)",
          detail: "Zeigt sich der Mangel innerhalb von 1 Jahr nach Ablieferung, wird vermutet, dass er bereits bei Gefahrübergang vorlag.",
          action: "Prüfen Sie, ob der Mangel innerhalb dieser Frist aufgetreten ist.",
          norm: "§ 477 Abs. 1 BGB",
          deadline: beweislastEnde,
        });
      }
    } else {
      alerts.push({
        level: "warning",
        category: "Verjährung",
        title: "Datum konnte nicht erkannt werden",
        detail: "Verjährungsfristen können ohne konkretes Datum nicht berechnet werden.",
        action: "Geben Sie das Ereignisdatum im Format YYYY-MM-DD oder TT.MM.JJJJ an.",
        norm: "§ 195 BGB",
      });
    }
  }

  // ── Frist-Risiken ──────────────────────────────────────────────────

  if (["kündigung", "entlassung", "kuendigung"].some(kw => lower.includes(kw))
    && ["arbeit", "arbeitnehmer", "arbeitgeber", "arbeitsverhältnis"].some(kw => lower.includes(kw))) {
    alerts.push({
      level: "critical",
      category: "Frist",
      title: "Kündigungsschutzklage — 3-Wochen-Frist (§ 4 KSchG)",
      detail: "Die Klage muss innerhalb von 3 Wochen nach Zugang der Kündigung beim Arbeitsgericht eingereicht werden. Diese Frist ist eine Ausschlussfrist — bei Versäumnis gilt die Kündigung als wirksam!",
      action: "SOFORT: Arbeitsgericht kontaktieren. Kein Anwaltszwang in 1. Instanz.",
      norm: "§ 4 KSchG",
    });
  }

  if (["kündigung", "fristlos", "außerordentlich"].some(kw => lower.includes(kw))
    && ["arbeit", "arbeitnehmer"].some(kw => lower.includes(kw))) {
    alerts.push({
      level: "warning",
      category: "Frist",
      title: "Außerordentliche Kündigung — 2-Wochen-Frist (§ 626 Abs. 2 BGB)",
      detail: "Die außerordentliche Kündigung muss innerhalb von 2 Wochen nach Kenntnis des Kündigungsgrundes erklärt werden.",
      action: "Fristbeginn dokumentieren und Kündigung sofort schriftlich erklären.",
      norm: "§ 626 Abs. 2 BGB",
    });
  }

  if (["widerspruch", "bescheid", "verwaltungsakt"].some(kw => lower.includes(kw))) {
    alerts.push({
      level: "warning",
      category: "Frist",
      title: "Widerspruch gegen Verwaltungsakt — 1 Monat (§ 70 VwGO)",
      detail: "Widerspruch muss innerhalb von 1 Monat nach Zustellung des Verwaltungsakts eingelegt werden.",
      action: "Widerspruch schriftlich bei der Behörde einlegen. Frist beachten!",
      norm: "§ 70 VwGO",
    });
  }

  if (["miete", "mieter", "vermieter"].some(kw => lower.includes(kw))
    && ["kündigung"].some(kw => lower.includes(kw))) {
    alerts.push({
      level: "warning",
      category: "Frist",
      title: "Widerspruch gegen Mietkündigung — Härteklausel (§ 574 BGB)",
      detail: "Widerspruch spätestens 2 Monate vor Beendigung des Mietverhältnisses (§ 574b Abs. 1 BGB).",
      action: "Schriftlichen Widerspruch an Vermieter senden und Härtegründe darlegen.",
      norm: "§ 574, § 574b BGB",
    });
  }

  // ── Kostenausfallrisiko ──────────────────────────────────────────────

  const streitwertMatch = sachverhalt.match(/([\d.,]+)\s*(?:€|EUR|Euro)/);
  if (streitwertMatch) {
    const rawAmount = streitwertMatch[1].replace(/\./g, "");
    const lastComma = rawAmount.lastIndexOf(",");
    const normalized = lastComma !== -1
      ? rawAmount.slice(0, lastComma) + "." + rawAmount.slice(lastComma + 1)
      : rawAmount;
    const streitwert = parseFloat(normalized);
    if (!isNaN(streitwert) && streitwert > 0) {
      const gerichtskostenAG = Math.round(streitwert * 0.03 + 25);
      const anwaltskosten = Math.round(streitwert * 0.08 + 50);

      alerts.push({
        level: "info",
        category: "Kosten",
        title: `Streitwert: ${streitwert.toLocaleString("de-DE")}€`,
        detail: `Grobschätzung (ca.): Gericht ${gerichtskostenAG}€ + Anwalt (1. Instanz) ${anwaltskosten}€ = ca. ${gerichtskostenAG + anwaltskosten}€. ⚠ Dies ist eine grobe Schätzung, keine RVG-Berechnung. Exakte Kosten mit calculate_rvg berechnen. Bei Unterliegen trägt die unterliegende Partei die Kosten (§ 91 ZPO).`,
        action: streitwert < 1000
          ? "Bei geringem Streitwert: Schlichtung oder außergerichtliche Einigung prüfen."
          : "Kostenrisiko mit calculate_rvg genau berechnen. Rechtsschutzversicherung prüfen!",
        norm: "§§ 91, 103 ZPO; RVG",
      });

      if (streitwert < 5000) {
        alerts.push({
          level: "info",
          category: "Zuständigkeit",
          title: "Amtsgericht zuständig",
          detail: `Streitwert ${streitwert.toLocaleString("de-DE")}€ ≤ 5.000€ → Amtsgericht (§ 23 GVG). Kein Anwaltszwang.`,
          action: "Klage direkt beim zuständigen Amtsgericht einreichen möglich.",
          norm: "§ 23 GVG",
        });
      }
    }
  }

  // ── Output ──────────────────────────────────────────────────────────

  const lines: string[] = [];
  lines.push("╔══════════════════════════════════════════════════════════╗");
  lines.push("║           RISIKO-ALERT — Proaktive Warnungen             ║");
  lines.push("╚══════════════════════════════════════════════════════════╝");
  lines.push("");
  lines.push(`  Stand: ${today} | ⚠ Kein Rechtsrat — Orientierungshilfe`);
  lines.push("");

  if (alerts.length === 0) {
    lines.push("  Keine spezifischen Risiko-Warnungen für diesen Sachverhalt erkannt.");
    lines.push("  Allgemeine Empfehlung: Fristen und Verjährung stets individuell prüfen.");
    return lines.join("\n");
  }

  const criticals = alerts.filter(a => a.level === "critical");
  const warnings = alerts.filter(a => a.level === "warning");
  const infos = alerts.filter(a => a.level === "info");

  if (criticals.length > 0) {
    lines.push("  🔴 KRITISCHE FRISTEN — SOFORTIGES HANDELN ERFORDERLICH");
    lines.push("  " + "─".repeat(54));
    for (const a of criticals) {
      lines.push(`  ${a.title}`);
      lines.push(`  ${a.detail}`);
      if (a.norm) lines.push(`  Norm: ${a.norm}`);
      if (a.deadline) lines.push(`  Frist: ${a.deadline}`);
      lines.push(`  → ${a.action}`);
      lines.push("");
    }
  }

  if (warnings.length > 0) {
    lines.push("  🟡 WARNUNGEN — Zeitnah prüfen");
    lines.push("  " + "─".repeat(54));
    for (const a of warnings) {
      lines.push(`  ${a.title}`);
      lines.push(`  ${a.detail}`);
      if (a.norm) lines.push(`  Norm: ${a.norm}`);
      if (a.deadline) lines.push(`  Frist: ${a.deadline}`);
      lines.push(`  → ${a.action}`);
      lines.push("");
    }
  }

  if (infos.length > 0) {
    lines.push("  🔵 HINWEISE — Zur Kenntnis nehmen");
    lines.push("  " + "─".repeat(54));
    for (const a of infos) {
      lines.push(`  ${a.title}`);
      lines.push(`  ${a.detail}`);
      if (a.norm) lines.push(`  Norm: ${a.norm}`);
      if (a.deadline) lines.push(`  Frist: ${a.deadline}`);
      lines.push(`  → ${a.action}`);
      lines.push("");
    }
  }

  lines.push("  ═══════════════════════════════════════════════════════");
  lines.push("  ⚖  Fristen und Verjährung stets durch einen Anwalt prüfen lassen.");
  lines.push("  calculate_frist: Exakte Fristberechnung mit Feiertagsberücksichtigung");
  lines.push("  calculate_rvg: Kostenschätzung nach RVG");

  return lines.join("\n");
}
