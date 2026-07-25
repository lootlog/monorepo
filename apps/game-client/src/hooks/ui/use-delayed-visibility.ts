import { useEffect, useState } from "react";

const DEFAULT_VISIBILITY_DELAY_MS = 200;

export const useDelayedVisibility = (
  active: boolean,
  delayMs = DEFAULT_VISIBILITY_DELAY_MS,
) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setVisible(true);
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);

  return visible;
};
