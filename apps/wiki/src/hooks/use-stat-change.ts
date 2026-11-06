import { useEffect, useState } from "react";
import { useAnimatedNumber } from "@/hooks/use-animated-number";

// How long a change to the set stays shown beside the stat it moved.
const CHANGE_SHOWN_MS = 2500;

/**
 * A summed stat as it glides to a new total, and the change that moved it,
 * shown for a while after the set changes. While the set loads its total is
 * not yet the set's, so the last loaded one stays; the first load shows the
 * stats, not a gain.
 */
export const useStatChange = (total: number, isLoaded: boolean) => {
  const [settled, setSettled] = useState(isLoaded ? total : null);
  const [change, setChange] = useState({ amount: 0, id: 0 });

  if (isLoaded && total !== settled) {
    setSettled(total);

    if (settled !== null) {
      setChange(({ id }) => ({ amount: total - settled, id: id + 1 }));
    }
  }

  const target = settled ?? total;
  const value = useAnimatedNumber(target);

  useEffect(() => {
    if (change.amount === 0) return;

    const timeout = setTimeout(
      () => setChange(({ id }) => ({ amount: 0, id })),
      CHANGE_SHOWN_MS,
    );

    return () => clearTimeout(timeout);
  }, [change]);

  // The animation passes through fractions; whole-point stats stay whole.
  const shownValue = Number.isInteger(target)
    ? Math.round(value)
    : Math.round(value * 100) / 100;

  return { value: shownValue, change: change.amount };
};
