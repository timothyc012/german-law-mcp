/**
 * 간단한 LRU 캐시 (외부 의존성 없음)
 *
 * Map의 삽입 순서를 이용하여 LRU를 구현한다.
 * TTL이 지난 항목은 조회 시 자동 삭제된다.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();

  constructor(
    private maxSize: number = 500,
    private ttlMs: number = 3_600_000, // 1시간
  ) {}

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
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
