import { describe, expect, it } from "vitest";

import { analyzeScenario } from "../../src/tools/analyze-scenario.js";
import { gutachtenScaffold } from "../../src/tools/gutachten-scaffold.js";

describe("gutachten-scaffold", () => {
  it("recognizes Kaufrecht scenarios", async () => {
    const output = await gutachtenScaffold({
      sachverhalt: "A kaufte von B ein Auto. Nach kurzer Zeit zeigte sich ein Sachmangel, und B verweigert die Reparatur.",
      fragestellung: "Welche Ansprüche hat A?",
      stil: "kurz",
    });

    expect(output).toContain("§ 437 Nr. 1 i.V.m. § 439 BGB");
    expect(output).toContain("Rechtsgebiet: Kaufrecht / Gewährleistung");
  });

  it("recognizes Mietrecht scenarios", async () => {
    const output = await gutachtenScaffold({
      sachverhalt: "Der Vermieter kündigte dem Mieter fristlos wegen Mietrückstand aus dem Mietvertrag über eine Wohnung.",
      fragestellung: "Ist die Kündigung wirksam?",
      stil: "kurz",
    });

    expect(output).toContain("§ 543 BGB");
    expect(output).toContain("Rechtsgebiet: Mietrecht");
  });

  it("recognizes Arbeitsrecht scenarios", async () => {
    const output = await gutachtenScaffold({
      sachverhalt: "Der Arbeitgeber entließ den Arbeitnehmer fristlos nach einem behaupteten Diebstahl am Arbeitsplatz.",
      fragestellung: "Welche Ansprüche hat der Arbeitnehmer?",
      stil: "kurz",
    });

    expect(output).toContain("§ 626 BGB");
    expect(output).toContain("Rechtsgebiet: Arbeitsrecht");
  });
});

describe("analyze-scenario", () => {
  it("includes a Beweislast section in full analysis", async () => {
    const output = await analyzeScenario({
      sachverhalt: "Ich habe bei einem Händler ein Auto gekauft. Nach zwei Wochen war der Motor defekt und der Verkäufer lehnt die Reparatur ab.",
      perspektive: "neutral",
      tiefe: "vollständig",
    });

    expect(output).toContain("BEWEISLASTVERTEILUNG");
    expect(output).toContain("Allgemeine Regel: Jede Partei beweist die Voraussetzungen");
  });

  it("mentions the special § 477 BGB burden-of-proof rule for consumer sales", async () => {
    const output = await analyzeScenario({
      sachverhalt: "Ich habe online bei einem Händler ein Fahrzeug gekauft. Kurz nach der Lieferung zeigt sich ein Mangel und das Auto funktioniert nicht.",
      perspektive: "kläger",
      tiefe: "vollständig",
    });

    expect(output).toContain("§ 477 Abs. 1 BGB — Beweislastumkehr");
    expect(output).toContain("Verbrauchsgüterkauf");
  });
});
