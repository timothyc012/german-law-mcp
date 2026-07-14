import { describe, expect, it } from "vitest";

import { loadLawIndexConfig } from "../../src/lib/law-index/config.js";

describe("loadLawIndexConfig", () => {
  it("uses safe live-mode defaults", () => {
    expect(loadLawIndexConfig({})).toEqual({
      mode: "live",
      indexPath: undefined,
      liveVerify: true,
      maxVerify: 3,
    });
  });

  it("parses explicit indexed configuration", () => {
    expect(
      loadLawIndexConfig({
        GERMAN_LAW_INDEX_MODE: "indexed",
        GERMAN_LAW_INDEX_PATH: "./law-index.sqlite",
        GERMAN_LAW_LIVE_VERIFY: "false",
        GERMAN_LAW_INDEX_MAX_VERIFY: "10",
      }),
    ).toEqual({
      mode: "indexed",
      indexPath: "./law-index.sqlite",
      liveVerify: false,
      maxVerify: 10,
    });
  });

  it("throws for invalid index modes", () => {
    expect(() => loadLawIndexConfig({ GERMAN_LAW_INDEX_MODE: "offline" })).toThrow(
      /Invalid GERMAN_LAW_INDEX_MODE/,
    );
  });

  it("throws for blank boolean values", () => {
    expect(() => loadLawIndexConfig({ GERMAN_LAW_LIVE_VERIFY: " " })).toThrow(
      /Invalid GERMAN_LAW_LIVE_VERIFY/,
    );
  });

  it("throws for invalid max verify values", () => {
    expect(() => loadLawIndexConfig({ GERMAN_LAW_INDEX_MAX_VERIFY: "3.5" })).toThrow(
      /Invalid GERMAN_LAW_INDEX_MAX_VERIFY/,
    );
  });
});
