import { useState } from "react";

/**
 * Rows mounted at once when the transcript opens and added per reveal. A
 * screenful is about 15–30 rows; mounting all 500 retained rows took 317 ms
 * of main thread at a 6x CPU slowdown, and that render is synchronous.
 */
const TRANSCRIPT_WINDOW_PAGE_SIZE = 50;

const anchorKeysFrom = (rows: readonly { key: string }[], start: number) =>
  rows.slice(start, start + TRANSCRIPT_WINDOW_PAGE_SIZE).map((row) => row.key);

/**
 * Mounts only the newest rows and grows toward older history on request.
 * The window is pinned to the keys of its first rows, so appended messages
 * extend it without unmounting rows the reader may be looking at, and evicting
 * or deleting its first row moves the start to the next surviving one. Only
 * when none survive, as with a replaced list, does it reopen at the newest
 * page.
 */
export function useTranscriptWindow<Row extends { key: string }>(
  rows: readonly Row[],
  /** A row the first window must include, such as a restored position. */
  initialIndex = -1,
) {
  const [anchorKeys, setAnchorKeys] = useState<readonly string[] | null>(null);

  let start = -1;

  for (const key of anchorKeys ?? []) {
    start = rows.findIndex((row) => row.key === key);

    if (start !== -1) break;
  }

  if (start === -1) {
    start = Math.max(0, rows.length - TRANSCRIPT_WINDOW_PAGE_SIZE);

    if (anchorKeys === null && initialIndex !== -1)
      start = Math.min(start, initialIndex);
  }

  const firstKey = rows[start]?.key;

  if (firstKey !== undefined && firstKey !== anchorKeys?.[0])
    setAnchorKeys(anchorKeysFrom(rows, start));

  const revealFrom = (index: number) => {
    if (index < start && rows.length > 0)
      setAnchorKeys(anchorKeysFrom(rows, Math.max(0, index)));
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
