import type { GameEvent } from "@lootlog/margonem/game-events";
import { createDebugLegendaryLootEvent } from "@/features/settings/components/debug/debug-legendary-loot-event";
import {
  createBaseEvent,
  createDetectorEvent,
  createPartyJoinEvent,
  createPartyLeaveEvent,
  createUniqueKillNpcEvent,
  DEBUG_EVENT_TEMPLATES,
  DETECTOR_NPC_PRESETS,
} from "@/features/settings/components/debug/debug-game-events";
import { useGameStore } from "@/store/game.store";
import type { SandboxWorld } from "./fake-runtime/world";

export type SandboxScenario = {
  id: string;
  label: string;
  group: "NPC" | "Battle" | "Map" | "Players" | "Hero";
  build: (world: SandboxWorld) => GameEvent | null;
};

let nextOtherId = 710_000;

export const SANDBOX_SCENARIOS: readonly SandboxScenario[] = [
  ...Object.entries(DETECTOR_NPC_PRESETS).map(
    ([key, preset]): SandboxScenario => ({
      id: `spawn-${key}`,
      label: `Spawn ${key}`,
      group: "NPC",
      build: () => createDetectorEvent(preset),
    }),
  ),
  {
    id: "remove-last-npc",
    label: "Remove last NPC",
    group: "NPC",
    build: (world) => {
      const id = Object.keys(world.npcs).at(-1);

      return id
        ? { ...createBaseEvent(), npcs_del: [{ id: Number(id) }] }
        : null;
    },
  },
  {
    id: "kill-unique",
    label: "Kill unique boss",
    group: "Battle",
    build: () => createUniqueKillNpcEvent(),
  },
  {
    id: "legendary-loot",
    label: "Legendary loot",
    group: "Battle",
    build: () => {
      const game = useGameStore.getState().game;

      return game ? createDebugLegendaryLootEvent(game) : null;
    },
  },
  {
    id: "town-change",
    label: "Change map",
    group: "Map",
    build: () => ({
      ...DEBUG_EVENT_TEMPLATES.townChange.event,
      ev: Date.now(),
    }),
  },
  {
    id: "town-ithan",
    label: "Back to Ithan",
    group: "Map",
    build: () => ({
      ...DEBUG_EVENT_TEMPLATES.townChange.event,
      ev: Date.now(),
      town: {
        ...DEBUG_EVENT_TEMPLATES.townChange.event.town,
        id: 1,
        name: "Ithan",
        visibility: 0,
      },
    }),
  },
  {
    id: "other-enter",
    label: "Player enters",
    group: "Players",
    build: (world) => {
      const id = nextOtherId++;

      return {
        ...createBaseEvent(),
        other: {
          [String(id)]: {
            action: "CREATE",
            account: id + 200_000,
            nick: `Gracz${id % 1000}`,
            icon: "/eve/kup23-elf-k.gif",
            x: world.hero.x + 1,
            y: world.hero.y,
            dir: 0,
            stasis: 0,
            stasis_incoming_seconds: 0,
            rights: 0,
            lvl: 200 + (id % 80),
            oplvl: 0,
            prof: "m",
            attr: 0,
            is_blessed: 0,
            relation: 0,
          },
        },
      };
    },
  },
  {
    id: "other-leave",
    label: "Last player leaves",
    group: "Players",
    build: (world) => {
      const id = Object.keys(world.others).at(-1);

      return id ? { ...createBaseEvent(), other: { [id]: { del: 1 } } } : null;
    },
  },
  {
    id: "party-join",
    label: "Party join",
    group: "Players",
    build: () => createPartyJoinEvent(),
  },
  {
    id: "party-leave",
    label: "Party leave",
    group: "Players",
    build: () => createPartyLeaveEvent(),
  },
  {
    id: "hero-move",
    label: "Hero step",
    group: "Hero",
    build: (world) => ({
      ...createBaseEvent(),
      h: { x: (world.hero.x + 1) % 64, y: world.hero.y },
    }),
  },
  {
    id: "afk-on",
    label: "AFK on",
    group: "Hero",
    build: () => ({ ...DEBUG_EVENT_TEMPLATES.afkOn.event, ev: Date.now() }),
  },
  {
    id: "afk-off",
    label: "AFK off",
    group: "Hero",
    build: () => ({ ...DEBUG_EVENT_TEMPLATES.afkOff.event, ev: Date.now() }),
  },
];
