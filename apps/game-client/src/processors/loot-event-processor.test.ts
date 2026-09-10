import { RuntimeStateProjection } from "@/lib/margonem-runtime/runtime-state-projection";
import { parseRuntimeFacts } from "@/lib/margonem-runtime/runtime-event-parser";
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { configureApiClients } from "@lootlog/client/transport";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useSettingsStore } from "@/store/settings.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { LOOT_CREATE_DEBUG_PREFIX } from "@/lib/loot-create-debug";
import { LootEventProcessor } from "./loot-event-processor";
import { createBattleWarrior } from "./battle-test-fixtures";
import type { GameEvent, LootEvent } from "@lootlog/margonem/game-events";

const createLootEvent = (
  source: LootEvent["source"],
  rarity = "legendary",
  id = 1,
): GameEvent => ({
  f: {},
  item: {
    [id]: {
      tpl: id,
      hid: `hid-${id}`,
      icon: "loot.gif",
      name: "Legendarny miecz",
      pr: 1,
      prc: "1",
      st: 0,
      stat: `rarity=${rarity}`,
      own: 101,
      cl: 1,
      loc: "l",
    },
  },
  loot: { source, states: { [id]: 1 } },
});

const createBattleLootEvent = () => createLootEvent("fight");

const createRuntimeNpc = (id = 501, name = "Kliknięty NPC") => ({
  id,
  templateId: id,
  x: 1,
  y: 1,
  icon: "npc.gif",
  name,
  profession: "m",
  type: 3,
  weight: 90,
  level: 240,
});

const setDialogNpcContext = (
  npcId: number,
  npc: ReturnType<typeof createRuntimeNpc> | null = null,
) =>
  useDialogStore
    .getState()
    .setNpcContext({ npcId, npc, source: "talk-request" });

const createFixture = () => {
  const processor = new LootEventProcessor();
  const requests: Request[] = [];
  let status = 200;

  const fetch: typeof globalThis.fetch = (input, init) => {
    requests.push(new Request(input, init));

    return Promise.resolve(
      Response.json(
        { id: 999, submittedGuilds: [], rejectedGuilds: [] },
        { status },
      ),
    );
  };

  onTestFinished(
    configureApiClients({
      main: { baseUrl: "https://api.example.test", fetch },
    }),
  );

  return {
    processor,
    requests,
    payload: async (index = 0) => {
      await waitFor(() => expect(requests.length).toBeGreaterThan(index));

      return requests[index].json();
    },
    fail: () => {
      status = 400;
    },
    succeed: () => {
      status = 200;
    },
  };
};

beforeEach(() => {
  useBattleStore.setState({
    battleWarriors: {
      "101": {
        ...createBattleWarrior(101, {
          name: "Tester",
          originalId: 101,
          lvl: 230,
        }),
        accountId: 202,
      },
      "-501": createBattleWarrior(-501, {
        originalId: 501,
        wt: 20,
        name: "Boss",
      }),
    },
  });
  useLootStore.setState({ lastLootId: 44 });
  useDialogStore.getState().clearNpcContext();
  useNpcsStore.getState().clearNpcs();
  useOthersStore.getState().clearOthers();
  setTestRuntimeGame({
    world: "pandora",
    hero: {
      accountId: "202",
      characterId: "101",
      name: "Tester",
      level: 230,
      profession: "w",
      icon: "hero.gif",
      currentHp: 500,
      maxHp: 1000,
    },
    map: { id: 1, name: "Ithan", visibility: 30 },
  });
  useSettingsStore.getState().setLootDebugLoggingEnabled(false);
});

afterEach(() => vi.restoreAllMocks());

it("captures map characters and the hero once for a legendary elite II loot", async () => {
  const fixture = createFixture();
  useOthersStore.getState().replaceOthers({
    "303": {
      accountId: "404",
      characterId: "303",
      name: "Other",
      profession: "m",
      icon: "other.gif",
      level: 123,
    },
    "101": {
      accountId: "202",
      characterId: "101",
      name: "Tester",
      profession: "w",
      icon: "hero.gif",
      level: 230,
    },
  });
  fixture.processor.handleLootFromBattle(createBattleLootEvent());
  useOthersStore.getState().clearOthers();
  expect(await fixture.payload()).toMatchObject({
    mapPlayersSnapshot: [
      {
        accountId: 202,
        characterId: 101,
        name: "Tester",
        prof: "WARRIOR",
        icon: "hero.gif",
      },
      {
        accountId: 404,
        characterId: 303,
        name: "Other",
        prof: "MAGE",
        icon: "other.gif",
      },
    ],
  });
});

it.each([
  ["heroic", 20],
  ["legendary", 80],
  ["legendary", 100],
])("omits map characters for rarity %s and weight %s", async (rarity, wt) => {
  const fixture = createFixture();
  useOthersStore.getState().replaceOthers({});
  useBattleStore.setState({
    battleWarriors: {
      ...useBattleStore.getState().battleWarriors,
      "-502": createBattleWarrior(-502, { wt }),
    },
  });
  fixture.processor.handleLootFromBattle(createLootEvent("fight", rarity));
  expect(await fixture.payload()).not.toHaveProperty("mapPlayersSnapshot");
});

it.each(["invalid player", "different map epoch", "uninitialized list"])(
  "omits an inconsistent map snapshot: %s",
  async (reason) => {
    const fixture = createFixture();

    if (reason !== "uninitialized list")
      useOthersStore.getState().replaceOthers({
        "303": {
          accountId: reason === "invalid player" ? "" : "404",
          characterId: "303",
          name: "Other",
          profession: "m",
          icon: "other.gif",
          level: 123,
        },
      });
    const mapEpoch = useOthersStore.getState().mapEpoch;

    if (reason === "different map epoch")
      useOthersStore.setState({ mapEpoch: mapEpoch + 1 });
    fixture.processor.handleLootFromBattle(createBattleLootEvent());
    useOthersStore.setState({ mapEpoch });
    expect(await fixture.payload()).not.toHaveProperty("mapPlayersSnapshot");
  },
);

it("ignores absent items and the wrong source", () => {
  const fixture = createFixture();
  fixture.processor.handleLootFromBattle({});
  fixture.processor.handleLootFromBattle(createLootEvent("dialog"));
  fixture.processor.handleDialogLoot(createBattleLootEvent());
  expect(fixture.requests).toHaveLength(0);
  expect(useLootStore.getState().lastLootId).toBe(44);
});

it.each([
  "missing-battle-warriors",
  "missing-fight-data",
  "empty-parsed-loots",
])("reports why battle loot was skipped: %s", (reason) => {
  const fixture = createFixture();
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  useSettingsStore.getState().setLootDebugLoggingEnabled(true);
  const event = createBattleLootEvent();

  if (reason === "missing-battle-warriors")
    useBattleStore.setState({ battleWarriors: {} });

  if (reason === "missing-fight-data") delete event.f;

  if (reason === "empty-parsed-loots") event.item = {};
  fixture.processor.handleLootFromBattle(event);
  expect(fixture.requests).toHaveLength(0);
  expect(log).toHaveBeenCalledWith(
    LOOT_CREATE_DEBUG_PREFIX,
    expect.objectContaining({ source: "fight", stage: "skipped", reason }),
  );
  expect(useLootStore.getState().lastLootId).toBe(
    reason === "missing-battle-warriors" ? 44 : null,
  );
});

it("sends parsed battle participants and loot then stores the accepted id", async () => {
  const fixture = createFixture();
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  useSettingsStore.getState().setLootDebugLoggingEnabled(true);
  fixture.processor.handleLootFromBattle(createBattleLootEvent());
  expect(useLootStore.getState().lastLootId).toBeNull();
  expect(await fixture.payload()).toMatchObject({
    world: "pandora",
    source: "FIGHT",
    location: "Ithan",
    accountId: "202",
    characterId: "101",
    npcs: [{ id: 501, name: "Boss" }],
    players: [{ id: 101, name: "Tester" }],
    loots: [{ id: 1, name: "Legendarny miecz", stat: "rarity=legendary" }],
  });
  await waitFor(() => expect(useLootStore.getState().lastLootId).toBe(999));
  expect(log).toHaveBeenCalledWith(
    LOOT_CREATE_DEBUG_PREFIX,
    expect.objectContaining({
      source: "fight",
      stage: "completed",
      lastLootId: 999,
    }),
  );
});

it("submits different loot effects that share an event id", async () => {
  const fixture = createFixture();
  fixture.processor.handleLootFromBattle({
    ...createLootEvent("fight", "legendary", 1),
    ev: 77,
  });
  fixture.processor.handleLootFromBattle({
    ...createLootEvent("fight", "legendary", 2),
    ev: 77,
  });
  expect(await fixture.payload(0)).toMatchObject({ loots: [{ id: 1 }] });
  expect(await fixture.payload(1)).toMatchObject({ loots: [{ id: 2 }] });
  expect(fixture.requests).toHaveLength(2);
});

it("ignores dialog loot without a tracked NPC", () => {
  const fixture = createFixture();
  fixture.processor.handleDialogLoot(createLootEvent("dialog"));
  expect(fixture.requests).toHaveLength(0);
  expect(useLootStore.getState().lastLootId).toBe(44);
});

it.each(["context snapshot", "ingress snapshot", "canonical store"])(
  "attributes dialog loot through %s after unrelated NPC deletion",
  async (source) => {
    const fixture = createFixture();
    const npc = createRuntimeNpc();
    setDialogNpcContext(501, source === "context snapshot" ? npc : null);

    if (source === "canonical store")
      useNpcsStore.getState().replaceNpcs([npc]);
    fixture.processor.handleDialogLoot(
      { ...createLootEvent("dialog"), npcs_del: [{ id: 502 }, { id: 503 }] },
      {
        game: useGameStore.getState().game,
        intent: null,
        npcsById: source === "ingress snapshot" ? { 501: npc } : {},
        othersById: {},
      },
    );
    expect(useLootStore.getState().lastLootId).toBeNull();
    expect(await fixture.payload()).toMatchObject({
      source: "DIALOG",
      npcs: [{ id: 501, name: "Kliknięty NPC", hpp: 0, location: "Ithan" }],
      players: [{ id: 101, name: "Tester", hpp: 50, accountId: 202 }],
    });
    await waitFor(() => expect(useLootStore.getState().lastLootId).toBe(999));
  },
);

it.each([
  { id: 279097, lvl: 300, name: "Zamrożony czarodziej" },
  { id: 501, lvl: 0, name: "Nieznany dialog" },
])(
  "resolves level zero for dialog NPC $id to $lvl",
  async ({ id, lvl, name }) => {
    const fixture = createFixture();
    setDialogNpcContext(id, { ...createRuntimeNpc(id, name), level: 0 });
    fixture.processor.handleDialogLoot(createLootEvent("dialog", "unique"));
    expect(await fixture.payload()).toMatchObject({
      npcs: [{ id, lvl, name }],
    });
  },
);

it("reports missing dialog snapshot with the event's deleted NPC ids", () => {
  const fixture = createFixture();
  setDialogNpcContext(501);
  const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
  useSettingsStore.getState().setLootDebugLoggingEnabled(true);
  fixture.processor.handleDialogLoot({
    ...createLootEvent("dialog"),
    npcs_del: [{ id: 501 }],
  });
  expect(fixture.requests).toHaveLength(0);
  expect(useLootStore.getState().lastLootId).toBeNull();
  expect(log).toHaveBeenCalledWith(
    LOOT_CREATE_DEBUG_PREFIX,
    expect.objectContaining({
      source: "dialog",
      stage: "skipped",
      reason: "missing-dialog-npc-snapshot",
      npcId: 501,
      eventNpcDelIds: [501],
      resolutionSource: "fallback-lookup",
    }),
  );
});

it("retains dialog context through empty loot and consumes it after one valid loot", async () => {
  const fixture = createFixture();
  setDialogNpcContext(501, createRuntimeNpc());
  fixture.processor.handleDialogLoot({
    ...createLootEvent("dialog"),
    item: {},
  });
  expect(useDialogStore.getState().npcContext?.npcId).toBe(501);
  fixture.processor.handleDialogLoot(createLootEvent("dialog"));
  fixture.processor.handleDialogLoot(createLootEvent("dialog"));
  await fixture.payload();
  expect(fixture.requests).toHaveLength(1);
  expect(useDialogStore.getState().npcContext).toBeNull();
});

it.each(["fight", "dialog"] as const)(
  "logs actual HTTP rejection for %s loot",
  async (source) => {
    const fixture = createFixture();
    fixture.fail();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    setDialogNpcContext(501, createRuntimeNpc());
    const event = createLootEvent(source);

    if (source === "fight") fixture.processor.handleLootFromBattle(event);
    else fixture.processor.handleDialogLoot(event);
    await waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        source === "fight"
          ? "[LootEventProcessor] Failed to create loot:"
          : "[LootEventProcessor] Failed to create dialog loot:",
        expect.any(Error),
      ),
    );
    expect(log).toHaveBeenCalledWith(
      LOOT_CREATE_DEBUG_PREFIX,
      expect.objectContaining({
        source,
        stage: "failed",
        error: expect.any(Error),
      }),
    );
    fixture.succeed();
    setDialogNpcContext(501, createRuntimeNpc());

    if (source === "fight") {
      fixture.processor.handleLootFromBattle(event);
    } else {
      fixture.processor.handleDialogLoot(event);
    }

    await fixture.payload(1);
    await waitFor(() => expect(useLootStore.getState().lastLootId).toBe(999));
  },
);

it("uses same-event map, hero and membership updates and freezes them before the next event", async () => {
  const fixture = createFixture();
  useOthersStore.getState().replaceOthers({});
  const projection = new RuntimeStateProjection();

  const event = {
    ...createBattleLootEvent(),
    town: {
      id: 2,
      name: "New map",
      visibility: 30,
      mainid: 2,
      bg: "",
      file: "",
      mode: 0,
      pvp: 0,
      water: "",
      x: 0,
      y: 0,
    },
    h: { nick: "Updated hero" },
    other: {
      "303": {
        action: "CREATE",
        account: 404,
        nick: "Arriving",
        prof: "m",
        icon: "other.gif",
        lvl: 123,
        attr: 0,
        relation: 0,
        x: 0,
        y: 0,
        dir: 0,
        stasis: 0,
        stasis_incoming_seconds: 0,
        rights: 0,
        oplvl: 0,
        is_blessed: 0,
      },
    },
  } satisfies GameEvent;

  const envelope = projection.captureIngress({
    raw: event,
    facts: parseRuntimeFacts(event),
    observedAt: 1,
    sequence: 1,
    ingress: { game: null, intent: null, npcsById: {}, othersById: {} },
  });

  projection.apply(envelope);
  fixture.processor.handleLootFromBattle(event, envelope.ingress);
  useOthersStore.getState().removeOther("303");
  expect(await fixture.payload()).toMatchObject({
    location: "New map",
    mapPlayersSnapshot: [
      { characterId: 101, name: "Updated hero" },
      { characterId: 303, name: "Arriving" },
    ],
  });
});
