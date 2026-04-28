import { describe, expect, it } from "vitest";

import {
  parseNeurisCollection,
  parseNeurisCourts,
  parseNeurisObject,
} from "../../src/lib/neuris-client.js";

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

  it("fails clearly when collection member text matches drift away from arrays", () => {
    expect(() => parseNeurisCollection({
      totalItems: 1,
      member: [{ item: {}, textMatches: "not-an-array" }],
    }, "case-law search")).toThrow(
      "NeuRIS API shape changed (case-law search)",
    );
  });
});

describe("parseNeurisObject", () => {
  it("accepts object-shaped single-resource responses", () => {
    const parsed = parseNeurisObject({
      documentNumber: "JURE123",
      headline: "Example",
    }, "case-law meta");

    expect(parsed.documentNumber).toBe("JURE123");
  });

  it("fails clearly when a single-resource response is not an object", () => {
    expect(() => parseNeurisObject(null, "case-law meta")).toThrow(
      "NeuRIS API shape changed (case-law meta)",
    );
  });
});

describe("parseNeurisCourts", () => {
  it("accepts the expected courts payload", () => {
    const parsed = parseNeurisCourts([
      { id: "BGH", count: 1, label: "Bundesgerichtshof" },
    ], "case-law courts");

    expect(parsed[0]?.id).toBe("BGH");
  });

  it("fails clearly when the courts payload drifts", () => {
    expect(() => parseNeurisCourts([
      { id: "BGH", count: "1", label: "Bundesgerichtshof" },
    ], "case-law courts")).toThrow(
      "NeuRIS API shape changed (case-law courts)",
    );
  });
});
