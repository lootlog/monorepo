import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterAll, bench, describe } from "vitest";
import type { MargonemRuntimeAdapter } from "./runtime-adapter";
import { MargonemRuntimeBridge } from "./margonem-runtime-bridge";

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
    bridge.subscribeIncoming(() => undefined);
    bridge.install();
    bridge.setReady(true);
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
