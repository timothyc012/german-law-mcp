export interface LegalAssertion {
  id: string;
  norm: string;           // e.g., "§ 195 BGB"
  assertion: string;      // What the code claims
  expectedInGII: string;  // What GII text should contain
  severity: "critical" | "high" | "medium";
}

export const LEGAL_ASSERTIONS: LegalAssertion[] = [
  // Verjährung
  { id: "verjaehrung-3j", norm: "§ 195 BGB", assertion: "Regelverjährung = 3 Jahre", expectedInGII: "drei Jahre", severity: "critical" },
  { id: "verjaehrung-beginn", norm: "§ 199 Abs. 1 BGB", assertion: "Beginn mit Kenntnis + Jahresende", expectedInGII: "Kenntnis", severity: "critical" },

  // Kaufrecht
  { id: "sachmangel", norm: "§ 434 BGB", assertion: "Sachmangel-Definition", expectedInGII: "Sachmangel", severity: "critical" },
  { id: "beweislast", norm: "§ 477 Abs. 1 BGB", assertion: "Beweislastumkehr 1 Jahr", expectedInGII: "vermutet", severity: "critical" },
  { id: "arglist", norm: "§ 438 Abs. 3 BGB", assertion: "Arglistiges Verschweigen → Regelverjährung", expectedInGII: "arglistig", severity: "critical" },
  { id: "gewaehrleistung-2j", norm: "§ 438 Abs. 1 Nr. 3 BGB", assertion: "Gewährleistung = 2 Jahre", expectedInGII: "zwei Jahren", severity: "critical" },
  { id: "nacherfuellung", norm: "§ 439 BGB", assertion: "Nacherfüllung", expectedInGII: "Nacherfüllung", severity: "high" },
  { id: "kaeuferrechte", norm: "§ 437 BGB", assertion: "Rechte des Käufers bei Mängeln", expectedInGII: "Nacherfüllung", severity: "high" },
  { id: "aliud-abs3", norm: "§ 434 Abs. 3 BGB", assertion: "Aliud-Lieferung in Abs. 3 (post-2022)", expectedInGII: "andere Sache", severity: "critical" },

  // Mietrecht
  { id: "mietvertrag", norm: "§ 535 BGB", assertion: "Mietvertrag Hauptpflichten", expectedInGII: "Mieter", severity: "high" },
  { id: "kuendigung-frist", norm: "§ 573c BGB", assertion: "Kündigungsfristen gestaffelt", expectedInGII: "drei Monate", severity: "high" },
  { id: "fristlose-miete", norm: "§ 543 BGB", assertion: "Fristlose Kündigung Mietvertrag", expectedInGII: "wichtiger Grund", severity: "high" },

  // Fristen
  { id: "berufung-1m", norm: "§ 517 ZPO", assertion: "Berufungsfrist = 1 Monat", expectedInGII: "eines Monats", severity: "critical" },
  { id: "einspruch-2w", norm: "§ 339 ZPO", assertion: "Einspruch = 2 Wochen", expectedInGII: "zwei Wochen", severity: "critical" },
  { id: "widerspruch-mahn", norm: "§ 694 ZPO", assertion: "Widerspruch Mahnbescheid", expectedInGII: "Widerspruch", severity: "critical" },
  { id: "kueschutz-3w", norm: "§ 4 KSchG", assertion: "Kündigungsschutzklage = 3 Wochen", expectedInGII: "drei Wochen", severity: "critical" },

  // Deliktsrecht
  { id: "delikt", norm: "§ 823 BGB", assertion: "Deliktsrecht — absolute Rechtsgüter", expectedInGII: "Leben", severity: "high" },
  { id: "betrug", norm: "§ 263 StGB", assertion: "Betrug — Täuschung", expectedInGII: "Täuschung", severity: "high" },

  // Fristverschiebung
  { id: "feiertag-verschiebung", norm: "§ 193 BGB", assertion: "Fristverschiebung auf nächsten Werktag", expectedInGII: "Sonntag", severity: "critical" },

  // Arbeitsrecht
  { id: "kuendigungsschutz", norm: "§ 1 KSchG", assertion: "Soziale Rechtfertigung", expectedInGII: "sozial ungerechtfertigt", severity: "high" },
  { id: "fristlose-626", norm: "§ 626 BGB", assertion: "Fristlose Kündigung aus wichtigem Grund", expectedInGII: "wichtigem Grund", severity: "high" },
];

/**
 * Verify a single assertion against GII text.
 * Returns true if expectedInGII is found in the provided text.
 */
export function verifyAssertion(assertion: LegalAssertion, giiText: string): boolean {
  return giiText.toLowerCase().includes(assertion.expectedInGII.toLowerCase());
}
