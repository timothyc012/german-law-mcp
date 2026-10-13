import { describe, expect, it } from "vitest";

import { parseBmfListEntries } from "../../src/lib/bmf-client.js";

// Shape of the BMF-Schreiben list page since the 2026 relaunch
// (SiteGlobals/Forms/Listen/DE/BMF_Schreiben/BMF_Schreiben_Formular.html).
const LIST_HTML = `
<ol class="bmf-list bmf-list--search">
  <li class="bmf-list-entry bmf-list-entry--highlight">
    <div class="bmf-entry">
      <h3 class="bmf-entry-title">
        <a href="Web/DE/Themen/Steuern/steuern.html" class="bmf-resultlist-teaser-link"><span> Steuern </span></a>
      </h3>
      <div class="bmf-entry-footer"><div class="bmf-badge"><span class="bmf-badge-text"> Artikel</span></div></div>
    </div>
  </li>
  <li class="bmf-list-entry">
    <div class="bmf-entry">
      <h3 class="bmf-entry-title">
        <span class="bmf-labelbox"><span class="bmf-labelbox-text"> Umsatzsteuer</span></span>
        <a href="Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/2025-10-15-e-rechnung.html" class="bmf-resultlist-teaser-link">
          <span>Ausstellung von Rechnungen nach <abbr title="Paragraf">§</abbr> 14 UStG; elektronische Rechnung</span>
        </a>
      </h3>
      <div class="bmf-entry-footer">
        <div class="bmf-date"><time datetime="2025-10-15T00:00"> 15.10.2025</time></div>
        <div class="bmf-badge"><span class="bmf-badge-text"> BMF-Schreiben</span></div>
        <div class="bmf-entry-iconWrapper"><a href="Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/2025-10-15-e-rechnung.html" class="bmf-link bmf-link--more">Mehr erfahren</a></div>
      </div>
    </div>
  </li>
</ol>`;

describe("parseBmfListEntries", () => {
  it("extracts title, absolute url, ISO date and badge from each list entry", () => {
    const entries = parseBmfListEntries(LIST_HTML);

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ title: "Steuern", badge: "Artikel", date: "" });
    expect(entries[1]).toEqual({
      title: "Ausstellung von Rechnungen nach § 14 UStG; elektronische Rechnung",
      url: "https://www.bundesfinanzministerium.de/Content/DE/Downloads/BMF_Schreiben/Steuerarten/Umsatzsteuer/2025-10-15-e-rechnung.html",
      date: "2025-10-15",
      badge: "BMF-Schreiben",
    });
  });

  it("returns an empty list when the page has no result entries", () => {
    expect(parseBmfListEntries("<html><body><p>Keine Treffer</p></body></html>")).toEqual([]);
  });
});
