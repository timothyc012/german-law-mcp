/**
 * 간단한 LRU 캐시 (외부 의존성 없음)
 *
 * Map의 삽입 순서를 이용하여 LRU를 구현한다.
 * TTL이 지난 항목은 조회 시 자동 삭제된다.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

interface CacheOptions {
  persistenceName?: string;
  cacheDir?: string;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly persistencePath: string | null;

  constructor(
    private maxSize: number = 500,
    private ttlMs: number = 3_600_000, // 1시간
    options: CacheOptions = {},
  ) {
    this.persistencePath = options.persistenceName
      ? join(
          options.cacheDir ?? process.env.GERMAN_LAW_MCP_CACHE_DIR ?? join(process.cwd(), ".cache", "german-law-mcp"),
          `${safeFileName(options.persistenceName)}.json`,
        )
      : null;
    this.loadPersistentEntries();
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // TTL 만료 확인
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    // LRU: 재삽입하여 순서를 맨 뒤로 이동
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T): void {
    // 이미 존재하면 삭제 (재삽입으로 순서 갱신)
    this.cache.delete(key);

    // 용량 초과 시 가장 오래된(맨 앞) 항목 삭제
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
    this.persistEntries();
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
    this.persistEntries();
  }

  get size(): number {
    return this.cache.size;
  }

  private loadPersistentEntries(): void {
    if (!this.persistencePath || !existsSync(this.persistencePath)) {
      return;
    }

    try {
      const raw = JSON.parse(readFileSync(this.persistencePath, "utf8")) as Array<[string, CacheEntry<T>]>;
      const now = Date.now();
      for (const [key, entry] of raw) {
        if (entry.expiresAt > now) {
          this.cache.set(key, entry);
        }
      }
      trimToMaxSize(this.cache, this.maxSize);
    } catch {
      this.cache.clear();
    }
  }

  private persistEntries(): void {
    if (!this.persistencePath) {
      return;
    }

    try {
      mkdirSync(dirname(this.persistencePath), { recursive: true });
      writeFileSync(this.persistencePath, JSON.stringify([...this.cache.entries()]), "utf8");
    } catch {
      // Cache persistence is best-effort; runtime correctness must not depend on disk writes.
    }
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
}

function trimToMaxSize<T>(cache: Map<string, CacheEntry<T>>, maxSize: number): void {
  while (cache.size > maxSize) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) {
      return;
    }
    cache.delete(oldest);
  }
}
