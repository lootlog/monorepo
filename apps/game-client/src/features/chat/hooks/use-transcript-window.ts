import { useState } from "react";

/**
 * Rows mounted at once when the transcript opens and added per reveal. A
 * screenful is about 15–30 rows; mounting all 500 retained rows took 317 ms
 * of main thread at a 6x CPU slowdown, and that render is synchronous.
 */
export const TRANSCRIPT_WINDOW_PAGE_SIZE = 50;

/**
 * Mounts only the newest rows and grows toward older history on request.
 * The window is pinned to its first row's key, so appended messages extend it
 * without unmounting rows the reader may be looking at. When that row leaves
 * the list (eviction, deletion, a replaced list), the window falls back to the
 * newest page.
 */
export function useTranscriptWindow<Row extends { key: string }>(
  rows: readonly Row[],
  /** A row the first window must include, such as a restored position. */
  initialIndex = -1,
) {
  const [startKey, setStartKey] = useState<string | null>(null);

  const pinnedIndex =
    startKey === null ? -1 : rows.findIndex((row) => row.key === startKey);

  let start = pinnedIndex;

  if (start === -1) {
    start = Math.max(0, rows.length - TRANSCRIPT_WINDOW_PAGE_SIZE);

    if (initialIndex !== -1) start = Math.min(start, initialIndex);
  }

  const firstKey = rows[start]?.key ?? null;

  if (firstKey !== null && firstKey !== startKey) setStartKey(firstKey);

  const revealFrom = (index: number) => {
    const key = rows[Math.max(0, index)]?.key;

    if (key !== undefined && index < start) setStartKey(key);
  };

  return {
    hasOlder: start > 0,
    rows: start === 0 ? rows : rows.slice(start),
    /** Mounts the rows from `index` on; returns whether they were hidden. */
    reveal: (index: number) => {
      revealFrom(index);

      return index < start;
    },
    revealOlder: () => revealFrom(start - TRANSCRIPT_WINDOW_PAGE_SIZE),
  };
}
