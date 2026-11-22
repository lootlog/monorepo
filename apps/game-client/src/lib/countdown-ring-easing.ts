import { getPrefersReducedMotion } from "@lootlog/ui/hooks/use-prefers-reduced-motion";

export const getCountdownRingEasing = (remainingMs: number) =>
  getPrefersReducedMotion()
    ? `steps(${Math.max(1, Math.ceil(remainingMs / 1000))}, end)`
    : "linear";
