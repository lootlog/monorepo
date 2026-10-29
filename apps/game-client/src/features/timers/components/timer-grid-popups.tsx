import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import type { BaseUIEvent } from "@base-ui/react/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import {
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type Ref,
  type SyntheticEvent,
} from "react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerActiveContextMenu } from "./timer-active-context-menu";
import {
  createTimerMenuRegistry,
  TIMER_POPUP_KEY_ATTRIBUTE,
  TimerPopupsContext,
} from "./timer-popups-context";
import { TimerSharedTooltip } from "./timer-shared-tooltip";

type TimerGridPopupsProps = {
  children: ReactNode;
  className?: string;
  gridRef: Ref<HTMLSpanElement>;
  guildNamesById: Record<string, string>;
  style?: CSSProperties;
  timersByKey: ReadonlyMap<string, TimerWithTimeLeft>;
};

/**
 * One tooltip and one context menu for every tile of the grid. A popup root
 * per tile cost each tile its own stores, timers and document listener on
 * mount, although a player opens at most one of them at a time.
 */
export const TimerGridPopups = ({
  children,
  className,
  gridRef,
  guildNamesById,
  style,
  timersByKey,
}: TimerGridPopupsProps) => {
  const [popups] = useState(() => ({
    menuRegistry: createTimerMenuRegistry(),
    tooltipHandle: BaseTooltip.createHandle<string>(),
  }));

  const { menuRegistry, tooltipHandle } = popups;
  const [menuTimerKey, setMenuTimerKey] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuTileRef = useRef<HTMLElement | null>(null);

  const menuProps = useSyncExternalStore(menuRegistry.subscribe, () =>
    menuTimerKey === null ? undefined : menuRegistry.get(menuTimerKey),
  );

  // A tile that leaves the grid closes its menu, as its own menu did.
  if (menuOpen && !menuProps) setMenuOpen(false);

  // Right-click, long press and the keyboard shortcut all reach the grid from
  // a tile; anywhere else in the grid keeps the menu closed.
  const selectMenuTile = (event: BaseUIEvent<SyntheticEvent<HTMLElement>>) => {
    const tile =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(`[${TIMER_POPUP_KEY_ATTRIBUTE}]`)
        : null;

    const timerKey = tile?.getAttribute(TIMER_POPUP_KEY_ATTRIBUTE);

    if (!tile || !timerKey || !event.currentTarget.contains(tile)) {
      event.preventBaseUIHandler();

      return;
    }

    menuTileRef.current = tile;
    setMenuTimerKey(timerKey);
  };

  return (
    <TimerPopupsContext.Provider value={popups}>
      <ContextMenu open={menuOpen && !!menuProps} onOpenChange={setMenuOpen}>
        <ContextMenuTrigger
          asChild
          onContextMenu={selectMenuTile}
          onTouchStart={selectMenuTile}
        >
          <span ref={gridRef} className={className} style={style}>
            {children}
          </span>
        </ContextMenuTrigger>

        <ContextMenuContent
          className="ll:w-48 ll:flex ll:flex-col"
          finalFocus={() => menuTileRef.current}
        >
          {menuTimerKey !== null && (
            <TimerActiveContextMenu
              registry={menuRegistry}
              timerKey={menuTimerKey}
            />
          )}
        </ContextMenuContent>
      </ContextMenu>

      <Tooltip handle={tooltipHandle}>
        {({ payload }) => {
          const timer =
            payload === undefined ? undefined : timersByKey.get(payload);

          return timer ? (
            <TooltipContent className="ll:w-64 ll:max-w-64">
              <TimerSharedTooltip
                timer={timer}
                guildNamesById={guildNamesById}
              />
            </TooltipContent>
          ) : null;
        }}
      </Tooltip>
    </TimerPopupsContext.Provider>
  );
};
