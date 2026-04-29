import { describe, expect, it } from "vitest";

import { sourceHealthCheck } from "../../src/tools/source-health-check.js";

describe("source_health_check", () => {
  it("reports configured sources without network calls when live=false", async () => {
    const output = await sourceHealthCheck({ live: false });

    expect(output).toContain("Mode: configured metadata only");
    expect(output).toContain("NeuRIS");
    expect(output).toContain("Gesetze im Internet");
    expect(output).toContain("Summary: OK");
  });
});
