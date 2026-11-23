import { useEffect, useState } from "react";
import { useAnimatedNumber } from "@lootlog/ui/hooks/use-animated-number";

const CHANGE_SHOWN_MS = 2500;

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

  const shownValue = Number.isInteger(target)
    ? Math.round(value)
    : Math.round(value * 100) / 100;

  return { value: shownValue, change: change.amount };
};
