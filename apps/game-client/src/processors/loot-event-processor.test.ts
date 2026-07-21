import { beforeEach, describe, expect, it, vi } from "vitest";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { LOOT_CREATE_DEBUG_PREFIX } from "@/lib/loot-create-debug";
import { useSettingsStore } from "@/store/settings.store";
import { LootEventProcessor } from "./loot-event-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";
import type * as ApiModule from "@/api";

const {
  mockCreateLoot,
  mockGetLoot,
  mockGetBattleParticipants,
  mockGame,
  mockReportLootSkipped,
} = vi.hoisted(() => ({
  mockCreateLoot: vi.fn(),
  mockGetLoot: vi.fn(),
  mockGetBattleParticipants: vi.fn(),
  mockReportLootSkipped: vi.fn(),
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

vi.mock("@/lib/error-monitoring", () => ({
  reportLootSkipped: mockReportLootSkipped,
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
    useDialogStore.setState({
      talkingNpcId: null,
    });
    useSettingsStore.getState().setLootDebugLoggingEnabled(false);
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
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000002",
      battleWarriorCount: 0,
      hasFightData: true,
      mapName: "Ithan",
      reason: "missing-battle-warriors",
      source: "fight",
      world: "pandora",
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
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000003",
      battleWarriorCount: 1,
      hasFightData: true,
      mapName: "Ithan",
      parsedLootCount: 0,
      reason: "empty-parsed-loots",
      source: "fight",
      world: "pandora",
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
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000004",
      battleWarriorCount: 1,
      hasFightData: false,
      mapName: "Ithan",
      reason: "missing-fight-data",
      source: "fight",
      world: "pandora",
    });
  });

  it("logs warning when battle loot request fails", async () => {
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

    processor.handleLootFromBattle(createBattleLootEvent());

    await Promise.resolve();
    await Promise.resolve();

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
      reason: "missing-talking-npc-id",
      source: "dialog",
      stage: "skipped",
    });
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000007",
      mapName: "Ithan",
      reason: "missing-talking-npc-id",
      source: "dialog",
      world: "pandora",
    });
  });

  it("creates dialog loot using npcs_del payload", async () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000006",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    useDialogStore.setState({
      talkingNpcId: "501",
    });
    mockGetLoot.mockReturnValue([{ id: 7, name: "Łup" }]);
    mockGame.getNpc.mockReturnValue(createGameNpc(501, "Mokra bestia"));
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
      event,
      source: "dialog",
      stage: "event-detected",
      talkingNpcId: "501",
    });
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000006",
      payload: expectedPayload,
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

  it("falls back to talking npc id when dialog event has no npcs_del", async () => {
    useDialogStore.setState({
      talkingNpcId: "777",
    });
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

    processor.handleDialogLoot(createDialogLootEvent());

    await Promise.resolve();
    await Promise.resolve();

    expect(mockGame.getNpc).toHaveBeenCalledWith(777);
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
    useDialogStore.setState({
      talkingNpcId: "777",
    });
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(undefined);

    processor.handleDialogLoot(createDialogLootEvent());

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(useLootStore.getState().lastLootId).toBeNull();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000008",
      npcId: "777",
      reason: "missing-fallback-npc",
      source: "dialog",
      stage: "skipped",
    });
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000008",
      mapName: "Ithan",
      reason: "missing-fallback-npc",
      requestedNpcIds: [777],
      resolvedNpcCount: 0,
      source: "dialog",
      world: "pandora",
    });
  });

  it("logs when npcs deleted by a dialog can no longer be resolved", () => {
    const consoleLogSpy = vi
      .spyOn(console, "log")
      .mockImplementation(() => undefined);
    vi.spyOn(crypto, "randomUUID").mockReturnValue(
      "00000000-0000-4000-8000-000000000009",
    );
    useSettingsStore.getState().setLootDebugLoggingEnabled(true);
    useDialogStore.setState({
      talkingNpcId: "501",
    });
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(undefined);

    processor.handleDialogLoot(createDialogLootEvent([501]));

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000009",
      npcIds: [501],
      reason: "unresolved-dialog-npcs",
      source: "dialog",
      stage: "skipped",
    });
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000009",
      mapName: "Ithan",
      reason: "unresolved-dialog-npcs",
      requestedNpcIds: [501],
      resolvedNpcCount: 0,
      source: "dialog",
      world: "pandora",
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
    useDialogStore.setState({
      talkingNpcId: "501",
    });
    mockGetLoot.mockReturnValue([]);

    processor.handleDialogLoot(createDialogLootEvent([501]));

    expect(mockCreateLoot).not.toHaveBeenCalled();
    expect(consoleLogSpy).toHaveBeenCalledWith(LOOT_CREATE_DEBUG_PREFIX, {
      attemptId: "00000000-0000-4000-8000-000000000010",
      reason: "empty-parsed-loots",
      source: "dialog",
      stage: "skipped",
    });
    expect(mockReportLootSkipped).toHaveBeenCalledWith({
      attemptId: "00000000-0000-4000-8000-000000000010",
      mapName: "Ithan",
      parsedLootCount: 0,
      reason: "empty-parsed-loots",
      requestedNpcIds: [501],
      source: "dialog",
      world: "pandora",
    });
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

    useDialogStore.setState({
      talkingNpcId: "501",
    });
    mockGetLoot.mockReturnValue([{ id: 7 }]);
    mockGame.getNpc.mockReturnValue(createGameNpc(501, "Mokra bestia"));
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
