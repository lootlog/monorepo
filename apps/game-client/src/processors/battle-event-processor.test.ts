import { afterEach, expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import type { GameEvent, W } from "@lootlog/margonem/game-events";
import {
  useBattleStore,
  MAX_BATTLE_CAPTURE_BYTES,
} from "@/store/game-store/battle.store";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { createBattleTest, createBattleWarrior } from "./battle-test-fixtures";
import { BattleEventProcessor } from "./battle-event-processor";

const pvpStart = (moves = ["start"]): GameEvent => ({
  f: {
    init: "1",
    m: moves,
    w: { "111": createBattleWarrior(111), "222": createBattleWarrior(222) },
  },
});
const end: GameEvent = { f: { endBattle: 1, m: ["end"] } };
afterEach(() => vi.restoreAllMocks());
it("ignores nonbattle packets and publishes combined initialization/warriors in one transaction", async () => {
  createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({});
  expect(useBattleStore.getState().battleState).toBe("idle");
  const changes = vi.fn<Parameters<typeof useBattleStore.subscribe>[0]>();
  const unsubscribe = useBattleStore.subscribe(changes);
  try {
    await processor.handle(pvpStart());
    expect(changes).toHaveBeenCalledOnce();
    expect(useBattleStore.getState().battleState).toBe("in-battle");
    expect(useBattleStore.getState().battleWarriors["111"]?.name).toBe(
      "Player 111",
    );
    expect(useBattleStore.getState().events).toHaveLength(1);
  } finally {
    unsubscribe();
  }
});
it("does not capture or send PvP battles when collection is disabled", async () => {
  const fixture = createBattleTest();
  useBattlePanelStore.setState({ isBattleCollectionEnabled: false });
  const processor = new BattleEventProcessor();
  await processor.handle(pvpStart());
  await processor.handle(end);
  expect(useBattleStore.getState().events).toEqual([]);
  expect(fixture.battles()).toHaveLength(0);
});
it("never submits a partial battle after the capture budget overflows", async () => {
  const fixture = createBattleTest();
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const processor = new BattleEventProcessor();
  await processor.handle(pvpStart(["x".repeat(MAX_BATTLE_CAPTURE_BYTES + 1)]));
  await processor.handle(end);
  expect(fixture.battles()).toHaveLength(0);
  expect(warning).toHaveBeenCalled();
});
it("submits actual mapped PvP events with stable identity and clears finished state", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle(pvpStart());
  await processor.handle(end);
  expect(fixture.battles()).toHaveLength(1);
  expect(fixture.kills()).toHaveLength(0);
  expect(await fixture.battles()[0]?.json()).toMatchObject({
    accountId: "67890",
    characterId: "12345",
    world: "pandora",
    submissionId: expect.stringMatching(/^[a-f0-9]{64}$/),
    events: [
      {
        f: {
          m: ["start"],
          init: "1",
          w: {
            "111": { name: "Player 111", team: 1 },
            "222": { name: "Player 222", team: 2 },
          },
        },
      },
      { f: { m: ["end"], endBattle: 1 } },
    ],
  });
  expect(useBattleStore.getState().battleState).toBe("idle");
  expect(useBattleStore.getState().events).toEqual([]);
  expect(useBattleStore.getState().lastBattleHash).toMatch(/^[a-f0-9]{64}$/);
});
it("does not submit a one-team battle", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({
    f: { init: "1", m: ["start"], w: { "111": createBattleWarrior(111) } },
  });
  await processor.handle(end);
  expect(fixture.requests).toHaveLength(0);
});
it.each([
  { weight: 9, tracked: false },
  { weight: 19, tracked: false },
  { weight: 20, tracked: true },
  { weight: 29, tracked: true },
  { weight: 85, tracked: true },
  { weight: 101, tracked: true },
])(
  "tracks dead NPC weight $weight only when eligible",
  async ({ weight, tracked }) => {
    const fixture = createBattleTest();
    const processor = new BattleEventProcessor();
    await processor.handle({
      f: {
        init: "1",
        w: {
          "111": createBattleWarrior(111),
          "-100": createBattleWarrior(-100, { wt: weight }),
        },
      },
    });
    await processor.handle(end);
    expect(fixture.kills()).toHaveLength(tracked ? 1 : 0);
    expect(fixture.battles()).toHaveLength(0);
  },
);
it("records only the highest-weight defeated NPC", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({
    f: {
      init: "1",
      w: {
        "-100": createBattleWarrior(-100, { wt: 85 }),
        "-200": createBattleWarrior(-200, { wt: 101, name: "Titan" }),
      },
    },
  });
  await processor.handle(end);
  expect(fixture.kills()).toHaveLength(1);
  expect(await fixture.kills()[0]?.json()).toMatchObject({
    world: "pandora",
    characterId: "12345",
    accountId: "67890",
    npc: { id: -200, name: "Titan", wt: 101 },
  });
});
it.each(["alive", "legacy-percent", "nested-current", "malformed"] as const)(
  "handles the %s NPC health representation",
  async (kind) => {
    const fixture = createBattleTest();
    const warrior = createBattleWarrior(-100, { hpp: 100 });
    if (kind === "legacy-percent") {
      // @ts-expect-error Legacy native packets can contain string HP; the runtime parser intentionally supports this representation.
      warrior.hpp = "0.00";
    } else if (kind === "nested-current") {
      // @ts-expect-error Simulate a native packet without legacy HP so the nested representation is selected.
      warrior.hpp = undefined;
      warrior.hp = { cur: "0" };
    } else if (kind === "malformed") {
      // @ts-expect-error Characterize malformed external HP without pretending it meets the declared native contract.
      warrior.hpp = "not hp";
      warrior.hp = { cur: "invalid" };
    }
    const processor = new BattleEventProcessor();
    await processor.handle({ f: { init: "1", w: { "-100": warrior } } });
    await processor.handle(end);
    expect(fixture.kills()).toHaveLength(
      kind === "legacy-percent" || kind === "nested-current" ? 1 : 0,
    );
  },
);
it("preserves distinct packets sharing an event id", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({ ...pvpStart(), ev: 77 });
  await processor.handle({ ev: 77, f: { m: ["middle"] } });
  await processor.handle({ ...end, ev: 78 });
  expect(await fixture.battles()[0]?.json()).toMatchObject({
    events: [
      { ev: 77, f: { m: ["start"] } },
      { ev: 77, f: { m: ["middle"] } },
      { ev: 78, f: { m: ["end"] } },
    ],
  });
});
it("submits incremental and compact replays only once using the actual digest", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({ ...pvpStart(), ev: 1 });
  await processor.handle({ ev: 2, f: { m: ["middle"] } });
  await processor.handle({ ...end, ev: 3 });
  await processor.handle({
    ev: 4,
    f: {
      ...pvpStart().f,
      init: "1",
      endBattle: 1,
      m: ["start", "middle", "end"],
    },
  });
  expect(fixture.battles()).toHaveLength(1);
});
it("does not submit the same completed battle twice", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle(pvpStart());
  await processor.handle(end);
  await processor.handle(pvpStart());
  await processor.handle(end);
  expect(fixture.battles()).toHaveLength(1);
});
const deferNextDigest = () => {
  const actual = crypto.subtle.digest.bind(crypto.subtle);
  const pending = Promise.withResolvers<ArrayBuffer>();
  vi.spyOn(crypto.subtle, "digest").mockImplementationOnce(
    () => pending.promise,
  );
  return {
    release: async () =>
      pending.resolve(await actual("SHA-256", new Uint8Array([1]))),
  };
};
it("publishes final warriors before digest completion", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({
    f: { init: "1", w: { "-100": createBattleWarrior(-100, { hpp: 100 }) } },
  });
  const digest = deferNextDigest();
  const finalization = processor.handle({
    f: { endBattle: 1, w: { "-100": createBattleWarrior(-100, { hpp: 0 }) } },
  });
  expect(useBattleStore.getState().battleWarriors["-100"]?.hpp).toBe(0);
  expect(fixture.kills()).toHaveLength(0);
  await digest.release();
  await finalization;
  expect(fixture.kills()).toHaveLength(1);
});
it("submits one immutable snapshot while digest computation is pending", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  const start = pvpStart();
  await processor.handle(start);
  const digest = deferNextDigest();
  const finalization = processor.handle(end);
  await processor.handle({ f: { m: ["late-turn"] } });
  await processor.handle(end);
  await digest.release();
  await finalization;
  expect(fixture.battles()).toHaveLength(1);
  expect(await fixture.battles()[0]?.json()).toMatchObject({
    events: [{ f: { m: ["start"] } }, { f: { m: ["end"] } }],
  });
});
it("does not overwrite a new battle when previous asynchronous finalization completes", async () => {
  const fixture = createBattleTest();
  const processor = new BattleEventProcessor();
  await processor.handle({
    f: { init: "1", w: { "-100": createBattleWarrior(-100) } },
  });
  const digest = deferNextDigest();
  const finalization = processor.handle(end);
  await processor.handle(pvpStart(["new"]));
  await digest.release();
  await finalization;
  expect(useBattleStore.getState().battleState).toBe("in-battle");
  expect(useBattleStore.getState().events).toMatchObject([
    { f: { m: ["new"] } },
  ]);
  expect(fixture.kills()).toHaveLength(0);
});
it.each(["battle", "kill"] as const)(
  "reports a %s HTTP failure",
  async (kind) => {
    const fixture = createBattleTest();
    fixture.fail();
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const processor = new BattleEventProcessor();
    const warriors: W =
      kind === "battle"
        ? { "111": createBattleWarrior(111), "222": createBattleWarrior(222) }
        : { "-100": createBattleWarrior(-100) };
    await processor.handle({ f: { init: "1", m: ["start"], w: warriors } });
    await processor.handle(end);
    await waitFor(() =>
      expect(warning).toHaveBeenCalledWith(
        `[BattleEventProcessor] Failed to create ${kind}:`,
        expect.any(Error),
      ),
    );
    expect(fixture.requests).toHaveLength(1);
  },
);
it("ignores an end packet while no battle is active", async () => {
  const fixture = createBattleTest();
  await new BattleEventProcessor().handle(end);
  expect(fixture.requests).toHaveLength(0);
});
