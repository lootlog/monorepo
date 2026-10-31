import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { SharedContextMenu } from "@/components/common/shared-context-menu";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { useState, type CSSProperties, type ReactNode, type Ref } from "react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerTooltipContext } from "./timer-tooltip-context";
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
  const [tooltipHandle] = useState(() => BaseTooltip.createHandle<string>());

  return (
    <TimerTooltipContext.Provider value={tooltipHandle}>
      <SharedContextMenu>
        <span ref={gridRef} className={className} style={style}>
          {children}
        </span>
      </SharedContextMenu>

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
    </TimerTooltipContext.Provider>
  );
};
