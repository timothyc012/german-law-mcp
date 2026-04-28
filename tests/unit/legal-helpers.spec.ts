import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchConceptMap } from "../../src/lib/concept-map.js";
import { extractCrossReferences, formatCrossReferences } from "../../src/lib/cross-references.js";
import {
  courtMatches,
  normalizeAktenzeichen,
  parseCitation,
} from "../../src/tools/verify-citation.js";

const mockSearchLegislation = vi.fn();
const mockSearchTocByAbbreviation = vi.fn();

async function loadSearchLaw() {
  vi.doMock("../../src/lib/neuris-client.js", () => ({
    searchLegislation: mockSearchLegislation,
  }));
  vi.doMock("../../src/lib/gii-client.js", () => ({
    searchTocByAbbreviation: mockSearchTocByAbbreviation,
  }));

  return import("../../src/tools/search-law.js");
}

beforeEach(() => {
  vi.resetModules();
  mockSearchLegislation.mockReset();
  mockSearchTocByAbbreviation.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verify-citation helpers", () => {
  it("normalizes Aktenzeichen punctuation and whitespace", () => {
    expect(normalizeAktenzeichen("IX ZR 123/22")).toBe("ix zr 123/22");
    expect(normalizeAktenzeichen("IX-ZR 123 / 22")).toBe("ix zr 123/22");
  });

  it("preserves Aktenzeichen suffix letters during normalization", () => {
    expect(normalizeAktenzeichen("1 BvR 456/23a")).toBe("1 bvr 456/23a");
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

  it("parses constitutional court Aktenzeichen with suffix letters", () => {
    expect(parseCitation("BVerfG 1 BvR 456/23a")).toMatchObject({
      typ: "aktenzeichen",
      aktenzeichen: "1 BvR 456/23a",
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

  it.each([
    { query: "Mietminderung wegen Schimmel", norm: "§ 536 BGB" },
    { query: "fristlose Kündigung", norm: "§ 626 BGB" },
    { query: "Sachmangel beim Autokauf", norm: "§ 434 BGB" },
    { query: "Verjährung eines Anspruchs", norm: "§ 195 BGB" },
    { query: "Schadensersatz nach Pflichtverletzung", norm: "§ 280 BGB" },
    { query: "ungerechtfertigte Bereicherung nach Fehlüberweisung", norm: "§ 812 BGB" },
    { query: "Datenschutz bei personenbezogenen Daten", norm: "Art. 6 Abs. 1 S. 1 lit. a DSGVO" },
    { query: "Bürgschaft für einen Kredit", norm: "§ 765 BGB" },
    { query: "Unterlassung wegen fortdauernder Störung", norm: "§ 1004 BGB" },
    { query: "Werkvertrag mit dem Handwerker", norm: "§ 631 BGB" },
    { query: "Kündigungsschutz im Arbeitsverhältnis", norm: "§ 1 KSchG" },
  ])("maps $query to $norm", ({ query, norm }) => {
    const matches = searchConceptMap(query);
    expect(matches[0]?.entry.norm).toBe(norm);
  });
});

describe("search-law fallback behaviour", () => {
  it("shows concept-map fallback when NeuRIS and GII return no result", async () => {
    mockSearchLegislation.mockResolvedValue({ totalItems: 0, items: [] });
    mockSearchTocByAbbreviation.mockResolvedValue(null);

    const { searchLaw } = await loadSearchLaw();
    const output = await searchLaw({ query: "Mietminderung", size: 5 });

    expect(output).toContain("NeuRIS/GII 결과 없음, 개념 매핑 결과");
    expect(output).toContain("법률 개념 사전 (Concept Map)");
    expect(output).toContain("§ 536 BGB");
  });

  it("retries legislation search with expanded legal terms for colloquial Korean queries", async () => {
    mockSearchLegislation.mockResolvedValue({ totalItems: 0, items: [] });
    mockSearchTocByAbbreviation.mockResolvedValue(null);

    const { searchLaw } = await loadSearchLaw();
    const output = await searchLaw({ query: "중고차 샀는데 고장남", size: 5 });

    expect(mockSearchLegislation).toHaveBeenCalledTimes(2);
    expect(mockSearchLegislation.mock.calls[1]?.[0]).toContain("Sachmangel");
    expect(output).toContain("검색어 확장 (Query Expansion)");
    expect(output).toContain("§ 437 BGB");
  });
});
