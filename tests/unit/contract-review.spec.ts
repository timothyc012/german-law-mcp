import { describe, expect, it } from "vitest";

import { reviewContractClauses } from "../../src/tools/review-contract-clauses.js";

describe("review-contract-clauses", () => {
  it("flags high-risk liability exclusions in AGB text", async () => {
    const output = await reviewContractClauses({
      text: "Die Haftung ist ausgeschlossen, auch bei Schäden an Körper und Gesundheit sowie grober Fahrlässigkeit.",
      context: "b2c",
      language: "both",
    });

    expect(output).toContain("Gesamtampel: HOCH");
    expect(output).toContain("§ 309 Nr. 7 BGB");
    expect(output).toContain("신체·건강 손해");
  });

  it("keeps low-risk clauses as a screening result without findings", async () => {
    const output = await reviewContractClauses({
      text: "Der Vertrag beginnt am 1. Mai. Die Vergütung beträgt 100 Euro monatlich und ist jeweils zum Monatsende fällig.",
      context: "unknown",
      language: "de",
    });

    expect(output).toContain("Gesamtampel: NIEDRIG");
    expect(output).toContain("Keine der hinterlegten Hochrisiko-Muster");
  });

  it("downgrades consumer-only § 308/309 flags outside B2C context", async () => {
    const output = await reviewContractClauses({
      text: "Bei Verstoß gegen diese Pflicht wird eine Vertragsstrafe von 5.000 Euro fällig.",
      context: "b2b",
      language: "de",
    });

    expect(output).toContain("Gesamtampel: MITTEL");
    expect(output).toContain("Kontext-Hinweis");
    expect(output).not.toContain("Gesamtampel: HOCH");
  });

  it("flags automatic renewal and suggests safer drafting", async () => {
    const output = await reviewContractClauses({
      text: "Die Laufzeit beträgt 24 Monate. Der Vertrag verlängert sich automatisch um 12 Monate, wenn nicht schriftlich gekündigt wird.",
      context: "b2c",
      language: "de",
    });

    expect(output).toContain("§ 309 Nr. 9 BGB");
    expect(output).toContain("§ 309 Nr. 13 BGB");
    expect(output).toContain("Sicherere Richtung");
  });

  it("can suppress drafting suggestions for compact screening", async () => {
    const output = await reviewContractClauses({
      text: "Die Kündigung ist nur per Einschreiben und eigenhändig unterschrieben möglich.",
      context: "b2c",
      language: "de",
      includeSuggestions: false,
    });

    expect(output).toContain("§ 309 Nr. 13 BGB");
    expect(output).not.toContain("Sicherere Richtung");
  });
});
