import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { SharedContextMenu } from "@/components/common/shared-context-menu";
import { Tooltip, TooltipContent } from "@/components/ui/tooltip";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { TimerWithTimeLeft } from "../utils/timers-utils";
import { TimerTooltipContext } from "./timer-tooltip-context";
import { TimerSharedTooltip } from "./timer-shared-tooltip";

type TimerGridPopupsProps = {
  children: ReactNode;
  className?: string;
  guildNamesById: Record<string, string>;
  style?: CSSProperties;
  timersByKey: ReadonlyMap<string, TimerWithTimeLeft>;
};

export const TimerGridPopups = ({
  children,
  className,
  guildNamesById,
  style,
  timersByKey,
}: TimerGridPopupsProps) => {
  const [tooltipHandle] = useState(() => BaseTooltip.createHandle<string>());

  return (
    <TimerTooltipContext.Provider value={tooltipHandle}>
      <SharedContextMenu>
        <span className={className} style={style}>
          {children}
        </span>
      </SharedContextMenu>

      <Tooltip handle={tooltipHandle}>
        {({ payload }) => {
          const timer =
            payload === undefined ? undefined : timersByKey.get(payload);

          return timer ? (
            <TooltipContent className="ll:w-64 ll:max-w-64" growsWhileOpen>
              <TimerSharedTooltip
                key={payload}
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
