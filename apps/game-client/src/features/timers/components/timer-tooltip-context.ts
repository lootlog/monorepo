import type { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { createContext, useContext } from "react";

/** The grid's shared tooltip; a tile attaches to it with its key as payload. */
export const TimerTooltipContext =
  createContext<BaseTooltip.Handle<string> | null>(null);

export const useTimerTooltipHandle = () => {
  const handle = useContext(TimerTooltipContext);

  if (!handle) {
    throw new Error("useTimerTooltipHandle requires TimerGridPopups");
  }

  return handle;
};
