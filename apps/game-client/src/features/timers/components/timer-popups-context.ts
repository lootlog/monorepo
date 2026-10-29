import type { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { createContext, useContext } from "react";
import type { TimerContextMenuContentProps } from "./timer-context-menu-content";

/** Marks a tile as the target of the grid's shared context menu. */
export const TIMER_POPUP_KEY_ATTRIBUTE = "data-timer-popup-key";

type Listener = () => void;

/**
 * The menu props each tile publishes for the grid's single context menu. A
 * tile keeps its own actions and their in-flight state; the open menu reads
 * the latest props of the tile it was opened on.
 */
export const createTimerMenuRegistry = () => {
  const entries = new Map<string, TimerContextMenuContentProps>();
  const listeners = new Set<Listener>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: (key: string) => entries.get(key),
    set: (key: string, props: TimerContextMenuContentProps) => {
      if (entries.get(key) === props) return;
      entries.set(key, props);
      notify();
    },
    delete: (key: string) => {
      if (!entries.delete(key)) return;
      notify();
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
};

export type TimerMenuRegistry = ReturnType<typeof createTimerMenuRegistry>;

type TimerPopups = {
  menuRegistry: TimerMenuRegistry;
  tooltipHandle: BaseTooltip.Handle<string>;
};

export const TimerPopupsContext = createContext<TimerPopups | null>(null);

export const useTimerPopups = () => {
  const popups = useContext(TimerPopupsContext);

  if (!popups) {
    throw new Error("useTimerPopups requires TimerGridPopups");
  }

  return popups;
};
