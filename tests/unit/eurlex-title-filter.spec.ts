import { describe, expect, it } from "vitest";

import { buildEurLexTitleFilter } from "../../src/lib/eurlex-client.js";

describe("buildEurLexTitleFilter", () => {
  it("turns every word of the query into an AND-ed full-text term instead of one whole-phrase substring", () => {
    expect(buildEurLexTitleFilter("IFRS 18 Verordnung")).toBe(`?title bif:contains '"IFRS" AND "18" AND "Verordnung"' .`);
  });

  it("keeps letters and digits only, so quotes and operators cannot escape the literal", () => {
    expect(buildEurLexTitleFilter(`Daten"schutz\\ \nGrund' OR x`)).toBe(
      `?title bif:contains '"Daten" AND "schutz" AND "Grund" AND "OR" AND "x"' .`,
    );
  });

  it("splits hyphenated words and keeps umlauts", () => {
    expect(buildEurLexTitleFilter("Datenschutz-Grundverordnung Übernahme")).toBe(
      `?title bif:contains '"Datenschutz" AND "Grundverordnung" AND "Übernahme"' .`,
    );
  });

  it("matches nothing for an empty query", () => {
    expect(buildEurLexTitleFilter("   ")).toBe("FILTER(false)");
  });
});
