import { cn } from "cn";
import { Loader2 } from "lucide-react";
import type { FC } from "react";
import { useTimerTileModel } from "@/features/timers/hooks/use-timer-tile-model";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import { TimerTileInteractions } from "../shared/timer-tile-interactions";
import { LegacyTimerTileFace } from "./legacy-timer-tile-face";

type LegacyTimerTileProps = {
  timer: TimerWithTimeLeft;
  model: TimersWindowModel;
};

export const LegacyTimerTile: FC<LegacyTimerTileProps> = ({ timer, model }) => {
  const tile = useTimerTileModel(timer, model);
  const { displayConfig, countdownMode } = model.appearance;

  return (
    <TimerTileInteractions tile={tile} model={model}>
      <div
        className={cn("ll:relative ll:h-full", {
          "ll:opacity-50": tile.isHidden,
        })}
      >
        {tile.isPending && (
          <div className="ll:absolute ll:inset-0 ll:flex ll:items-center ll:justify-center ll:z-10 ll:bg-black/20">
            <Loader2 className="ll:h-3 ll:w-3 ll:animate-spin ll:text-orange-500" />
          </div>
        )}
        <LegacyTimerTileFace
          id={timer.npc.id.toString()}
          colors={tile.colors}
          countdownMode={countdownMode}
          displayMode={displayConfig.singleTimerDisplayMode}
          fontSize={displayConfig.fontSize}
          isPending={tile.isPending}
          label={tile.label}
          timer={timer}
        />
      </div>
    </TimerTileInteractions>
  );
};
