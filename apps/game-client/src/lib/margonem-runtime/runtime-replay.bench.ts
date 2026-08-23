import type { GameEvent, OtherEntry } from "@lootlog/margonem/game-events";
import { appendFileSync, writeFileSync } from "node:fs";
import { createElement, Profiler, type ProfilerOnRenderCallback } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, bench, describe } from "vitest";
import { EventDispatcher } from "@/lib/event-dispatcher";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";
import type { RuntimeInterface } from "./runtime.types";
import {
  NiRuntimeAdapter,
  SiRuntimeAdapter,
  type MargonemRuntimeAdapter,
} from "./runtime-adapter";
import { MargonemRuntimeBridge } from "./margonem-runtime-bridge";
import { RuntimeEventPipeline } from "./runtime-event-pipeline";
import { RuntimeStateProjection } from "./runtime-state-projection";

const runtimeReplayMetricsFile =
  process.env.RUNTIME_REPLAY_METRICS_FILE?.trim() || null;
if (runtimeReplayMetricsFile) {
  writeFileSync(runtimeReplayMetricsFile, "", "utf8");
}

const npcs = Array.from({ length: 120 }, (_, index) => ({
  icon: { id: index },
  id: index + 1,
  tpl: index + 1_000,
  x: index % 32,
  y: index % 24,
}));
const other = Object.fromEntries(
  Array.from({ length: 50 }, (_, index) => [
    String(index + 1),
    { dir: index % 4, x: index % 32, y: index % 24 },
  ]),
);
const warriors = Object.fromEntries(
  Array.from({ length: 50 }, (_, index) => [
    String(index + 1),
    {
      hpp: 100,
      icon: "warrior.gif",
      id: index + 1,
      lvl: 300,
      name: `Player ${index + 1}`,
      originalId: index + 1,
      prof: "w",
      team: index % 2,
      type: 0,
      wt: 0,
    },
  ]),
);
const replayEvent = {
  f: { init: "1", m: ["turn"], w: warriors },
  item: {},
  loot: { source: "fight" },
  npcs,
  npcs_del: [{ id: 2 }, { id: 70 }, { id: 119 }],
  other,
} as unknown as GameEvent;
const stringReplayEvent = JSON.stringify(replayEvent);
const npcTemplates = npcs.map((npc) => ({
  id: npc.tpl,
  level: 300,
  nick: `Npc ${npc.id}`,
  prof: "m",
  resp_rand: 10,
  type: 2,
  warrior_type: 85,
}));
const npcIcons = npcs.map((npc) => ({
  icon: "npc.gif",
  id: npc.icon.id,
}));
const fullReplayEvent = {
  ...replayEvent,
  chat: { channels: [] },
} as unknown as GameEvent;
const npcMetadataEvent = {
  icons: npcIcons,
  npc_tpls: npcTemplates,
} as unknown as GameEvent;

const game = Object.freeze({
  hero: Object.freeze({
    accountId: "1",
    characterId: "1",
    currentHp: 1,
    icon: "hero.gif",
    level: 300,
    maxHp: 1,
    name: "Hero",
    profession: "w",
    x: 1,
    y: 1,
  }),
  interface: "si" as const,
  map: Object.freeze({ id: 1, name: "Benchmark", visibility: 30 }),
  world: "benchmark",
});
const runtimeOthers = Object.freeze(
  Object.fromEntries(
    Array.from({ length: 50 }, (_, index) => {
      const id = String(index + 1);
      return [
        id,
        Object.freeze({
          accountId: String(index + 10_000),
          characterId: id,
          icon: "warrior.gif",
          level: 300,
          name: `Player ${id}`,
          profession: "w",
        }),
      ];
    }),
  ),
);
const adapter = {
  getGameSnapshot: () => game,
  getNpc: () => undefined,
  getOther: (id: string) => runtimeOthers[id],
} as unknown as MargonemRuntimeAdapter;

describe("runtime bridge mixed replay (50 players, 120 NPCs)", () => {
  const runtimeWindow = window as Window & {
    successData?: (payload: GameEvent | string) => unknown;
  };
  const originalSuccessData = runtimeWindow.successData;
  const bridge = new MargonemRuntimeBridge({ adapter, interface: "si" });
  let dispatchPayload: ((payload: GameEvent | string) => unknown) | null = null;
  const dispatch = (payload: GameEvent | string) => {
    if (dispatchPayload) return dispatchPayload(payload);
    runtimeWindow.successData = () => undefined;
    bridge.install();
    if (!runtimeWindow.successData) {
      throw new Error("Runtime benchmark bridge did not install");
    }
    dispatchPayload = runtimeWindow.successData.bind(runtimeWindow);
    return dispatchPayload(payload);
  };

  afterAll(() => {
    bridge.cleanup();
    runtimeWindow.successData = originalSuccessData;
  });

  bench(
    "object payload",
    () => {
      dispatch(replayEvent);
    },
    { iterations: 2_000, warmupIterations: 200 },
  );

  bench(
    "string payload",
    () => {
      dispatch(stringReplayEvent);
    },
    { iterations: 2_000, warmupIterations: 200 },
  );
});

type ReplayWindow = Window & {
  Engine?: {
    communication: { parseJSON: (payload: GameEvent | string) => unknown };
    hero: { d: Record<string, unknown> };
    interface: { alreadyInitialised: boolean };
    map: { d: Record<string, unknown> };
    npcs: {
      check: () => Record<string, { d: Record<string, unknown> }>;
      getById: (id: number) => { d: Record<string, unknown> } | undefined;
    };
    others: {
      check: () => Record<string, { d: Record<string, unknown> }>;
      getById: (id: number) => { d: Record<string, unknown> } | undefined;
    };
    worldConfig: { getWorldName: () => string };
  };
  g?: Record<string, unknown>;
  hero?: Record<string, unknown>;
  map?: Record<string, unknown>;
  successData?: (payload: GameEvent | string) => unknown;
};

type FullReplayHarness = {
  bridge: MargonemRuntimeBridge;
  cleanup: () => void;
  dispatch: (payload: GameEvent | string) => unknown;
  getMetrics: () => {
    commits: number;
    dispatches: number;
    gameStoreUpdates: number;
    gameSnapshotReads: number;
    npcReads: number;
    npcsStoreUpdates: number;
    otherReads: number;
    othersStoreUpdates: number;
  };
  resetMetrics: () => void;
};

type BenchmarkController = {
  addEventListener: (type: "cycle", listener: (event: Event) => void) => void;
  removeEventListener: (
    type: "cycle",
    listener: (event: Event) => void,
  ) => void;
};

type BenchmarkCycleEvent = Event & {
  task: {
    name: string;
    result?: { samples: number[] };
  };
};

const heroMovementEvent = {
  h: { x: 12, y: 8 },
} as unknown as GameEvent;
const alternateHeroMovementEvent = {
  h: { x: 13, y: 8 },
} as unknown as GameEvent;

function RuntimeReplayProjection() {
  const heroX = useGameStore((state) => state.game?.hero.x);
  const visibleOtherCount = useOthersStore(
    (state) => Object.keys(state.othersById).length,
  );

  return createElement("output", null, `${heroX}:${visibleOtherCount}`);
}

function createCountingAdapter(
  adapter: MargonemRuntimeAdapter,
  onGameSnapshotRead: () => void,
  onNpcRead: () => void,
  onOtherRead: () => void,
): MargonemRuntimeAdapter {
  return {
    interface: adapter.interface,
    getAllNpcs: () => adapter.getAllNpcs(),
    getAllOtherHandles: () => adapter.getAllOtherHandles(),
    getAllOthers: () => adapter.getAllOthers(),
    getGameSnapshot: () => {
      onGameSnapshotRead();
      return adapter.getGameSnapshot();
    },
    getNpc: (id) => {
      onNpcRead();
      return adapter.getNpc(id);
    },
    getOther: (id) => {
      onOtherRead();
      return adapter.getOther(id);
    },
    getOtherHandle: (id) => adapter.getOtherHandle(id),
    getParty: () => adapter.getParty(),
    getStateSnapshot: () => adapter.getStateSnapshot(),
    isReady: () => adapter.isReady(),
  };
}

function createFullReplayHarness(
  runtimeInterface: RuntimeInterface,
): FullReplayHarness {
  const reactEnvironment = globalThis as typeof globalThis & {
    IS_REACT_ACT_ENVIRONMENT?: boolean;
  };
  const previousReactActEnvironment = reactEnvironment.IS_REACT_ACT_ENVIRONMENT;
  reactEnvironment.IS_REACT_ACT_ENVIRONMENT = false;
  const replayWindow = window as ReplayWindow;
  const previousRuntime = {
    Engine: replayWindow.Engine,
    g: replayWindow.g,
    hero: replayWindow.hero,
    map: replayWindow.map,
    successData: replayWindow.successData,
  };
  const rawHero = {
    account: 1,
    id: 1,
    img: "hero.gif",
    lvl: 300,
    nick: "Hero",
    prof: "w",
    warrior_stats: { hp: 10_000, maxhp: 10_000 },
    x: 12,
    y: 8,
  };
  const rawMap = { id: 1, name: "Benchmark", visibility: 30 };
  const rawNpcs = Object.fromEntries(
    npcs.map((entry) => [
      String(entry.id),
      {
        icon: "npc.gif",
        id: entry.id,
        lvl: 300,
        nick: `Npc ${entry.id}`,
        prof: "m",
        tpl: entry.tpl,
        type: 2,
        wt: 85,
        x: entry.x,
        y: entry.y,
      },
    ]),
  );
  const rawOthers = Object.fromEntries(
    Object.keys(other).map((id) => [
      id,
      {
        account: Number(id) + 10_000,
        icon: "warrior.gif",
        id: Number(id),
        lvl: 300,
        nick: `Player ${id}`,
        prof: "w",
        x: 1,
        y: 1,
      },
    ]),
  );
  let gameSnapshotReads = 0;
  let dispatches = 0;
  let npcReads = 0;
  let npcsStoreUpdates = 0;
  let otherReads = 0;
  let gameStoreUpdates = 0;
  let othersStoreUpdates = 0;
  let commits = 0;

  const originalHandler = (payload: GameEvent | string): string => {
    const event = typeof payload === "string" ? JSON.parse(payload) : payload;
    if (event.h) {
      rawHero.x = rawHero.x === 12 ? 13 : 12;
    }
    for (const [id, entry] of Object.entries(event.other ?? {}) as [
      string,
      OtherEntry,
    ][]) {
      if ("del" in entry) {
        delete rawOthers[id];
        continue;
      }
      if ("x" in entry) rawOthers[id].x = entry.x;
      if ("y" in entry) rawOthers[id].y = entry.y;
    }
    for (const deletion of event.npcs_del ?? []) {
      delete rawNpcs[String(deletion.id)];
    }
    return "game-result";
  };

  if (runtimeInterface === "ni") {
    const niOthers = Object.fromEntries(
      Object.entries(rawOthers).map(([id, value]) => [id, { d: value }]),
    );
    replayWindow.Engine = {
      communication: { parseJSON: originalHandler },
      hero: { d: rawHero },
      interface: { alreadyInitialised: true },
      map: { d: rawMap },
      npcs: {
        check: () =>
          Object.fromEntries(
            Object.entries(rawNpcs).map(([id, value]) => [id, { d: value }]),
          ),
        getById: (id) => {
          const value = rawNpcs[String(id)];
          return value ? { d: value } : undefined;
        },
      },
      others: {
        check: () => niOthers,
        getById: (id) => niOthers[String(id)],
      },
      worldConfig: { getWorldName: () => "benchmark" },
    };
  } else {
    replayWindow.Engine = undefined;
    replayWindow.hero = rawHero;
    replayWindow.map = rawMap;
    replayWindow.g = {
      init: 5,
      npc: rawNpcs,
      other: rawOthers,
      worldConfig: { getWorldName: () => "benchmark" },
    };
    replayWindow.successData = originalHandler;
  }

  const baseAdapter =
    runtimeInterface === "ni" ? new NiRuntimeAdapter() : new SiRuntimeAdapter();
  const adapter = createCountingAdapter(
    baseAdapter,
    () => {
      gameSnapshotReads += 1;
    },
    () => {
      npcReads += 1;
    },
    () => {
      otherReads += 1;
    },
  );
  const bridge = new MargonemRuntimeBridge({
    adapter,
    interface: runtimeInterface,
  });
  const projection = new RuntimeStateProjection({ adapter });
  const pipeline = new RuntimeEventPipeline({ bridge, projection });
  const dispatcher = new EventDispatcher(pipeline);
  projection.bootstrap();
  pipeline.install();
  dispatcher.register();
  if (!bridge.install()) {
    throw new Error(`Could not install ${runtimeInterface} replay bridge`);
  }
  pipeline.setReady(true);

  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  const onRender: ProfilerOnRenderCallback = () => {
    commits += 1;
  };
  flushSync(() => {
    root.render(
      createElement(
        Profiler,
        { id: `${runtimeInterface}-runtime-replay`, onRender },
        createElement(RuntimeReplayProjection),
      ),
    );
  });
  const unsubscribeGameStore = useGameStore.subscribe(() => {
    gameStoreUpdates += 1;
  });
  const unsubscribeOthersStore = useOthersStore.subscribe(() => {
    othersStoreUpdates += 1;
  });
  const unsubscribeNpcsStore = useNpcsStore.subscribe(() => {
    npcsStoreUpdates += 1;
  });
  const resetMetrics = () => {
    commits = 0;
    dispatches = 0;
    gameSnapshotReads = 0;
    npcReads = 0;
    npcsStoreUpdates = 0;
    gameStoreUpdates = 0;
    otherReads = 0;
    othersStoreUpdates = 0;
  };
  const inbound =
    runtimeInterface === "ni"
      ? replayWindow.Engine?.communication.parseJSON
      : replayWindow.successData;
  if (!inbound) throw new Error("Runtime replay inbound seam is unavailable");
  let useAlternateHeroPosition = true;

  inbound.call(replayWindow, npcMetadataEvent);
  pipeline.flush();
  resetMetrics();
  return {
    bridge,
    cleanup: () => {
      unsubscribeGameStore();
      unsubscribeNpcsStore();
      unsubscribeOthersStore();
      flushSync(() => root.unmount());
      container.remove();
      dispatcher.cleanup();
      pipeline.cleanup();
      projection.cleanup();
      bridge.cleanup();
      replayWindow.Engine = previousRuntime.Engine;
      replayWindow.g = previousRuntime.g;
      replayWindow.hero = previousRuntime.hero;
      replayWindow.map = previousRuntime.map;
      replayWindow.successData = previousRuntime.successData;
      reactEnvironment.IS_REACT_ACT_ENVIRONMENT = previousReactActEnvironment;
    },
    dispatch: (payload) => {
      dispatches += 1;
      let effectivePayload = payload;
      if (payload === heroMovementEvent) {
        effectivePayload = useAlternateHeroPosition
          ? alternateHeroMovementEvent
          : heroMovementEvent;
        useAlternateHeroPosition = !useAlternateHeroPosition;
      }
      const result = inbound.call(replayWindow, effectivePayload);
      pipeline.flush();
      return result;
    },
    getMetrics: () => ({
      commits,
      dispatches,
      gameSnapshotReads,
      npcReads,
      npcsStoreUpdates,
      gameStoreUpdates,
      otherReads,
      othersStoreUpdates,
    }),
    resetMetrics,
  };
}

function getLatencyPercentiles(samples: readonly number[]): {
  p50: number;
  p95: number;
} {
  const durations = [...samples].sort((left, right) => left - right);
  return {
    p50: durations[Math.floor(durations.length * 0.5)] ?? 0,
    p95: durations[Math.floor(durations.length * 0.95)] ?? 0,
  };
}

for (const runtimeInterface of ["ni", "si"] as const) {
  describe(`${runtimeInterface.toUpperCase()} full projected pipeline`, () => {
    let harness: FullReplayHarness | null = null;
    const getHarness = (benchmark: BenchmarkController) => {
      if (harness) return harness;

      harness = createFullReplayHarness(runtimeInterface);
      const handleCycle = (event: Event) => {
        if (!harness) return;
        const task = (event as BenchmarkCycleEvent).task;
        const metrics = harness.getMetrics();
        if (task.result) {
          const latency = getLatencyPercentiles(task.result.samples);
          if (runtimeReplayMetricsFile) {
            appendFileSync(
              runtimeReplayMetricsFile,
              `${JSON.stringify({
                commits: metrics.commits,
                dispatches: metrics.dispatches,
                gameSnapshotReads: metrics.gameSnapshotReads,
                npcReads: metrics.npcReads,
                npcsStoreUpdates: metrics.npcsStoreUpdates,
                otherReads: metrics.otherReads,
                p50Ms: latency.p50,
                p95Ms: latency.p95,
                runtimeInterface,
                samples: task.result.samples.length,
                scenario: task.name,
                storeUpdates:
                  metrics.gameStoreUpdates +
                  metrics.npcsStoreUpdates +
                  metrics.othersStoreUpdates,
              })}\n`,
              "utf8",
            );
          }
        }
        if (
          task.name.startsWith("50-player movement") &&
          (metrics.gameSnapshotReads !== 0 ||
            metrics.npcReads !== 0 ||
            metrics.otherReads !== 0 ||
            metrics.gameStoreUpdates !== 0 ||
            metrics.npcsStoreUpdates !== 0 ||
            metrics.othersStoreUpdates !== 0 ||
            metrics.commits !== 0)
        ) {
          throw new Error(
            `${runtimeInterface.toUpperCase()} movement replay performed inactive overlay work`,
          );
        }
        if (
          task.name.startsWith("crowded battle") &&
          (metrics.gameSnapshotReads !== 0 ||
            metrics.npcReads !== 0 ||
            metrics.otherReads !== 0 ||
            metrics.gameStoreUpdates !== 0 ||
            metrics.othersStoreUpdates !== 0 ||
            metrics.npcsStoreUpdates !== metrics.dispatches ||
            metrics.commits !== 0)
        ) {
          throw new Error(
            `${runtimeInterface.toUpperCase()} crowded replay violated its runtime work budget`,
          );
        }

        harness.cleanup();
        harness = null;
        benchmark.removeEventListener("cycle", handleCycle);
      };
      benchmark.addEventListener("cycle", handleCycle);

      return harness;
    };

    bench(
      "hero movement through adapters, processors, Zustand and React",
      function () {
        const activeHarness = getHarness(
          this as unknown as BenchmarkController,
        );
        flushSync(() => activeHarness.dispatch(heroMovementEvent));
      },
      { iterations: 1_000, warmupIterations: 100 },
    );

    bench(
      "50-player movement through adapters, processors, Zustand and React",
      function () {
        const activeHarness = getHarness(
          this as unknown as BenchmarkController,
        );
        flushSync(() =>
          activeHarness.dispatch({ other } as unknown as GameEvent),
        );
      },
      { iterations: 1_000, warmupIterations: 100 },
    );

    bench(
      "crowded battle, NPC, loot and movement replay",
      function () {
        const activeHarness = getHarness(
          this as unknown as BenchmarkController,
        );
        flushSync(() => activeHarness.dispatch(fullReplayEvent));
      },
      { iterations: 500, warmupIterations: 50 },
    );
  });
}
