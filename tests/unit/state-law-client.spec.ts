import { describe, expect, it } from "vitest";

import { extractStateLawSectionText, stripStateLawHtml } from "../../src/lib/state-law-client.js";

describe("state-law-client parsing helpers", () => {
  it("strips NRW-style HTML into readable text", () => {
    const text = stripStateLawHtml("<h1>PolG NRW</h1><p>&sect; 1 Aufgaben der Polizei</p><p>Die Polizei hat die Aufgabe...</p>");

    expect(text).toContain("§ 1 Aufgaben der Polizei");
    expect(text).toContain("Die Polizei hat die Aufgabe");
  });

  it("extracts a requested state-law section from plain text", () => {
    const text = [
      "§ 1 Aufgaben",
      "Die Polizei hat die Aufgabe, Gefahren abzuwehren.",
      "§ 2 Zuständigkeit",
      "Die Zuständigkeit richtet sich nach Landesrecht.",
    ].join("\n");

    const section = extractStateLawSectionText(text, "1");

    expect(section).toContain("§ 1 Aufgaben");
    expect(section).toContain("Gefahren abzuwehren");
    expect(section).not.toContain("§ 2 Zuständigkeit");
  });
});
