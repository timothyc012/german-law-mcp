import { describe, expect, it } from "vitest";

import { chainFullResearch } from "../../src/tools/chain-full-research.js";

describe("chain-full-research", () => {
  it("returns a deterministic report shape without live source calls", async () => {
    const output = await chainFullResearch({
      topic: "Käufer verlangt Rücktritt wegen eines defekten Gebrauchtwagens nach Übergabe.",
      primary_law: "BGB",
      size: 3,
      include_live_sources: false,
      include_quality_gate: true,
    });

    expect(output).toContain("# Legal Research Report");
    expect(output).toContain("## 1. Issue Spotting");
    expect(output).toContain("## 2. Legislation Search");
    expect(output).toContain("Skipped because include_live_sources=false");
    expect(output).toContain("## 4. Quality Gate");
    expect(output).toContain("## 5. Next-Step Checklist");
  });
});
