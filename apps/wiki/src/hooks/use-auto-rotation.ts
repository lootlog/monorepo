import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

export const useAutoRotation = (
  keys: readonly string[],
  intervalMs: number,
) => {
  const [pickedKey, setPickedKey] = useState<string>();
  const [isStopped, setIsStopped] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const activeKey =
    pickedKey !== undefined && keys.includes(pickedKey) ? pickedKey : keys[0];

  const canRotate = keys.length > 1 && !prefersReducedMotion;
  const isRotating = canRotate && !isStopped && !isHeld;
  const rotationKeys = keys.join("\n");

  // oxlint-disable-next-line lootlog/no-unreasoned-state-sync -- runs the rotation timer while the carousel is mounted and not paused
  useEffect(() => {
    if (!isRotating) return;

    const order = rotationKeys.split("\n");

    const timer = setInterval(() => {
      setPickedKey((current) => {
        const index = order.indexOf(current ?? order[0] ?? "");

        return order[(index + 1) % order.length];
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRotating, rotationKeys, intervalMs]);

  return {
    activeKey,
    canRotate,
    isRotating,
    isStopped,
    pick: (key: string) => {
      setPickedKey(key);
      setIsStopped(true);
    },
    toggle: () => setIsStopped((stopped) => !stopped),
    hold: () => setIsHeld(true),
    release: () => setIsHeld(false),
  };
};
