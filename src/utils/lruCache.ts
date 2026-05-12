/**
 * Minimal in-memory LRU cache with TTL eviction.
 *
 * - Maintains insertion order via the underlying `Map`, so the oldest entry is
 *   evicted when we exceed `maxEntries`.
 * - Each `get` refreshes recency (move-to-end) so frequently-used keys survive
 *   under pressure.
 * - Expired entries are lazily evicted on `get`.
 *
 * For multi-instance deployments, swap call sites to a Redis-backed wrapper
 * with the same shape.
 */

export interface LRUCacheOptions {
  /** Maximum number of entries before LRU eviction kicks in. Default: 64. */
  maxEntries?: number;
  /** Default TTL in milliseconds when a per-entry TTL isn't supplied. Default: 30s. */
  defaultTTLMs?: number;
}

interface CacheEntry<V> {
  value: V;
  expiresAt: number;
}

export class LRUCache<K, V> {
  private readonly maxEntries: number;
  private readonly defaultTTLMs: number;
  private readonly store = new Map<K, CacheEntry<V>>();

  constructor(options: LRUCacheOptions = {}) {
    this.maxEntries = options.maxEntries ?? 64;
    this.defaultTTLMs = options.defaultTTLMs ?? 30_000;
  }

  get(key: K): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    // Move-to-most-recently-used by re-inserting.
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V, ttlMs?: number): void {
    if (this.store.has(key)) this.store.delete(key);
    while (this.store.size >= this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTTLMs),
    });
  }

  delete(key: K): boolean {
    return this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
