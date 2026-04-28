import { describe, expect, it } from "vitest";

import { parseNeurisCollection } from "../../src/lib/neuris-client.js";

describe("parseNeurisCollection", () => {
  it("accepts valid collection responses with additional upstream fields", () => {
    const parsed = parseNeurisCollection({
      totalItems: 1,
      member: [{ item: { name: "BGB" } }],
      "@context": "https://example.test/context",
    }, "test search");

    expect(parsed.totalItems).toBe(1);
    expect(parsed.member).toHaveLength(1);
  });

  it("keeps missing collection fields as an empty-result compatible shape", () => {
    const parsed = parseNeurisCollection({
      "@context": "https://example.test/context",
    }, "empty-compatible search");

    expect(parsed.totalItems ?? 0).toBe(0);
    expect(parsed.member ?? []).toEqual([]);
  });

  it("fails clearly when the collection shape drifts", () => {
    expect(() => parseNeurisCollection({
      totalItems: "1",
      member: "not-an-array",
    }, "case-law search")).toThrow(
      "NeuRIS API shape changed (case-law search)",
    );
  });

  it("fails clearly when collection members drift away from objects", () => {
    expect(() => parseNeurisCollection({
      totalItems: 1,
      member: [null],
    }, "legislation search")).toThrow(
      "NeuRIS API shape changed (legislation search)",
    );
  });
});
