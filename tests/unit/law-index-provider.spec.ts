import { describe, expect, it } from "vitest";

import { createLawIndexProvider, NoopLawIndexProvider } from "../../src/lib/law-index/provider.js";

describe("createLawIndexProvider", () => {
  it("returns an unavailable noop provider in live mode", async () => {
    const provider = createLawIndexProvider({ mode: "live", liveVerify: true, maxVerify: 3 });

    expect(provider).toBeInstanceOf(NoopLawIndexProvider);
    expect(provider.getMetadata()).toMatchObject({
      name: "noop-law-index",
      mode: "live",
      available: false,
    });
    await expect(provider.searchLaws("BGB")).resolves.toEqual([]);
    await expect(provider.getSection("BGB", "433")).resolves.toBeNull();
  });

  it.each(["indexed", "hybrid"] as const)("throws clearly for %s mode", (mode) => {
    expect(() => createLawIndexProvider({ mode, liveVerify: true, maxVerify: 3 })).toThrow(
      /indexed provider not implemented yet/,
    );
  });
});
