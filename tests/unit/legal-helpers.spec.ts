import { describe, expect, it } from "vitest";

import { searchConceptMap } from "../../src/lib/concept-map.js";
import { extractCrossReferences, formatCrossReferences } from "../../src/lib/cross-references.js";
import {
  getBussUndBettag,
  getDritterWerktagDesMonats,
  getFeiertageDates,
  parseIsoCalendarDate,
} from "../../src/tools/calculate-frist.js";
import {
  courtMatches,
  normalizeAktenzeichen,
  parseCitation,
} from "../../src/tools/verify-citation.js";

describe("calculate-frist helpers", () => {
  it("parses valid ISO calendar dates and rejects impossible ones", () => {
    expect(parseIsoCalendarDate("2024-02-29")?.toISOString()).toContain("2024-02-29");
    expect(parseIsoCalendarDate("2024-02-30")).toBeNull();
    expect(parseIsoCalendarDate("2024-13-01")).toBeNull();
  });

  it("calculates Buß- und Bettag for Sachsen correctly", () => {
    const bussUndBettag = getBussUndBettag(2025);
    expect(bussUndBettag.getFullYear()).toBe(2025);
    expect(bussUndBettag.getMonth()).toBe(10);
    expect(bussUndBettag.getDate()).toBe(19);
  });

  it("includes state-specific holidays such as Frauentag in Brandenburg 2025", () => {
    const holidays = getFeiertageDates(2025, "BB");
    expect(holidays.has("2025-03-08")).toBe(true);
    expect(holidays.has("2025-10-31")).toBe(true);
  });

  it("finds the third working day for tenant notice calculations", () => {
    const thirdWorkingDay = getDritterWerktagDesMonats(2025, 4, "NW");
    expect(thirdWorkingDay.toISOString()).toContain("2025-05-05");
  });
});

describe("verify-citation helpers", () => {
  it("normalizes Aktenzeichen punctuation and whitespace", () => {
    expect(normalizeAktenzeichen("IX ZR 123/22")).toBe("ix zr 123/22");
    expect(normalizeAktenzeichen("IX-ZR 123 / 22")).toBe("ix zr 123/22");
  });

  it("matches court names across umlaut and alias variants", () => {
    expect(courtMatches("OLG Köln", "Oberlandesgericht Koeln")).toBe(true);
    expect(courtMatches("LG München", "Landgericht Muenchen I")).toBe(true);
    expect(courtMatches("OLG Hamburg", "Landgericht Hamburg")).toBe(false);
  });

  it("parses Aktenzeichen and BeckRS citations", () => {
    expect(parseCitation("BGH, Urt. v. 12.03.2023 – IX ZR 123/22")).toMatchObject({
      typ: "aktenzeichen",
      gericht: "BGH",
      datum: "2023-03-12",
      aktenzeichen: "IX ZR 123/22",
    });

    expect(parseCitation("BeckRS 2023, 12345")).toMatchObject({
      typ: "beckrs",
      beckrsNr: "2023, 12345",
    });
  });
});

describe("concept map and cross references", () => {
  it("returns Kaufrecht norms for Sachmangel queries", () => {
    const matches = searchConceptMap("Sachmangel beim Gebrauchtwagenkauf mit Nacherfüllung");
    expect(matches[0]?.entry.norm).toBe("§ 434 BGB");
    expect(matches.some((match) => match.entry.norm === "§ 439 BGB")).toBe(true);
  });

  it("extracts statutes, EU references and case citations from mixed text", () => {
    const refs = extractCrossReferences(
      "Nach § 823 Abs. 1 BGB, Art. 6 Abs. 1 lit. a DSGVO und BGH, Urt. v. 12.03.2023 – IX ZR 123/22 gilt dies entsprechend.",
    );

    expect(refs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "statute", normalized: "§ 823 Abs. 1 BGB" }),
        expect.objectContaining({ type: "eu_regulation", normalized: "Art. 6 Abs. 1 lit. a DSGVO" }),
        expect.objectContaining({ type: "caselaw", normalized: "BGH 12.03.2023 IX ZR 123/22" }),
      ]),
    );
  });

  it("formats extracted references by category", () => {
    const output = formatCrossReferences([
      { type: "statute", law: "BGB", section: "823", normalized: "§ 823 BGB", display: "§ 823 BGB" },
      { type: "eu_regulation", law: "DSGVO", section: "6", normalized: "Art. 6 DSGVO", display: "Art. 6 DSGVO" },
      { type: "caselaw", law: "BGH", section: "IX ZR 123/22", normalized: "BGH 12.03.2023 IX ZR 123/22", display: "BGH, Urt. v. 12.03.2023 – IX ZR 123/22" },
    ]);

    expect(output).toContain("📚 법령 교차참조:");
    expect(output).toContain("🇪🇺 EU 규정 교차참조:");
    expect(output).toContain("⚖️ 판례 교차참조:");
  });
});
