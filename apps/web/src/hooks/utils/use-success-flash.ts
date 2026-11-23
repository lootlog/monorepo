import { useEffect, useState } from "react";

const SUCCESS_SHOWN_MS = 1200;

export function useSuccessFlash() {
  const [shown, setShown] = useState(false);

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- timer that hides the success flash
  useEffect(() => {
    if (!shown) return;

    const timeout = setTimeout(() => setShown(false), SUCCESS_SHOWN_MS);

    return () => clearTimeout(timeout);
  }, [shown]);

  return { shown, flash: () => setShown(true) };
}
