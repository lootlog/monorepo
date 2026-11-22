import { useState } from "react";

const TRANSCRIPT_WINDOW_PAGE_SIZE = 50;

const anchorKeysFrom = (rows: readonly { key: string }[], start: number) =>
  rows.slice(start, start + TRANSCRIPT_WINDOW_PAGE_SIZE).map((row) => row.key);

export function useTranscriptWindow<Row extends { key: string }>(
  rows: readonly Row[],
  initialIndex = -1,
) {
  const [anchorKeys, setAnchorKeys] = useState<readonly string[] | null>(null);

  let start = -1;

  if (anchorKeys !== null) {
    const indexByKey = new Map(rows.map((row, index) => [row.key, index]));

    for (const key of anchorKeys) {
      start = indexByKey.get(key) ?? -1;

      if (start !== -1) break;
    }
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
    reveal: (index: number) => {
      revealFrom(index);

      return index < start;
    },
    revealOlder: () => revealFrom(start - TRANSCRIPT_WINDOW_PAGE_SIZE),
  };
}
