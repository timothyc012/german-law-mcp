import { describe, expect, it } from "vitest";
import { gradeSource } from "../src/lib/source-grade.js";

describe("gradeSource", () => {
  it("grades official primary-law hosts as A", () => {
    const result = gradeSource("https://www.gesetze-im-internet.de/bgb/__195.html", "§ 195 BGB");

    expect(result.grade).toBe("A");
    expect(result.isPrimary).toBe(true);
    expect(result.matchedDomain).toBe("gesetze-im-internet.de");
    expect(result.verifiedAt).toMatch(/Z$/);
  });

  it("does not trust a hostname that merely contains an official domain", () => {
    const result = gradeSource("https://gesetze-im-internet.de.attacker.example/bgb");

    expect(result.grade).toBe("D");
    expect(result.isPrimary).toBe(false);
    expect(result.matchedDomain).toBeUndefined();
  });

  it("returns an auditable D grade for malformed URLs", () => {
    const result = gradeSource("not a url");

    expect(result.grade).toBe("D");
    expect(result.gradeReason).toContain("유효한 URL");
    expect(result.verifiedAt).toMatch(/Z$/);
  });
});
