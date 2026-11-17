import { useSyncExternalStore } from "react";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

const subscribeToNothing = () => () => undefined;

/**
 * Reads a time-dependent value on the shared second clock. `read` runs on every
 * tick and render, so it must return a primitive that stays equal until the
 * displayed value changes. A disabled clock reads once per render without
 * ticking.
 */
export const useSecondClockValue = <
  Value extends string | number | boolean | null,
>(
  read: () => Value,
  enabled = true,
): Value =>
  useSyncExternalStore(
    enabled ? subscribeToSecondClock : subscribeToNothing,
    read,
  );
