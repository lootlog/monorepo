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
import { ClockArrowDown, ClockArrowUp, Loader2 } from "lucide-react";
import type { FC } from "react";

const DEFAULT_COLOR_NAMES: Record<string, string> = {
  red: "Czerwony",
  orange: "Pomarańczowy",
  yellow: "Żółty",
  lime: "Limonkowy",
  green: "Zielony",
  teal: "Turkusowy",
  sky: "Niebieski",
  blue: "Granatowy",
  violet: "Fioletowy",
  purple: "Purpurowy",
  pink: "Różowy",
  white: "Biały",
};

type SingleTimerProps = {
  timer: Timer;
  settingsKey: string;
  minTimeLeft?: number;
  maxTimeLeft?: number;
  canDelete?: boolean;
  isHidden?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  minTimeLeft = 0,
  maxTimeLeft = 0,
  canDelete = false,
  settingsKey,
  isHidden = false,
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
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    hiddenDefaultColors,
    displayConfig,
    generalConfig,
  } = useTimersStore();
  const { mutate: resetTimer } = useResetTimer();
  const { mutate: deleteTimer } = useDeleteTimer();

  const isPending = timer.isPending === true;
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
          {timer.npc.name} <span className="ll:text-white">{levelSuffix}</span>
        </div>
      </div>

      {!generalConfig.timersGrouping && (
        <div className="ll:text-xs ll:text-gray-300">
          <span className="ll:text-gray-400">Dodane przez:</span>{" "}
          <span className="ll:font-semibold">{timer?.member?.name ?? ""}</span>
        </div>
      )}

      {timer.wasReset && (
        <div className="ll:text-xs ll:text-orange-400 ll:flex ll:items-center ll:gap-1">
          <span className="ll:font-semibold">⟳ Timer został zresetowany</span>
        </div>
      )}

      {timer.updatedAt && (
        <div className="ll:text-xs ll:text-gray-400">
          <span className="ll:text-gray-500">Dodano:</span>{" "}
          <span className="ll:text-gray-300">
            {format(new Date(timer.updatedAt), "dd.MM.yyyy - HH:mm:ss")}
          </span>
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
  const customColor = customColors[selectedColor];
  const overriddenColor = overriddenDefaultColors[selectedColor];
  const isPinned = pinnedTimers[settingsKey]?.includes(timer.npc.name);

  const resetIndicator = timer.wasReset ? "[R] " : "";

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
            <div
              className={cn("ll:relative ll:h-full", {
                "ll:opacity-50": isHidden,
              })}
            >
              {isPending && (
                <div className="ll:absolute ll:inset-0 ll:flex ll:items-center ll:justify-center ll:z-10 ll:bg-black/20">
                  <Loader2 className="ll:h-3 ll:w-3 ll:animate-spin ll:text-orange-500" />
                </div>
              )}
              <Tile
                id={timer.npc.id.toString()}
                color={
                  customColor || overriddenColor
                    ? undefined
                    : (selectedColor as keyof typeof TIMERS_COLORS)
                }
                customBorderColor={
                  customColor?.borderColor || overriddenColor?.borderColor
                }
                customBackgroundColor={
                  customColor?.backgroundColor ||
                  overriddenColor?.backgroundColor
                }
              >
                <span
                  className={cn(
                    "ll:flex ll:justify-between ll:w-full ll:text-[11px] ll:px-1 ll:box-border ll:h-full ll:min-w-0",
                    {
                      "ll:text-red-500": hasPassedRedThreshold,
                      "ll:text-orange-400": isMinSpawnTime,
                      "ll:text-white":
                        !hasPassedRedThreshold && !isMinSpawnTime,
                      "ll:py-1": document.body.classList.contains("si"),
                      "ll:flex-col ll:py-0 ll:px-0 ll:leading-[1.05] ll:items-center":
                        displayConfig.singleTimerDisplayMode === "column",
                      "ll:opacity-60 ll:blur-[0.5px]": isPending,
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
                    {resetIndicator}
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
            </div>
          </ContextMenuTrigger>
        </TooltipTrigger>

        <ContextMenuContent className="ll:w-48 ll:flex ll:flex-col">
          {isPending ? (
            <div className="ll:p-4 ll:text-center ll:text-sm ll:text-gray-400">
              <Loader2 className="ll:h-4 ll:w-4 ll:animate-spin ll:mx-auto ll:mb-2 ll:text-orange-500" />
              <p>Tworzenie timera...</p>
            </div>
          ) : (
            <>
              <div className="ll:flex ll:gap-1 ll:my-1.5 ll:w-full ll:justify-center ll:flex-wrap">
                {Object.entries(TIMERS_COLORS)
                  .filter(([id]) => !hiddenDefaultColors.includes(id))
                  .map(([id, color]) => {
                    const overridden = overriddenDefaultColors[id];

                    return (
                      <Tooltip key={id}>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "ll:size-3 ll:rounded-md ll:box-border ll:border-transparent ll-custom-cursor-pointer",
                              !overridden && color?.bgNoOpacity,
                              {
                                " ll:ring-2 ll:ring-white":
                                  selectedColor === id,
                              },
                            )}
                            style={
                              overridden
                                ? {
                                    backgroundColor: overridden.backgroundColor,
                                    borderColor: overridden.borderColor,
                                  }
                                : undefined
                            }
                            onClick={() => handleTimerColorChange(id)}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="ll:text-xs">
                          {defaultColorNames[id] || DEFAULT_COLOR_NAMES[id]}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                {Object.values(customColors).map((color) => (
                  <Tooltip key={color.id}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "ll:size-3 ll:rounded-md ll:box-border ll:border-transparent ll-custom-cursor-pointer",
                          {
                            " ll:ring-2 ll:ring-white":
                              selectedColor === color.id,
                          },
                        )}
                        style={{ backgroundColor: color.backgroundColor }}
                        onClick={() => handleTimerColorChange(color.id)}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="ll:text-xs">
                      {color.name}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <ContextMenuItem onClick={handlePinTimer}>
                {isPinned ? "Odepnij" : "Przypnij"}
              </ContextMenuItem>
              <ContextMenuItem
                onClick={
                  isPinned ? handleUnpinTimerForAll : handlePinTimerForAll
                }
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
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>

      <TooltipContent side="right" className="ll:z-500">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};
