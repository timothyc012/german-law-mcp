import { beforeEach, describe, expect, it, vi } from "vitest";

import { getCaseLawHtml, getCaseLawMeta } from "../../src/lib/neuris-client.js";
import { getCaseText, selectCaseTextSection } from "../../src/tools/get-case-text.js";

vi.mock("../../src/lib/neuris-client.js", () => ({
  getCaseLawMeta: vi.fn(),
  getCaseLawHtml: vi.fn(),
}));

const meta = {
  documentNumber: "JURETEST",
  ecli: "ECLI:DE:BGH:2026:TEST",
  headline: "Fallback headline",
  decisionDate: "2026-04-28",
  fileNumbers: ["VIII ZR 1/26"],
  courtType: "BGH",
  courtName: "Bundesgerichtshof",
  documentType: "Urteil",
  judicialBody: "VIII. Zivilsenat",
  textMatches: [],
};

const html = `
  <h2>Leitsatz</h2>
  <p>Ein kurzer Leitsatz.</p>
  <h2>Tenor</h2>
  <p>Die Revision wird zurückgewiesen.</p>
  <h2>Tatbestand</h2>
  <p>Der Kläger kaufte ein Fahrzeug.</p>
  <h2>Entscheidungsgründe</h2>
  <p>Die Klage ist unbegründet.</p>
`;

describe("get_case_text", () => {
  beforeEach(() => {
    vi.mocked(getCaseLawMeta).mockResolvedValue(meta);
    vi.mocked(getCaseLawHtml).mockResolvedValue(html);
  });

  it("returns only the requested decision section", async () => {
    const output = await getCaseText({
      documentNumber: "JURETEST",
      section: "tenor",
      maxChars: 1000,
    });

    expect(output).toContain("요청 구간: Tenor");
    expect(output).toContain("Die Revision wird zurückgewiesen.");
    expect(output).not.toContain("Der Kläger kaufte ein Fahrzeug.");
  });

  it("paginates long full-text output with a next-call hint", async () => {
    vi.mocked(getCaseLawHtml).mockResolvedValue(`<p>${"A".repeat(1200)}</p>`);

    const output = await getCaseText({
      documentNumber: "JURETEST",
      section: "full",
      maxChars: 500,
      offset: 0,
    });

    expect(output).toContain("[Ausschnitt: Zeichen 1-500");
    expect(output).toContain("다음 구간: get_case_text");
    expect(output).toContain("offset: 500");
  });

  it("uses the headline when summary headings are unavailable", () => {
    const selected = selectCaseTextSection("Tenor\nDie Klage wird abgewiesen.", "summary", "Headline only");

    expect(selected.text).toBe("Headline only");
    expect(selected.warning).toContain("NeuRIS-Headline");
  });
});
