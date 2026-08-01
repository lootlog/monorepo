import { useEffect, useState } from "react";
import { setMeasuredTimeout } from "@/lib/performance-monitoring/measured-callback";

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

    const timeoutId = setMeasuredTimeout(
      "hook.delayed-visibility",
      () => {
        setVisible(true);
      },
      delayMs,
    );

    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);

  return visible;
};
