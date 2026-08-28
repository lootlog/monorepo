import { useEffect, useState } from "react";

const DEFAULT_VISIBILITY_DELAY_MS = 200;

export const useDelayedVisibility = (
  active: boolean,
  delayMs = DEFAULT_VISIBILITY_DELAY_MS,
) => {
  const [visibility, setVisibility] = useState({ active, visible: false });
  let currentVisibility = visibility;
  if (visibility.active !== active) {
    currentVisibility = { active, visible: false };
    setVisibility(currentVisibility);
  }

  useEffect(() => {
    if (!active) return;

    const timeoutId = window.setTimeout(() => {
      setVisibility((current) =>
        current.active === active ? { ...current, visible: true } : current,
      );
    }, delayMs);

    return () => window.clearTimeout(timeoutId);
  }, [active, delayMs]);

  return currentVisibility.visible;
};
