import { useSyncExternalStore, type FC } from "react";
import { TimerContextMenuContent } from "./timer-context-menu-content";
import type { TimerMenuRegistry } from "./timer-popups-context";

type TimerActiveContextMenuProps = {
  registry: TimerMenuRegistry;
  timerKey: string;
};

/** Menu body for the tile the grid's shared context menu is open on. */
export const TimerActiveContextMenu: FC<TimerActiveContextMenuProps> = ({
  registry,
  timerKey,
}) => {
  const props = useSyncExternalStore(registry.subscribe, () =>
    registry.get(timerKey),
  );

  return props ? <TimerContextMenuContent {...props} /> : null;
};
