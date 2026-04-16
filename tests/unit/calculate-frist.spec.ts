import { describe, expect, it } from "vitest";

import {
  calculateFrist,
  getBussUndBettag,
  getDritterWerktagDesMonats,
  getFeiertageDates,
  parseIsoCalendarDate,
} from "../../src/tools/calculate-frist.js";

describe("calculate-frist helpers", () => {
  it("parses valid ISO calendar dates and rejects impossible ones", () => {
    expect(parseIsoCalendarDate("2024-02-29")?.toISOString()).toContain("2024-02-29");
    expect(parseIsoCalendarDate("2024-02-30")).toBeNull();
    expect(parseIsoCalendarDate("2024-13-01")).toBeNull();
  });

  it("calculates Buß- und Bettag for Sachsen correctly", () => {
    const bussUndBettag = getBussUndBettag(2025);
    expect(bussUndBettag.getFullYear()).toBe(2025);
    expect(bussUndBettag.getMonth()).toBe(10);
    expect(bussUndBettag.getDate()).toBe(19);
  });

  it("includes state-specific holidays such as Frauentag in Brandenburg 2025", () => {
    const holidays = getFeiertageDates(2025, "BB");
    expect(holidays.has("2025-03-08")).toBe(true);
    expect(holidays.has("2025-10-31")).toBe(true);
  });

  it("finds the third working day for tenant notice calculations", () => {
    const thirdWorkingDay = getDritterWerktagDesMonats(2025, 4, "NW");
    expect(thirdWorkingDay.toISOString()).toContain("2025-05-05");
  });

  it("carries a year-end deadline into the next year on the next working day", async () => {
    const output = await calculateFrist({
      fristtyp: "revision_strafrecht",
      ereignisdatum: "2022-12-24",
      bundesland: "NW",
      alle_fristen: false,
    });

    expect(output).toContain("Rechnerisches Fristende: 31. Dezember 2022 (Samstag)");
    expect(output).toContain("✅ FRISTENDE (wirksam): 2. Januar 2023 (Montag)");
  });

  it("skips the Karfreitag to Ostermontag holiday chain", async () => {
    const output = await calculateFrist({
      fristtyp: "revision_strafrecht",
      ereignisdatum: "2023-03-31",
      bundesland: "NW",
      alle_fristen: false,
    });

    expect(output).toContain("Rechnerisches Fristende: 7. April 2023 (Freitag)");
    expect(output).toContain("gesetzlicher Feiertag in Nordrhein-Westfalen");
    expect(output).toContain("✅ FRISTENDE (wirksam): 11. April 2023 (Dienstag)");
  });
});
