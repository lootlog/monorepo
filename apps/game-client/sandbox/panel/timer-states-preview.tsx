import { useState } from "react";
import { createPortal } from "react-dom";
import { NpcType } from "@/api/npcs.api";
import type { Timer } from "@/api/timers.api";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getLootlogPortalContainer } from "@/components/ui/theme-boundary";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { TimerMapPlayersAdornment } from "@/features/timers/components/timer-map-players-adornment";
import { TimerTileView } from "@/features/timers/components/timer-tile-view";
import { TimerTooltip } from "@/features/timers/components/timer-tooltip";
import type { MapThreat, MapThreatEnemy } from "@/lib/map-threat-source";
import type { MapOccupancy } from "@/lib/presence-map-index";

const PROFESSIONS = ["w", "m", "p", "b", "h", "t"];

const ALLY_NAMES = [
  "Salvatore",
  "Zorin",
  "Kasandra",
  "Mroczny Łowca",
  "Tester",
  "Aveline",
  "Brom",
  "Czarny Kot",
  "Dagor",
  "Elwira",
  "Fenrir",
  "Gorthak",
];

const ENEMY_NAMES = [
  "Nekromanta",
  "Krwawa Pani",
  "Ostrze Nocy",
  "Wilkołak",
  "Zgniatacz",
];

const allies = (count: number, afk: number | "all" = 0): MapOccupancy => {
  const players = ALLY_NAMES.slice(0, count).map((name, index) => ({
    key: `ally-${index}`,
    name,
    isAfk: afk === "all" || index < afk,
    lvl: 180 + index * 11,
    prof: PROFESSIONS[index % PROFESSIONS.length],
    clanName: index % 3 === 0 ? "Zakon Lootu" : undefined,
  }));

  return { players, allAfk: players.every((player) => player.isAfk) };
};

const enemies = (
  count: number,
  { stale = false, afk = false }: { stale?: boolean; afk?: boolean } = {},
): MapThreat => {
  const now = Date.now();

  const list: MapThreatEnemy[] = ENEMY_NAMES.slice(0, count).map(
    (nickname, index) => ({
      targetId: `enemy-${index}`,
      nickname,
      lvl: 250 + index * 7,
      prof: PROFESSIONS[(index + 2) % PROFESSIONS.length],
      clan: index % 2 === 0 ? { id: 1, name: "Bractwo Cienia" } : undefined,
      stasis: afk,
      seenAt: now - (stale ? 45_000 : 2_000 + index * 1_500),
    }),
  );

  return { enemies: list, freshCount: stale ? 0 : list.length };
};

type PreviewState = {
  title: string;
  color: keyof typeof TIMERS_COLORS;
  occupancy?: MapOccupancy;
  threat?: MapThreat;
};

// Built when the preview opens, so enemy sightings start fresh.
const createStates = (): readonly PreviewState[] => [
  { title: "Nikt", color: "sky" },
  { title: "1 nasz", color: "green", occupancy: allies(1) },
  { title: "4 naszych", color: "violet", occupancy: allies(4, 1) },
  { title: "3 naszych AFK", color: "yellow", occupancy: allies(3, "all") },
  { title: "1 wróg", color: "red", threat: enemies(1) },
  { title: "3 wrogów", color: "orange", threat: enemies(3) },
  { title: "2 wrogów AFK", color: "teal", threat: enemies(2, { afk: true }) },
  {
    title: "2 wrogów dawno",
    color: "blue",
    threat: enemies(2, { stale: true }),
  },
  {
    title: "2 naszych + 5 wrogów",
    color: "pink",
    occupancy: allies(2),
    threat: enemies(5),
  },
  {
    title: "12 naszych + 1 wróg",
    color: "white",
    occupancy: allies(12, 3),
    threat: enemies(1, { afk: true }),
  },
];

const createTimer = (name: string): Timer => {
  const now = Date.now();

  return {
    guildId: "guild-1",
    timerKey: name,
    world: "luvia",
    npcId: 10,
    minSpawnTime: new Date(now - 60_000).toISOString(),
    maxSpawnTime: new Date(now + 4 * 60_000).toISOString(),
    updatedAt: new Date(now - 20 * 60_000).toISOString(),
    wasReset: name === "Tanroth",
    npc: {
      id: 10,
      name,
      lvl: 120,
      prof: "W",
      icon: "icon.gif",
      wt: 85,
      type: NpcType.ELITE2,
      margonemType: 2,
      location: "Karka-han",
    },
    members: [
      {
        id: 1,
        userId: "user-1",
        name: "Salvatore",
        guildId: "guild-1",
        type: "USER",
      },
    ],
    actorCharactersByMemberId: {
      "1": {
        name: "Zorin",
        lvl: 300,
        prof: "BLADE_DANCER",
        icon: "",
        characterId: 1,
        accountId: 2,
      },
    },
  };
};

const NPC_NAMES = ["Tanroth", "Mietek Żul", "Kotołak Tropiciel", "Gobbos"];

function PreviewTile({
  state,
  index,
  displayMode,
  onPin,
}: {
  state: PreviewState;
  index: number;
  displayMode: "row" | "column";
  onPin: () => void;
}) {
  const timer = createTimer(NPC_NAMES[index % NPC_NAMES.length] ?? "Tanroth");
  const { occupancy, threat } = state;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="sbx-preview-tile"
          tabIndex={0}
          onClick={onPin}
          onKeyDown={(event) => {
            if (event.key === "Enter") onPin();
          }}
        >
          <TimerTileView
            paint={TIMERS_COLORS[state.color]}
            displayMode={displayMode}
            fontSize={11}
            isMinSpawnTime={index % 3 === 1}
            label={`${timer.npc.name} (${timer.npc.lvl}w)`}
            timeLabel="3:59"
            timeAdornment=<TimerMapPlayersAdornment
              occupancy={occupancy}
              threat={threat}
            />
          />
        </span>
      </TooltipTrigger>
      <TooltipContent className="ll:w-64 ll:max-w-64">
        <TimerTooltip
          timer={timer}
          guildNamesById={{ "guild-1": "Lootlog" }}
          occupancy={occupancy}
          threat={threat}
        />
      </TooltipContent>
    </Tooltip>
  );
}

/** Every map presence and threat state of a single timer, with hover tooltips. */
export function TimerStatesPreview({ onClose }: { onClose: () => void }) {
  const container = getLootlogPortalContainer();
  const [states] = useState(createStates);
  const [pinned, setPinned] = useState(states.length - 2);
  const pinnedState = states[pinned];

  if (!container) return null;

  return createPortal(
    <div className="sbx-preview" role="dialog" aria-label="Timer states">
      <header className="sbx-preview-header">
        <strong>Timer map states (hover = tooltip, click = pin)</strong>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </header>
      <div className="sbx-preview-columns">
        {[
          { width: 150, columns: 2, mode: "row" as const },
          { width: 300, columns: 1, mode: "row" as const },
          { width: 120, columns: 3, mode: "column" as const },
        ].map(({ width, columns, mode }) => (
          <section key={`${width}-${mode}`}>
            <h3>
              {columns}× {width}px · {mode}
            </h3>
            <div
              className="sbx-preview-grid"
              style={{ gridTemplateColumns: `repeat(${columns}, ${width}px)` }}
            >
              {states.map((state, index) => (
                <PreviewTile
                  key={state.title}
                  state={state}
                  index={index}
                  displayMode={mode}
                  onPin={() => setPinned(index)}
                />
              ))}
            </div>
          </section>
        ))}
        {pinnedState && (
          <section>
            <h3>Pinned tooltip · {pinnedState.title}</h3>
            <div className="ll:w-64 ll:max-w-64 ll:rounded-md ll:border ll:border-white/50 ll:bg-black ll:px-2.5 ll:py-1.5 ll:text-xs ll:leading-4 ll:text-popover-foreground ll:shadow-[2px_2px_3px_3px_rgba(12,13,13,0.4)]">
              <TimerTooltip
                timer={createTimer(
                  NPC_NAMES[pinned % NPC_NAMES.length] ?? "Tanroth",
                )}
                guildNamesById={{ "guild-1": "Lootlog" }}
                occupancy={pinnedState.occupancy}
                threat={pinnedState.threat}
              />
            </div>
          </section>
        )}
      </div>
    </div>,
    container,
  );
}
