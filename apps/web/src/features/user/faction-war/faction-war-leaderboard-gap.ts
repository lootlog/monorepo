/**
 * Whether places are skipped after the entry at `index`: the API sends the
 * leaders and, below them, the caller's own place.
 */
export const hasFactionWarLeaderboardGapAfter = (
  entries: readonly { rank: number }[],
  index: number,
) => {
  const current = entries[index];
  const next = entries[index + 1];

  return (
    current !== undefined && next !== undefined && next.rank > current.rank + 1
  );
};
