import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tile } from "@/components/ui/tile";
import { NPC_NAMES } from "@/constants/margonem";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { useDeleteTimer } from "@/hooks/api/use-delete-timer";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useResetTimer } from "@/hooks/api/use-reset-timer";
import { Timer } from "@/hooks/api/use-timers";
import { cn } from "@/lib/utils";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { parseMsToTime } from "@/utils/parse-ms-to-time";
import { format } from "date-fns";
import { FC, useEffect } from "react";

type SingleTimerProps = {
  timer: Timer;
  settingsKey: string;
  timeLeft?: number;
  compactMode?: boolean;
  canDelete?: boolean;
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  timeLeft = 0,
  compactMode,
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
    timersGrouping,
  } = useTimersStore();
  const { mutate: resetTimer } = useResetTimer();
  const { mutate: deleteTimer } = useDeleteTimer();

  const minSpawnTime = new Date(timer.minSpawnTime).getTime();

  const isMinSpawnTime = minSpawnTime - Date.now() < 0;
  const hasPassedRedThreshold = timeLeft < 0;

  useEffect(() => {
    const levelSuffix =
      timer.npc.lvl === 0
        ? ""
        : ` (${timer.npc.lvl}${timer.npc.prof?.charAt(0).toLowerCase() ?? ""})`;

    const escapeHtml = (unsafe: string) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    const tooltipContent = `
      <span class="elite_timer_tip_name">
      <b>${escapeHtml(timer.npc.name)}${escapeHtml(levelSuffix)}</b>
      </span>
      <i>${escapeHtml(NPC_NAMES[timer.npc.type]?.longname ?? "")}</i>
      <br />
      ${timersGrouping ? "" : `Dodane przez: <span class="">${escapeHtml(timer?.member?.name ?? "")}</span>`}
      <span class="elite_timer_tip_date">
      Min: ${format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
      </span>
      <span class="elite_timer_tip_date">
      Max: ${format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
      </span>
    `;
    // @ts-ignore
    $(`#${timer.npc.id}`).tip(tooltipContent);
  }, [
    timer.npc.id,
    timer.member?.name,
    timer.npc.name,
    timer.minSpawnTime,
    timer.maxSpawnTime,
    timersGrouping,
  ]);

  const handleHideTimer = () => {
    if (!settingsKey) return;
    console.log("Hiding timer", timer.npc.name, "for", settingsKey);
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

  const shortname = compactMode
    ? ""
    : `[${NPC_NAMES[timer.npc.type]?.shortname ?? "M"}]`;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="ll-h-full ll-pr-[1px]">
        <Tile
          id={timer.npc.id.toString()}
          color={selectedColor as keyof typeof TIMERS_COLORS}
          className={cn("ll-h-full", {
            "!ll-py-[1px]": compactMode,
          })}
        >
          <span
            className={cn(
              "ll-flex ll-justify-between ll-w-full ll-text-[11px] ll-px-1 ll-box-border ll-h-full",
              {
                "ll-text-red-500": hasPassedRedThreshold,
                "ll-text-orange-400": isMinSpawnTime,
                "ll-text-white": !hasPassedRedThreshold && !isMinSpawnTime,
                "ll-py-1":
                  document.body.classList.contains("si") && !compactMode,
                "ll-flex-col ll-py-0 ll-px-0 ll-leading-[1.05]": compactMode,
              }
            )}
          >
            <span
              className={cn("ll-whitespace-nowrap ll-truncate", {
                "ll-text-[10px] ll-text-center ll-px-0.5 ll-box-border ll-h-full ll-items-center ":
                  compactMode,
              })}
            >
              {shortname} {timer.npc.name}
            </span>
            <div
              className={cn({ "ll-text-[10px] ll-text-center": compactMode })}
            >
              {parseMsToTime(timeLeft <= 0 ? 0 : timeLeft)}
            </div>
          </span>
        </Tile>
      </ContextMenuTrigger>

      <ContextMenuContent className="ll-w-48 ll-flex ll-flex-col">
        <div className="ll-flex ll-gap-1 ll-my-1.5 ll-w-full ll-justify-center ll-flex-wrap">
          {Object.entries(TIMERS_COLORS).map(([id, color]) => (
            <div
              key={id}
              className={cn(
                "ll-size-3 ll-rounded-md ll-box-border ll-border-transparent ll-custom-cursor-pointer",
                color?.bgNoOpacity,
                {
                  " ll-ring-2 ll-ring-white": selectedColor === id,
                }
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
        {!timersGrouping && (
          <ContextMenuItem onClick={handleRestartTimer}>
            Odliczaj od początku
          </ContextMenuItem>
        )}
        {!timersGrouping && canDelete && (
          <ContextMenuItem onClick={handleDeleteTimer}>
            Usuń timer
          </ContextMenuItem>
        )}
        <ContextMenuItem disabled>Włącz dźwięk</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
