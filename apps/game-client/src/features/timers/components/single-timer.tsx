import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tile } from "@/components/ui/tile";
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
  red: { bg: "ll-bg-red-500", border: "ll-border-red-500" },
  green: { bg: "ll-bg-green-500", border: "ll-border-green-500" },
  blue: { bg: "ll-bg-indigo-800", border: "ll-border-indigo-800" },
  yellow: { bg: "ll-bg-yellow-500", border: "ll-border-yellow-500" },
  purple: { bg: "ll-bg-purple-500", border: "ll-border-purple-500" },
  orange: { bg: "ll-bg-orange-500", border: "ll-border-orange-500" },
  pink: { bg: "ll-bg-pink-500", border: "ll-border-pink-500" },
  white: { bg: "ll-bg-gray-400", border: "ll-border-gray-400" },
};

export const SingleTimer: FC<SingleTimerProps> = ({
  timer,
  timeLeft = 0,
  compactMode,
}) => {
  const { world, accountId, characterId } = useGlobalStore(
    (state) => state.gameState
  );
  const {
    addHiddenTimer,
    addPinnedTimer,
    removePinnedTimer,
    pinnedTimers,
    setTimerColor,
    timersColors,
  } = useTimersStore();

  const minSpawnTime = new Date(timer.minSpawnTime).getTime();

  const isMinSpawnTime = minSpawnTime - Date.now() < 0;
  const hasPassedRedThreshold = timeLeft < 0;

  useEffect(() => {
    // @ts-ignore
    $(`#${timer.npc.id}`).tip(`
      <span class="elite_timer_tip_name">
        <b>${timer.npc.name}</b>
      </span>
      <i>${NPC_NAMES[timer.npc.type].longname}</i>
      <br />
      <span class="elite_timer_tip_date">
        Min: ${format(new Date(timer.minSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
      </span>
      <br />
      <span class="elite_timer_tip_date">
        Max: ${format(new Date(timer.maxSpawnTime), "dd.MM.yyyy - HH:mm:ss")}
      </span>
    `);
  }, [timer.npc.id, timer.npc.name, timer.minSpawnTime, timer.maxSpawnTime]);

  const handleHideTimer = () => {
    if (!accountId || !characterId) return;
    addHiddenTimer(accountId, characterId, timer.npc.name);
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

  const selectedColor = timersColors[timer.npc.name] ?? "white";
  const isPinned = pinnedTimers[`${accountId}${characterId}`]?.includes(
    timer.npc.name
  );

  const shortname = compactMode
    ? ""
    : `[${NPC_NAMES[timer.npc.type].shortname}]`;

  return (
    <ContextMenu>
      <ContextMenuTrigger className="ll-h-full">
        <Tile
          id={timer.npc.id.toString()}
          color={selectedColor as keyof typeof COLORS}
          className="ll-h-full"
        >
          <span
            className={cn(
              "ll-flex ll-justify-between ll-w-full ll-text-[11px] ll-px-1 ll-box-border ll-h-full",
              {
                "ll-text-red-500": hasPassedRedThreshold,
                "ll-text-orange-400": isMinSpawnTime,
                "ll-text-white": !hasPassedRedThreshold && !isMinSpawnTime,
                "ll-py-1": document.body.classList.contains("si"),
                "ll-flex-col ll-py-0 ll-leading-tight": compactMode,
              }
            )}
          >
            <span
              className={cn({
                "ll-text-[10px] ll-text-center ll-h-full ll-flex ll-justify-center ll-items-center":
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

      <ContextMenuContent className="ll-w-32 ll-flex ll-flex-col">
        <div className="ll-flex ll-gap-1 ll-my-1.5 ll-w-full ll-justify-center">
          {Object.entries(COLORS).map(([id, color]) => (
            <div
              key={id}
              className={cn(
                "ll-size-3 ll-rounded-full ll-border-2 ll-box-border ll-border-transparent ll-custom-cursor-pointer",
                color.bg,
                {
                  "ll-border-solid ll-border-gray-50": selectedColor === id,
                }
              )}
              onClick={() => handleTimerColorChange(id)}
            />
          ))}
        </div>
        <ContextMenuItem onClick={handlePinTimer}>
          {isPinned ? "Odepnij" : "Przypnij"}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleHideTimer}>Ukryj timer</ContextMenuItem>
        <ContextMenuItem disabled>Usuń timer</ContextMenuItem>
        <ContextMenuItem disabled>Włącz dźwięk</ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
