import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tile } from "@/components/ui/tile";
import { useCharacterList } from "@/hooks/api/use-character-list";
import { useDeleteTimer } from "@/hooks/api/use-delete-timer";
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
  guildId?: string;
  timeLeft?: number;
  compactMode?: boolean;
  canDelete?: boolean;
};

const NPC_NAMES: { [key: string]: { shortname: string; longname: string } } = {
  TITAN: { shortname: "T", longname: "tytan" },
  COLOSSUS: { shortname: "K", longname: "kolos" },
  HERO: { shortname: "H", longname: "heros" },
  ELITE3: { shortname: "E3", longname: "elita III" },
  ELITE2: { shortname: "E2", longname: "elita II" },
  ELITE: { shortname: "E", longname: "elita" },
};

export const COLORS = {
  red: {
    bg: "ll-bg-red-500/20 hover:ll-bg-red-500/40",
    bgNoOpacity: "ll-bg-red-500",
    border: "ll-border-red-500",
  },
  orange: {
    bg: "ll-bg-orange-500/20 hover:ll-bg-orange-500/40",
    bgNoOpacity: "ll-bg-orange-500",
    border: "ll-border-orange-500",
  },
  yellow: {
    bg: "ll-bg-yellow-500/20 hover:ll-bg-yellow-500/40",
    bgNoOpacity: "ll-bg-yellow-500",
    border: "ll-border-yellow-500",
  },
  lime: {
    bg: "ll-bg-lime-500/20 hover:ll-bg-lime-500/40",
    bgNoOpacity: "ll-bg-lime-500",
    border: "ll-border-lime-500",
  },
  green: {
    bg: "ll-bg-green-500/20 hover:ll-bg-green-500/40",
    bgNoOpacity: "ll-bg-green-500",
    border: "ll-border-green-500",
  },
  teal: {
    bg: "ll-bg-teal-500/20 hover:ll-bg-teal-500/40",
    bgNoOpacity: "ll-bg-teal-500",
    border: "ll-border-teal-500",
  },
  sky: {
    bg: "ll-bg-sky-500/20 hover:ll-bg-sky-500/40",
    bgNoOpacity: "ll-bg-sky-500",
    border: "ll-border-sky-500",
  },
  blue: {
    bg: "ll-bg-indigo-800/20 hover:ll-bg-indigo-800/40",
    bgNoOpacity: "ll-bg-indigo-800",
    border: "ll-border-indigo-800",
  },
  violet: {
    bg: "ll-bg-violet-400/20 hover:ll-bg-violet-400/40",
    bgNoOpacity: "ll-bg-violet-400",
    border: "ll-border-violet-400",
  },
  purple: {
    bg: "ll-bg-purple-600/20 hover:ll-bg-purple-600/40",
    bgNoOpacity: "ll-bg-purple-600",
    border: "ll-border-purple-600",
  },
  pink: {
    bg: "ll-bg-pink-500/20 hover:ll-bg-pink-500/40",
    bgNoOpacity: "ll-bg-pink-500",
    border: "ll-border-pink-500",
  },
  white: {
    bg: "ll-bg-gray-400/20 hover:ll-bg-gray-400/40",
    bgNoOpacity: "ll-bg-gray-400",
    border: "ll-border-gray-400",
  },
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  timeLeft = 0,
  compactMode,
  canDelete = false,
}) => {
  const { accountId, characterId, world } = useGlobalStore(
    (state) => state.gameState
  );
  const { data: characters } = useCharacterList();
  const {
    addHiddenTimer,
    addPinnedTimer,
    removePinnedTimer,
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
    // @ts-ignore
    $(`#${timer.npc.id}`).tip(`
      <span class="elite_timer_tip_name">
        <b>${timer.npc.name}</b>
      </span>
      <i>${NPC_NAMES[timer.npc.type]?.longname ?? ""}</i>
      <br />
      ${timersGrouping ? "" : `Dodane przez: <span class="">${timer?.member?.name}</span>`}
      <span class="elite_timer_tip_date">
        Min: ${format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
      </span>
      <span class="elite_timer_tip_date">
        Max: ${format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
      </span>
    `);
  }, [
    timer.npc.id,
    timer.npc.name,
    timer.minSpawnTime,
    timer.maxSpawnTime,
    timersGrouping,
  ]);

  const handleHideTimer = () => {
    if (!accountId || !characterId) return;
    addHiddenTimer(accountId, characterId, timer.npc.name);
  };

  const handleHideTimerForAll = () => {
    if (!accountId || !characters) return;

    characters.forEach((character) => {
      addHiddenTimer(accountId, String(character.id), timer.npc.name);
    });
  };

  const handlePinTimer = () => {
    if (!accountId || !characterId) return;

    if (isPinned) {
      removePinnedTimer(accountId, characterId, timer.npc.name);
      return;
    }
    addPinnedTimer(accountId, characterId, timer.npc.name);
  };

  const handleTimerColorChange = (color?: string) => {
    setTimerColor(timer.npc.name, color);
  };

  const handleRestartTimer = () => {
    if (!accountId || !characterId || !world) return;

    resetTimer({
      world,
      npcId: timer.npc.id,
      guildId: timer.guildId,
    });
  };

  const handleDeleteTimer = () => {
    if (!accountId || !characterId || !world) return;

    deleteTimer({
      world,
      npcId: timer.npc.id,
      guildId: timer.guildId,
    });
  };

  const selectedColor = timersColors[timer.npc.name] ?? "white";
  const isPinned = pinnedTimers[`${accountId}${characterId}`]?.includes(
    timer.npc.name
  );

  const shortname = compactMode
    ? ""
    : `[${NPC_NAMES[timer.npc.type]?.shortname ?? "M"}]`;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="ll-h-full">
        <Tile
          id={timer.npc.id.toString()}
          color={selectedColor as keyof typeof COLORS}
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
          {Object.entries(COLORS).map(([id, color]) => (
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
        <ContextMenuItem onClick={handleHideTimer}>Ukryj</ContextMenuItem>
        <ContextMenuItem onClick={handleHideTimerForAll}>
          Ukryj dla wszystkich postaci
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
