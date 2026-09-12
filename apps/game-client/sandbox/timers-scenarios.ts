import type { Timer } from "@/api/timers.api";
import { NpcType } from "@/api/npcs.api";
import { queryKeys } from "@/features/public-api/query-keys";
import { createTimerFixture } from "@/features/timers/model/timer-fixtures";
import { MANUAL_TIMER_MARGONEM_TYPE } from "@/features/timers/model/timer-kind";
import { TIMERS_COLORS } from "@/features/timers/model/timer-colors";
import {
  readTimerBehavior,
  setTimerColor,
  setTimerGeneralConfig,
  setTimersLayout,
} from "@/features/timers/settings/timer-settings-writers";
import { getGuildIds } from "@/lib/api/generated-helpers";
import { queryClient } from "@/lib/query-client";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { logSandbox } from "./fake-runtime/sandbox-log";

type SeededNpc = {
  name: string;
  type: NpcType;
  lvl: number;
  prof: string;
  manual?: boolean;
};

const NPC_POOL: readonly SeededNpc[] = [
  { name: "Tanroth", type: NpcType.HERO, lvl: 120, prof: "W" },
  { name: "Młody Smok", type: NpcType.HERO, lvl: 45, prof: "M" },
  {
    name: "Barbatos Smoczy Strażnik",
    type: NpcType.TITAN,
    lvl: 300,
    prof: "P",
  },
  { name: "Wabiciełka", type: NpcType.ELITE2, lvl: 88, prof: "T" },
  { name: "Neferkar Set", type: NpcType.ELITE2, lvl: 132, prof: "B" },
  { name: "Cuaitl Citlalin", type: NpcType.ELITE3, lvl: 210, prof: "H" },
  { name: "Terrozaur", type: NpcType.ELITE2, lvl: 64, prof: "W" },
  { name: "Nymphemonia", type: NpcType.ELITE3, lvl: 250, prof: "M" },
  {
    name: "Ręcznie dodany",
    type: NpcType.HERO,
    lvl: 150,
    prof: "P",
    manual: true,
  },
];

const COLOR_IDS = Object.keys(TIMERS_COLORS);

const MINUTE_MS = 60_000;

const getSeedWorlds = () => {
  const gameWorld = useGameStore.getState().game?.world;
  const characterId = useGameStore.getState().game?.hero.characterId ?? "";
  const settings = useSettingsStore.getState();
  const guildId = settings.guildIdByCharId[characterId];
  const selectedWorld = guildId ? settings.worldByGuildId[guildId] : undefined;

  const worlds: string[] = [];

  for (const world of [gameWorld, selectedWorld]) {
    if (world && !worlds.includes(world)) worlds.push(world);
  }

  return worlds;
};

const getSeedGuildIds = () => {
  const accessible = getGuildIds(queryClient.getQueryData(queryKeys.guilds()));
  const characterId = useGameStore.getState().game?.hero.characterId ?? "";
  const current = useSettingsStore.getState().guildIdByCharId[characterId];
  const ids = current ? [current, ...accessible] : accessible;

  return [...new Set(ids.length > 0 ? ids : ["sandbox-guild"])];
};

const buildTimers = (count: number, world: string, guildIds: string[]) => {
  const now = Date.now();

  return Array.from({ length: count }, (_, index): Timer => {
    const npc = NPC_POOL[index % NPC_POOL.length];
    const spread = (index % 12) - 2;
    const maxSpawnTime = now + spread * 7 * MINUTE_MS + index * 1_000;

    const base = createTimerFixture({
      guildId: guildIds[index % guildIds.length],
      world,
      timerKey: `${1000 + index}:${npc.name.toLowerCase()}`,
      npcId: 1000 + index,
      minSpawnTime: new Date(maxSpawnTime - 5 * MINUTE_MS).toISOString(),
      maxSpawnTime: new Date(maxSpawnTime).toISOString(),
      updatedAt: new Date(now - index * MINUTE_MS).toISOString(),
      wasReset: index % 7 === 0,
      isPending: index % 11 === 10,
    });

    return {
      ...base,
      npc: {
        ...base.npc,
        id: 1000 + index,
        name: count > NPC_POOL.length ? `${npc.name} ${index + 1}` : npc.name,
        lvl: npc.lvl,
        prof: npc.prof,
        type: npc.type,
        margonemType: npc.manual ? MANUAL_TIMER_MARGONEM_TYPE : 2,
      },
    };
  });
};

const seedTimers = (count: number) => () => {
  const guildIds = getSeedGuildIds();
  const worlds = getSeedWorlds();

  for (const world of worlds) {
    const key = queryKeys.timers(world);
    const timers = buildTimers(count, world, guildIds);
    queryClient.setQueryDefaults(key, { staleTime: Infinity });
    queryClient.setQueryData(key, timers);

    timers.forEach((timer, index) => {
      if (index % 3 === 0) {
        setTimerColor(timer.npc.name, COLOR_IDS[index % COLOR_IDS.length]);
      }
    });
  }

  logSandbox(
    "message",
    `Seeded ${count} timers for ${worlds.join(", ")} across ${guildIds.length} guild(s)`,
  );
};

const expireFirstTimer = () => {
  for (const world of getSeedWorlds()) {
    const key = queryKeys.timers(world);
    const timers = queryClient.getQueryData<Timer[]>(key);
    const [first, ...rest] = timers ?? [];

    if (!first) continue;
    const maxSpawnTime = Date.now() + 3_000;

    queryClient.setQueryData(key, [
      {
        ...first,
        minSpawnTime: new Date(maxSpawnTime - 1_000).toISOString(),
        maxSpawnTime: new Date(maxSpawnTime).toISOString(),
      },
      ...rest,
    ]);
    logSandbox("message", `${first.npc.name} expires in 3 s (${world})`);
  }
};

const toggleLayout = () => {
  const next = readTimerBehavior().layout === "legacy" ? "modern" : "legacy";
  setTimersLayout(next);
  logSandbox("message", `Timers layout: ${next}`);
};

const toggleGeneralFlag =
  (flag: "timersUnderBag" | "timersGrouping" | "compactView") => () => {
    const { generalConfig } = readTimerBehavior();
    const next = { ...generalConfig, [flag]: !generalConfig[flag] };
    setTimerGeneralConfig(next);
    logSandbox("message", `${flag}: ${String(next[flag])}`);
  };

const PROFILE_DURATION_MS = 10_000;

/** Ten seconds of long-task and frame-gap sampling while the timers tick. */
const profileTimers = () => {
  const longTasks: number[] = [];
  const frameGaps: number[] = [];
  let observer: PerformanceObserver | undefined;

  try {
    observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) longTasks.push(entry.duration);
    });
    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    // Long task timing is unavailable in this browser; frame gaps still report.
  }

  let last = performance.now();
  let frame = 0;

  const sample = (now: number) => {
    frameGaps.push(now - last);
    last = now;

    if (now - start < PROFILE_DURATION_MS) {
      frame = requestAnimationFrame(sample);
    }
  };

  const start = performance.now();
  frame = requestAnimationFrame(sample);
  logSandbox("message", "Profiling timers for 10 s…");

  window.setTimeout(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
    const sorted = [...frameGaps].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? 0;
    const max = sorted.at(-1) ?? 0;

    logSandbox(
      "message",
      `Profile: ${longTasks.length} long task(s) [${longTasks.map((ms) => ms.toFixed(0)).join(", ")}] · frame gap p95 ${p95.toFixed(1)} ms, max ${max.toFixed(1)} ms over ${frameGaps.length} frames`,
    );
  }, PROFILE_DURATION_MS);
};

export type SandboxAction = () => void;

export const TIMERS_SCENARIOS = [
  {
    id: "timers-seed-20",
    label: "Seed 20 timers",
    group: "Timers",
    run: seedTimers(20),
  },
  {
    id: "timers-seed-200",
    label: "Seed 200 timers",
    group: "Timers",
    run: seedTimers(200),
  },
  {
    id: "timers-expire-first",
    label: "Expire first timer",
    group: "Timers",
    run: expireFirstTimer,
  },
  {
    id: "timers-toggle-layout",
    label: "Toggle layout",
    group: "Timers",
    run: toggleLayout,
  },
  {
    id: "timers-toggle-under-bag",
    label: "Toggle under bag",
    group: "Timers",
    run: toggleGeneralFlag("timersUnderBag"),
  },
  {
    id: "timers-toggle-grouping",
    label: "Toggle grouping",
    group: "Timers",
    run: toggleGeneralFlag("timersGrouping"),
  },
  {
    id: "timers-toggle-compact",
    label: "Toggle compact (legacy)",
    group: "Timers",
    run: toggleGeneralFlag("compactView"),
  },
  {
    id: "timers-profile",
    label: "Profile 10 s",
    group: "Timers",
    run: profileTimers,
  },
] as const satisfies readonly {
  id: string;
  label: string;
  group: "Timers";
  run: SandboxAction;
}[];
