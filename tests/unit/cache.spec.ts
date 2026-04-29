import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { LRUCache } from "../../src/lib/cache.js";

const dirs: string[] = [];

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("LRUCache persistence", () => {
  it("hydrates unexpired entries from disk when persistence is enabled", () => {
    const cacheDir = mkdtempSync(join(tmpdir(), "german-law-cache-"));
    dirs.push(cacheDir);

    const first = new LRUCache<string>(10, 60_000, { persistenceName: "test", cacheDir });
    first.set("bgb-433", "Kaufvertrag");

    const second = new LRUCache<string>(10, 60_000, { persistenceName: "test", cacheDir });

    expect(second.get("bgb-433")).toBe("Kaufvertrag");
  });

  it("does not require persistence for normal memory-only use", () => {
    const cache = new LRUCache<string>(1, 60_000);

    cache.set("a", "1");
    cache.set("b", "2");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
  });
});
