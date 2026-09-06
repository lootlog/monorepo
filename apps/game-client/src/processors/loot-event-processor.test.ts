import { RuntimeStateProjection } from "@/lib/margonem-runtime/runtime-state-projection";
import { parseRuntimeFacts } from "@/lib/margonem-runtime/runtime-event-parser";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { LOOT_CREATE_DEBUG_PREFIX } from "@/lib/loot-create-debug";
import { useSettingsStore } from "@/store/settings.store";
import { LootEventProcessor } from "./loot-event-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type * as ApiModule from "@/api";
import { useGameStore } from "@/store/game.store";
import { useOthersStore } from "@/store/others.store";
import { useNpcsStore } from "@/store/npcs.store";

const { mockCreateLoot, mockGetLoot, mockGetBattleParticipants, mockGame } =
  vi.hoisted(() => ({
    mockCreateLoot: vi.fn(),
    mockGetLoot: vi.fn(),
    mockGetBattleParticipants: vi.fn(),
    mockGame: {
      hero: {
        id: 101,
        account: 202,
        nick: "Tester",
        lvl: 230,
        prof: "w",
        img: "hero.gif",
        warrior_stats: {
          hp: 500,
          maxhp: 1000,
        },
      },
      map: {
        name: "Ithan",
      },
      getWorldName: vi.fn(() => "pandora"),
      getNpc: vi.fn(),
    },
  }));

vi.mock("@/api", async (importOriginal) => {
  const originalModule = await importOriginal<typeof ApiModule>();

  return {
    ...originalModule,
    createLoot: (...args: unknown[]) => mockCreateLoot(...args),
  };
});

vi.mock("@/utils/game/get-loots", () => ({
  getLoot: (...args: unknown[]) => mockGetLoot(...args),
}));

vi.mock("@/utils/game/get-battle-participants", () => ({
  getBattleParticipants: (...args: unknown[]) =>
    mockGetBattleParticipants(...args),
}));

vi.mock("@/lib/game", () => ({
  Game: mockGame,
}));

const createBattleWarrior = () => ({
  id: 1,
  originalId: 1,
  name: "Tester",
  icon: "hero.gif",
  hpp: 100,
  prof: "w",
  lvl: 230,
  wt: 0,
  type: 0,
  team: 1,
});

const createBattleLootEvent = (): GameEvent =>
  ({
    f: {},
    item: {
      "1": {
        tpl: 1,
      },
    },
    loot: {
      source: "fight",
      states: {},
    },
  }) as unknown as GameEvent;

const createDialogLootEvent = (npcIds?: number[]): GameEvent =>
  ({
    item: {
      "1": {
        tpl: 1,
      },
    },
    loot: {
      source: "dialog",
      states: {},
    },
    npcs_del: npcIds?.map((id) => ({ id })),
  }) as unknown as GameEvent;

const createGameNpc = (id: number, nick: string) => ({
  id,
  tpl: id,
  x: 1,
  y: 1,
  icon: "npc.gif",
  nick,
  prof: "m",
  type: 3,
  wt: 90,
  lvl: 240,
});

const createRuntimeNpc = (id: number, name: string) => ({
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
) => {
  const npcContext = {
    npcId,
    npc,
    source: "talk-request" as const,
  };
  useDialogStore.getState().setNpcContext(npcContext);
  return npcContext;
};

describe("LootEventProcessor", () => {
  let processor: LootEventProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new LootEventProcessor();
    useBattleStore.setState({
      events: [],
      battleState: "idle",
      lastBattleHash: "",
      lastKillHash: "",
      battleWarriors: {},
    });
    useLootStore.setState({
      lastLootId: 44,
    });
    useDialogStore.getState().clearNpcContext();
    useNpcsStore.getState().clearNpcs();
    useOthersStore.getState().clearOthers();
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "202",
        characterId: "101",
        currentHp: 500,
        icon: "hero.gif",
        level: 230,
        maxHp: 1000,
        name: "Tester",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Ithan", visibility: 30 },
      world: "pandora",
    });
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);
  });

  it("captures map characters and the hero once for a legendary elite II loot", () => {
    useBattleStore.setState({ battleWarriors: { "1": createBattleWarrior() } });
    mockGetLoot.mockReturnValue([{ id: 1, stat: "rarity=legendary" }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, wt: 20, type: 2, prof: "w" }],
      party: [],
    });
    mockCreateLoot.mockResolvedValue({ id: 999 });
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
    processor.handleLootFromBattle(createBattleLootEvent());
    useOthersStore.getState().clearOthers();
    expect(mockCreateLoot.mock.calls[0][0].mapPlayersSnapshot).toEqual([
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
    ]);
  });

  it("uses same-event map, hero and membership updates and freezes them before the next event", () => {
    useBattleStore.setState({ battleWarriors: { "1": createBattleWarrior() } });
    mockGetLoot.mockReturnValue([{ id: 1, stat: "rarity=legendary" }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, wt: 20, type: 2, prof: "w" }],
      party: [],
    });
    mockCreateLoot.mockResolvedValue({ id: 999 });
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
    processor.handleLootFromBattle(event, envelope.ingress);
    useOthersStore.getState().removeOther("303");
    expect(mockCreateLoot.mock.calls[0][0]).toMatchObject({
      location: "New map",
      mapPlayersSnapshot: [
        { characterId: 101, name: "Updated hero" },
        { characterId: 303, name: "Arriving" },
      ],
    });
  });

  it("omits a snapshot when a higher-weight NPC is not elite II", () => {
    useBattleStore.setState({ battleWarriors: { "1": createBattleWarrior() } });
    mockGetLoot.mockReturnValue([{ id: 1, stat: "rarity=legendary" }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [
        { wt: 20, type: 2, prof: "w" },
        { wt: 80, type: 2, prof: "w" },
      ],
      party: [],
    });
    mockCreateLoot.mockResolvedValue({ id: 999 });
    useOthersStore.getState().replaceOthers({});
    processor.handleLootFromBattle(createBattleLootEvent());
    expect(mockCreateLoot.mock.calls[0][0]).not.toHaveProperty(
      "mapPlayersSnapshot",
    );
  });

  it.each([
    ["heroic", 20],
    ["legendary", 80],
    ["legendary", 100],
  ])("omits map characters for rarity %s and weight %s", (rarity, wt) => {
    useBattleStore.setState({ battleWarriors: { "1": createBattleWarrior() } });
    mockGetLoot.mockReturnValue([{ id: 1, stat: `rarity=${rarity}` }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, wt, type: 2, prof: "w" }],
      party: [],
    });
    mockCreateLoot.mockResolvedValue({ id: 999 });
    useOthersStore.getState().replaceOthers({});
    processor.handleLootFromBattle(createBattleLootEvent());
    expect(mockCreateLoot.mock.calls[0][0]).not.toHaveProperty(
      "mapPlayersSnapshot",
    );
  });

  it.each(["invalid player", "different map epoch"])(
    "omits an inconsistent map snapshot: %s",
    (reason) => {
      useBattleStore.setState({
        battleWarriors: { "1": createBattleWarrior() },
      });
      mockGetLoot.mockReturnValue([{ id: 1, stat: "rarity=legendary" }]);
      mockGetBattleParticipants.mockReturnValue({
        npcs: [{ id: 501, wt: 20, type: 2, prof: "w" }],
        party: [],
      });
      mockCreateLoot.mockResolvedValue({ id: 999 });
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
      processor.handleLootFromBattle(createBattleLootEvent());
      useOthersStore.setState({ mapEpoch });
      expect(mockCreateLoot.mock.calls[0][0]).not.toHaveProperty(
        "mapPlayersSnapshot",
      );
    },
  );

  it("submits the loot without an uninitialized map list", () => {
    useBattleStore.setState({ battleWarriors: { "1": createBattleWarrior() } });
    mockGetLoot.mockReturnValue([{ id: 1, stat: "rarity=legendary" }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, wt: 20, type: 2, prof: "w" }],
      party: [],
    });
    mockCreateLoot.mockResolvedValue({ id: 999 });
    processor.handleLootFromBattle(createBattleLootEvent());
    expect(mockCreateLoot.mock.calls[0][0]).not.toHaveProperty(
      "mapPlayersSnapshot",
    );
  });

  it("ignores battle loot when item is missing or source is not fight", () => {
    processor.handleLootFromBattle({});
    processor.handleLootFromBattle(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBe(44);
  });

  it("ignores battle loot when there are no tracked battle warriors", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000002",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);

    processor.handleLootFromBattle(createBattleLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBe(44);
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000002",
      reason: "missing-battle-warriors",
      source: "fight",
      stage: "skipped",
    });
  });

  it("creates loot from battle and stores returned loot id", async () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000001",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot.mockReturnValue([
      {
        id: 1,
        name: "Legendarny miecz",
      },
    ]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, name: "Boss" }],
      party: [{ id: 101, name: "Tester" }],
    });
    mockCreateLoot.mockResolvedValue({
      id: 999,
    });

    const event = createBattleLootEvent();
    const expectedPayload = {
      world: "pandora",
      source: "FIGHT",
      location: "Ithan",
      npcs: [{ id: 501, name: "Boss" }],
      loots: [{ id: 1, name: "Legendarny miecz" }],
      players: [{ id: 101, name: "Tester" }],
      accountId: "202",
      characterId: "101",
    };

    processor.handleLootFromBattle(event);

    expect(useLootStore.getState().lastLootId).toBeNull();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGetBattleParticipants).toHaveBeenCalledWith(
      useBattleStore.getState().battleWarriors,
      useGameStore.getState().game,
    );
    expect(mockCreateLoot).toHaveBeenCalledWith(expectedPayload, {
      attemptId: "00000000-0000-4000-8000-000000000001",
      source: "fight",
    });
    expect(useLootStore.getState().lastLootId).toBe(999);
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000001",
      battleWarriors: useBattleStore.getState().battleWarriors,
      event,
      source: "fight",
      stage: "event-detected",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000001",
      payload: expectedPayload,
      source: "fight",
      stage: "request-prepared",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000001",
      lastLootId: 999,
      response: { id: 999 },
      source: "fight",
      stage: "completed",
    });
  });

  it("submits different battle loot effects that share an event id", () => {
    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot
      .mockReturnValueOnce([{ id: 1, name: "Legendarny miecz" }])
      .mockReturnValueOnce([{ id: 2, name: "Legendarny łuk" }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501, name: "Boss" }],
      party: [{ id: 101, name: "Tester" }],
    });
    mockCreateLoot.mockResolvedValue({ id: 999 });
    const event = { ...createBattleLootEvent(), ev: 77 };

    processor.handleLootFromBattle(event);
    processor.handleLootFromBattle(event);

    expect(mockCreateLoot).toHaveBeenCalledTimes(2);
  });

  it("stops battle loot creation when parsed loot list is empty", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000003",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot.mockReturnValue([]);

    processor.handleLootFromBattle(createBattleLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBeNull();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000003",
      reason: "empty-parsed-loots",
      source: "fight",
      stage: "skipped",
    });
  });

  it("logs when battle fight data is missing", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000004",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    const event = createBattleLootEvent();
    delete event.f;

    processor.handleLootFromBattle(event);

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000004",
      reason: "missing-fight-data",
      source: "fight",
      stage: "skipped",
    });
  });

  it("logs warning and permits retry when battle loot request fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000005",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);

    useBattleStore.setState({
      battleWarriors: {
        "1": createBattleWarrior(),
      },
    });
    mockGetLoot.mockReturnValue([{ id: 1 }]);
    mockGetBattleParticipants.mockReturnValue({
      npcs: [{ id: 501 }],
      party: [{ id: 101 }],
    });
    mockCreateLoot.mockRejectedValue(new Error("battle failed"));

    const event = createBattleLootEvent();
    processor.handleLootFromBattle(event);

    await Promise.resolve();
    await Promise.resolve();

    mockCreateLoot.mockResolvedValue({ id: 999 });
    processor.handleLootFromBattle(event);

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[LootEventProcessor] Failed to create loot:",
      expect.any(Error),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000005",
      error: expect.any(Error),
      source: "fight",
      stage: "failed",
    });
    expect(mockCreateLoot).toHaveBeenCalledTimes(2);
  });

  it("ignores dialog loot without tracked npc", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000007",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);

    processor.handleDialogLoot(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBe(44);
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000007",
      eventNpcDelIds: [],
      reason: "missing-dialog-npc-context",
      source: "dialog",
      stage: "skipped",
    });
  });

  it("creates dialog loot using the tracked npc context", async () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000006",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    const npcContext = setDialogNpcContext(501);
    mockGetLoot.mockReturnValue([{ id: 7, name: "Łup" }]);
    mockGame.getNpc.mockReturnValue(createGameNpc(501, "Mokra bestia"));
    useNpcsStore
      .getState()
      .replaceNpcs([createRuntimeNpc(501, "Mokra bestia")]);
    mockCreateLoot.mockResolvedValue({
      id: 321,
    });

    const event = createDialogLootEvent([501]);
    const expectedPayload = {
      world: "pandora",
      source: "DIALOG",
      location: "Ithan",
      loots: [{ id: 7, name: "Łup" }],
      npcs: [
        {
          icon: "npc.gif",
          id: 501,
          name: "Mokra bestia",
          prof: "m",
          hpp: 0,
          type: 3,
          wt: 90,
          lvl: 240,
          location: "Ithan",
        },
      ],
      players: [
        {
          id: 101,
          name: "Tester",
          icon: "hero.gif",
          prof: "w",
          hpp: 50,
          lvl: 230,
          accountId: 202,
        },
      ],
      accountId: "202",
      characterId: "101",
    };

    processor.handleDialogLoot(event);

    expect(useLootStore.getState().lastLootId).toBeNull();

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledWith(expectedPayload, {
      attemptId: "00000000-0000-4000-8000-000000000006",
      source: "dialog",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000006",
      dialogNpcContext: npcContext,
      event,
      eventNpcDelIds: [501],
      source: "dialog",
      stage: "event-detected",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000006",
      eventNpcDelIds: [501],
      payload: expectedPayload,
      resolutionSource: "fallback-lookup",
      source: "dialog",
      stage: "request-prepared",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000006",
      lastLootId: 321,
      response: { id: 321 },
      source: "dialog",
      stage: "completed",
    });
    expect(useLootStore.getState().lastLootId).toBe(321);
  });

  it("uses the configured level for a known mine npc", async () => {
    setDialogNpcContext(279097, {
      ...createRuntimeNpc(279097, "Zamrożony czarodziej"),
      level: 0,
    });
    mockGetLoot.mockReturnValue([
      { id: 7, name: "Fiolka magicznego pyłu", stat: "lvl=1;rarity=unique" },
    ]);
    mockCreateLoot.mockResolvedValue({ id: 321 });

    processor.handleDialogLoot(createDialogLootEvent([279097]));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledTimes(1);
    expect(mockCreateLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        npcs: [
          expect.objectContaining({
            id: 279097,
            lvl: 300,
            name: "Zamrożony czarodziej",
          }),
        ],
      }),
      expect.any(Object),
    );
  });

  it("preserves level zero for an unknown dialog npc", async () => {
    setDialogNpcContext(501, {
      ...createRuntimeNpc(501, "Nieznany dialog"),
      level: 0,
    });
    mockGetLoot.mockReturnValue([
      { id: 7, name: "Nagroda", stat: "lvl=300;rarity=unique" },
    ]);
    mockCreateLoot.mockResolvedValue({ id: 321 });

    processor.handleDialogLoot(createDialogLootEvent([501]));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledTimes(1);
    expect(mockCreateLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        npcs: [
          expect.objectContaining({
            id: 501,
            lvl: 0,
            name: "Nieznany dialog",
          }),
        ],
      }),
      expect.any(Object),
    );
  });

  it("attributes dialog loot to the talked npc instead of unrelated npcs_del entries", async () => {
    setDialogNpcContext(501);
    mockGetLoot.mockReturnValue([{ id: 7, name: "Łup" }]);
    mockGame.getNpc.mockImplementation((npcId: number) =>
      createGameNpc(npcId, npcId === 501 ? "Kliknięty NPC" : "Obcy NPC"),
    );
    useNpcsStore
      .getState()
      .replaceNpcs([createRuntimeNpc(501, "Kliknięty NPC")]);
    mockCreateLoot.mockResolvedValue({ id: 321 });

    processor.handleDialogLoot(createDialogLootEvent([502, 503]));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        npcs: [
          expect.objectContaining({
            id: 501,
            name: "Kliknięty NPC",
          }),
        ],
      }),
      expect.any(Object),
    );
  });

  it("creates dialog loot from the snapshot captured before the npc disappears", async () => {
    useDialogStore.getState().setNpcContext({
      npcId: 501,
      npc: createRuntimeNpc(501, "Kliknięty NPC"),
      source: "talk-request",
    });
    mockGetLoot.mockReturnValue([{ id: 7, name: "Łup" }]);
    mockGame.getNpc.mockReturnValue(undefined);
    mockCreateLoot.mockResolvedValue({ id: 321 });

    processor.handleDialogLoot(createDialogLootEvent([502, 503]));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        npcs: [expect.objectContaining({ id: 501, name: "Kliknięty NPC" })],
      }),
      expect.any(Object),
    );
  });

  it("uses the pre-event ingress NPC after projection removes it from the store", async () => {
    setDialogNpcContext(501);
    const ingressNpc = createRuntimeNpc(501, "Kliknięty NPC");
    const game = useGameStore.getState().game;
    expect(game).not.toBeNull();
    mockGetLoot.mockReturnValue([{ id: 7, name: "Łup" }]);
    mockCreateLoot.mockResolvedValue({ id: 321 });

    processor.handleDialogLoot(createDialogLootEvent([501]), {
      game,
      intent: null,
      npcsById: { 501: ingressNpc },
      othersById: {},
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(useNpcsStore.getState().getNpc(501)).toBeUndefined();
    expect(mockCreateLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        npcs: [expect.objectContaining({ id: 501, name: "Kliknięty NPC" })],
      }),
      expect.any(Object),
    );
  });

  it("falls back to the canonical npc store when the context has no snapshot", async () => {
    setDialogNpcContext(777);
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockImplementation((npcId: number) => {
      if (npcId === 777) {
        return {
          ...createGameNpc(777, "Strażnik"),
          prof: "h",
          type: 2,
          wt: 30,
          lvl: 120,
        };
      }

      return undefined;
    });
    mockCreateLoot.mockResolvedValue({
      id: 123,
    });
    useNpcsStore.getState().replaceNpcs([
      {
        ...createRuntimeNpc(777, "Strażnik"),
        profession: "h",
        type: 2,
        weight: 30,
        level: 120,
      },
    ]);

    processor.handleDialogLoot(createDialogLootEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGame.getNpc).not.toHaveBeenCalled();
    expect(mockCreateLoot).toHaveBeenCalledTimes(1);
  });

  it("does not create dialog loot when npc lookup returns empty data", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000008",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    setDialogNpcContext(777);
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(undefined);

    processor.handleDialogLoot(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBeNull();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000008",
      eventNpcDelIds: [],
      npcId: 777,
      reason: "missing-dialog-npc-snapshot",
      resolutionSource: "fallback-lookup",
      source: "dialog",
      stage: "skipped",
    });
  });

  it("logs event npc ids when the tracked npc snapshot cannot be resolved", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000009",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    setDialogNpcContext(501);
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(undefined);

    processor.handleDialogLoot(createDialogLootEvent([501]));

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000009",
      eventNpcDelIds: [501],
      npcId: 501,
      reason: "missing-dialog-npc-snapshot",
      resolutionSource: "fallback-lookup",
      source: "dialog",
      stage: "skipped",
    });
  });

  it("logs when parsed dialog loot is empty", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000010",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    setDialogNpcContext(501, createRuntimeNpc(501, "Mokra bestia"));
    mockGetLoot.mockReturnValue([]);

    processor.handleDialogLoot(createDialogLootEvent([501]));

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000010",
      eventNpcDelIds: [501],
      npcId: 501,
      reason: "empty-parsed-loots",
      resolutionSource: "talk-request",
      source: "dialog",
      stage: "skipped",
    });
  });

  it("keeps the npc context through empty loot and consumes it after one valid loot", async () => {
    setDialogNpcContext(501, createRuntimeNpc(501, "Mokra bestia"));
    mockGetLoot.mockReturnValueOnce([]).mockReturnValue([{ id: 7 }]);
    mockCreateLoot.mockResolvedValue({ id: 321 });

    processor.handleDialogLoot(createDialogLootEvent([502]));
    expect(useDialogStore.getState().npcContext?.npcId).toBe(501);

    processor.handleDialogLoot(createDialogLootEvent([503]));
    processor.handleDialogLoot(createDialogLootEvent([504]));

    await Promise.resolve();
    await Promise.resolve();

    expect(mockCreateLoot).toHaveBeenCalledTimes(1);
    expect(useDialogStore.getState().npcContext).toBeNull();
  });

  it("logs warning when dialog loot request fails", async () => {
    const consoleWarnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined);
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000011",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);

    setDialogNpcContext(501);
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(createGameNpc(501, "Mokra bestia"));
    useNpcsStore
      .getState()
      .replaceNpcs([createRuntimeNpc(501, "Mokra bestia")]);
    mockCreateLoot.mockRejectedValue(new Error("dialog failed"));

    processor.handleDialogLoot(createDialogLootEvent([501]));

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      "[LootEventProcessor] Failed to create dialog loot:",
      expect.any(Error),
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000011",
      error: expect.any(Error),
      source: "dialog",
      stage: "failed",
    });
  });

  it("does not clear tracked id when dialog source is not used", () => {
    processor.handleDialogLoot(createBattleLootEvent());

    expect(useLootStore.getState().lastLootId).toBe(44);
  });
});
