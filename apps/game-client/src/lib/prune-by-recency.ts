export type PruneByRecencyOptions<Entry> = {
  entries: readonly Entry[];
  /** Reference instant the TTL is measured from. */
  now: number;
  /**
   * Maximum age an entry may reach before it is dropped. An entry is expired
   * when `now - timestampOf(entry) > ttlMs`; a timestamp in the future is
   * never expired. Omit to cap without a TTL.
   */
  ttlMs?: number;
  /** Maximum number of entries kept after the TTL sweep. */
  cap: number;
  timestampOf: (entry: Entry) => number;
  /**
   * Secondary ordering for entries sharing a timestamp. Higher wins, so a
   * monotonic counter (storage position, observation sequence) keeps the most
   * recently written entry.
   */
  tiebreakOf?: (entry: Entry) => number;
};

export type PruneByRecencyResult<Entry> = {
  /** Newest first, at most `cap` entries. */
  retained: Entry[];
  /** Entries dropped by the TTL sweep or by the cap, in input order. */
  evicted: Entry[];
};

/**
 * Shared bounded-cache eviction: drop entries older than the TTL, then keep
 * the newest `cap` survivors. Every per-character, per-room and per-request
 * cache in the game client is bounded this way so a long session cannot grow
 * without limit.
 */
export function pruneByRecency<Entry>({
  entries,
  now,
  ttlMs,
  cap,
  timestampOf,
  tiebreakOf,
}: PruneByRecencyOptions<Entry>): PruneByRecencyResult<Entry> {
  const fresh: Entry[] = [];
  const evicted: Entry[] = [];

  for (const entry of entries) {
    if (ttlMs !== undefined && now - timestampOf(entry) > ttlMs) {
      evicted.push(entry);
      continue;
    }

    fresh.push(entry);
  }

  const ordered = fresh.toSorted((first, second) => {
    const timeDifference = timestampOf(second) - timestampOf(first);

    if (timeDifference !== 0 || !tiebreakOf) return timeDifference;

    return tiebreakOf(second) - tiebreakOf(first);
  });

  return {
    retained: ordered.slice(0, cap),
    evicted: [...evicted, ...ordered.slice(cap)],
  };
}
