import { useEffect, useState } from "react";

const RANK_CHANGE_SHOWN_MS = 4000;

export function useRankChange(rank: number) {
  const [change, setChange] = useState({ rank, places: 0 });

  if (change.rank !== rank) {
    setChange({ rank, places: change.rank - rank });
  }

  useEffect(() => {
    if (change.places === 0) return;

    const timeout = setTimeout(
      () => setChange(({ rank: current }) => ({ rank: current, places: 0 })),
      RANK_CHANGE_SHOWN_MS,
    );

    return () => clearTimeout(timeout);
  }, [change]);

  return change.places;
}
