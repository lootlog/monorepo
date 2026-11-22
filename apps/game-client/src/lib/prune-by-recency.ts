export type PruneByRecencyOptions<Entry> = {
  entries: readonly Entry[];
  now: number;
  ttlMs?: number;
  cap: number;
  timestampOf: (entry: Entry) => number;
  tiebreakOf?: (entry: Entry) => number;
};

export type PruneByRecencyResult<Entry> = {
  retained: Entry[];
  evicted: Entry[];
};

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

  fresh.sort((first, second) => {
    const timeDifference = timestampOf(second) - timestampOf(first);

    if (timeDifference !== 0 || !tiebreakOf) return timeDifference;

    return tiebreakOf(second) - tiebreakOf(first);
  });

  return {
    retained: fresh.slice(0, cap),
    evicted: [...evicted, ...fresh.slice(cap)],
  };
}
