import { useSyncExternalStore } from "react";
import { subscribeToSecondClock } from "@/hooks/utils/second-clock";

const subscribeToNothing = () => () => undefined;

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
