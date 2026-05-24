import { describe, expect, it } from "vitest";

import { reviewNda, reviewNdaSchema } from "../../src/tools/review-nda.js";

describe("review-nda", () => {
  it("flags cross-border NDA review items and emits dispatcher payload", async () => {
    const output = await reviewNda({
      text:
        "This Non-Disclosure Agreement is governed by German law. The receiving party may use confidential information for evaluation only. " +
        "A GmbH and 주식회사 exchange personal data under this NDA. The seat of arbitration shall be London.",
      role: "receiving",
      jurisdictions: ["DE", "EU", "KR"],
      language: "both",
    });

    expect(output).toContain("NDA-Review");
    expect(output).toContain("Cross-Border Trigger");
    expect(output).toContain("foreignSeatArbitration");
    expect(output).toContain("multiJurisdictionParties");
    expect(output).toContain("Dispatcher-Payload");
  });

  it("rejects oversized NDA input before analysis", () => {
    const parsed = reviewNdaSchema.safeParse({
      text: "x".repeat(120_001),
      role: "receiving",
      jurisdictions: ["DE"],
      language: "de",
    });

    expect(parsed.success).toBe(false);
  });
});
