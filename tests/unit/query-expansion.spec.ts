import { describe, expect, it } from "vitest";

import { expandLegalQuery } from "../../src/lib/query-expansion.js";

describe("expandLegalQuery", () => {
  it("expands Korean used-car defect descriptions into German legal search terms", () => {
    const expansion = expandLegalQuery("중고차 샀는데 고장남");

    expect(expansion.wasExpanded).toBe(true);
    expect(expansion.expandedQuery).toContain("Gebrauchtwagen");
    expect(expansion.expandedQuery).toContain("Sachmangel");
    expect(expansion.expandedQuery).toContain("§ 437 BGB");
  });

  it("uses concept-map matches for German legal-ish phrasing", () => {
    const expansion = expandLegalQuery("Miete wegen Schimmel kürzen");

    expect(expansion.wasExpanded).toBe(true);
    expect(expansion.expandedQuery).toContain("Mietminderung");
    expect(expansion.reasons.some((reason) => reason.includes("concept map"))).toBe(true);
  });

  it("leaves unrelated queries unchanged", () => {
    const expansion = expandLegalQuery("Bundesgericht Aktenzeichen");

    expect(expansion.wasExpanded).toBe(false);
    expect(expansion.expandedQuery).toBe("Bundesgericht Aktenzeichen");
  });

  it.each([
    ["교통사고 보험 처리", "§ 7 StVG"],
    ["비자 거절 이의신청", "§ 70 VwGO"],
    ["GmbH 대표 책임 파산 지연", "§ 15a InsO"],
    ["온라인 주문 구독 취소", "§ 355 BGB"],
  ])("expands %s", (query, expectedTerm) => {
    const expansion = expandLegalQuery(query);

    expect(expansion.wasExpanded).toBe(true);
    expect(expansion.expandedQuery).toContain(expectedTerm);
  });
});
