import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tile } from "@/components/ui/tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NPC_NAMES } from "@/constants/margonem";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { useDeleteTimer } from "@/hooks/api/use-delete-timer";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useResetTimer } from "@/hooks/api/use-reset-timer";
import type { Timer } from "@/hooks/api/use-timers";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { parseMsToTime } from "@/utils/parse-ms-to-time";
import { format } from "date-fns";
import { isNil } from "lodash";
import { ClockArrowDown, ClockArrowUp } from "lucide-react";
import type { FC } from "react";

type SingleTimerProps = {
  timer: Timer;
  settingsKey: string;
  minTimeLeft?: number;
  maxTimeLeft?: number;
  canDelete?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  minTimeLeft = 0,
  maxTimeLeft = 0,
  canDelete = false,
  settingsKey,
}) => {
  const { world } = useGlobalStore((state) => state.gameState);
  const { data: guilds } = useGuilds();
  const {
    hideTimer,
    pinTimer,
    unpinTimer,
    pinnedTimers,
    setTimerColor,
    timersColors,
    displayConfig,
    generalConfig,
  } = useTimersStore();
  const { mutate: resetTimer } = useResetTimer();
  const { mutate: deleteTimer } = useDeleteTimer();

  const isMinSpawnTime = minTimeLeft < 0;
  const hasPassedRedThreshold = maxTimeLeft < 0;

  const levelSuffix =
    timer.npc.lvl === 0
      ? ""
      : ` (${timer.npc.lvl}${timer.npc.prof?.charAt(0).toLowerCase() ?? ""})`;

  const tooltipContent = (
    <div className="ll:flex ll:flex-col ll:gap-1">
      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:pb-1 ll:border-gray-600">
        <div className="ll:text-sm ll:font-bold ll:text-white">
          {timer.npc.name}{" "}
          <span className="ll:text-gray-300">{levelSuffix}</span>
        </div>
      </div>

      {!generalConfig.timersGrouping && (
        <div className="ll:text-xs ll:text-gray-300">
          <span className="ll:text-gray-400">Dodane przez:</span>{" "}
          <span className="ll:font-semibold">{timer?.member?.name ?? ""}</span>
        </div>
      )}

      <div className="ll:flex ll:flex-col ll:gap-0.5 ll:text-xs">
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <ClockArrowDown size={14} className="ll:text-green-400" />
          <span className="ll:text-gray-400 ll:w-8">Min:</span>
          <span className="ll:text-gray-200">
            {format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
        <div className="ll:flex ll:items-center ll:gap-1.5">
          <ClockArrowUp size={14} className="ll:text-red-400" />
          <span className="ll:text-gray-400 ll:w-8">Max:</span>
          <span className="ll:text-gray-200">
            {format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
          </span>
        </div>
      </div>
    </div>
  );

  const handleHideTimer = () => {
    if (!settingsKey) return;
    hideTimer(settingsKey, timer.npc.name);
  };

  const handleHideTimerForAll = () => {
    if (!settingsKey || !guilds) return;

    guilds.forEach((guild) => {
      hideTimer(guild.id, timer.npc.name);
    });

    hideTimer("global", timer.npc.name);
  };

  const handlePinTimer = () => {
    if (!settingsKey) return;

    if (isPinned) {
      unpinTimer(settingsKey, timer.npc.name);
      return;
    }
    pinTimer(settingsKey, timer.npc.name);
  };

  const handlePinTimerForAll = () => {
    if (!settingsKey || !guilds) return;

    guilds.forEach((guild) => {
      pinTimer(guild.id, timer.npc.name);
    });

    pinTimer("global", timer.npc.name);
  };

  const handleUnpinTimerForAll = () => {
    if (!settingsKey || !guilds) return;
    guilds.forEach((guild) => {
      unpinTimer(guild.id, timer.npc.name);
    });
    unpinTimer("global", timer.npc.name);
  };

  const handleTimerColorChange = (color?: string) => {
    setTimerColor(timer.npc.name, color);
  };

  const handleRestartTimer = () => {
    if (!world) return;

    resetTimer({
      world,
      npcId: timer.npc.id,
      guildId: timer.guildId,
    });
  };

  const handleDeleteTimer = () => {
    if (!world) return;

    deleteTimer({
      world,
      npcId: timer.npc.id,
      guildId: timer.guildId,
    });
  };

  const selectedColor = timersColors[timer.npc.name] ?? "white";
  const isPinned = pinnedTimers[settingsKey]?.includes(timer.npc.name);

  const shortname = displayConfig.showType
    ? `[${NPC_NAMES[timer.npc.type]?.shortname ?? "M"}]`
    : "";

  const npcDetails =
    displayConfig.showLevel && timer.npc.lvl > 0 && timer.npc.prof
      ? ` (${timer.npc.lvl}${timer.npc.prof?.charAt(0).toLowerCase() ?? ""})`
      : "";

  const timeLeft =
    generalConfig.countdownMode === "max" || isMinSpawnTime
      ? maxTimeLeft
      : minTimeLeft;

  return (
    <Tooltip>
      <ContextMenu>
        <TooltipTrigger asChild>
          <ContextMenuTrigger className="ll:h-full ll:pr-px">
            <Tile
              id={timer.npc.id.toString()}
              color={selectedColor as keyof typeof TIMERS_COLORS}
            >
              <span
                className={cn(
                  "ll:flex ll:justify-between ll:w-full ll:text-[11px] ll:px-1 ll:box-border ll:h-full ll:min-w-0",
                  {
                    "ll:text-red-500": hasPassedRedThreshold,
                    "ll:text-orange-400": isMinSpawnTime,
                    "ll:text-white": !hasPassedRedThreshold && !isMinSpawnTime,
                    "ll:py-1": document.body.classList.contains("si"),
                    "ll:flex-col ll:py-0 ll:px-0 ll:leading-[1.05] ll:items-center":
                      displayConfig.singleTimerDisplayMode === "column",
                  },
                )}
              >
                <span
                  className={cn(
                    "ll:whitespace-nowrap ll:truncate ll:min-w-0 ll:max-w-full",
                    {
                      "ll:w-full ll:text-center":
                        displayConfig.singleTimerDisplayMode === "column",
                    },
                  )}
                  style={{
                    fontSize: `${displayConfig.fontSize}px`,
                  }}
                >
                  {shortname} {timer.npc.name} {npcDetails}
                </span>
                <div
                  style={{
                    fontSize: `${displayConfig.fontSize}px`,
                  }}
                >
                  {parseMsToTime(timeLeft <= 0 ? 0 : timeLeft)}
                </div>
              </span>
            </Tile>
          </ContextMenuTrigger>
        </TooltipTrigger>

        <ContextMenuContent className="ll:w-48 ll:flex ll:flex-col">
          <div className="ll:flex ll:gap-1 ll:my-1.5 ll:w-full ll:justify-center ll:flex-wrap">
            {Object.entries(TIMERS_COLORS).map(([id, color]) => (
              <div
                key={id}
                className={cn(
                  "ll:size-3 ll:rounded-md ll:box-border ll:border-transparent ll-custom-cursor-pointer",
                  color?.bgNoOpacity,
                  {
                    " ll:ring-2 ll:ring-white": selectedColor === id,
                  },
                )}
                onClick={() => handleTimerColorChange(id)}
              />
            ))}
          </div>
          <ContextMenuItem onClick={handlePinTimer}>
            {isPinned ? "Odepnij" : "Przypnij"}
          </ContextMenuItem>
          <ContextMenuItem
            onClick={isPinned ? handleUnpinTimerForAll : handlePinTimerForAll}
          >
            {isPinned
              ? "Odepnij na wszystkich serwerach"
              : "Przypnij na wszystkich serwerach"}
          </ContextMenuItem>
          <ContextMenuItem onClick={handleHideTimer}>Ukryj</ContextMenuItem>
          <ContextMenuItem onClick={handleHideTimerForAll}>
            Ukryj na wszystkich serwerach
          </ContextMenuItem>
          {!generalConfig.timersGrouping && (
            <ContextMenuItem onClick={handleRestartTimer}>
              Odliczaj od początku
            </ContextMenuItem>
          )}
          {!generalConfig.timersGrouping && canDelete && (
            <ContextMenuItem onClick={handleDeleteTimer}>
              Usuń timer
            </ContextMenuItem>
          )}
          <ContextMenuItem disabled>Włącz dźwięk</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <TooltipContent side="right" className="ll:z-500">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};
