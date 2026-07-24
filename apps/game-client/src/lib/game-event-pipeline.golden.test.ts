import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { useFriendsStore } from "@/store/friends.store";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { useGlobalStore } from "@/store/global.store";
import { usePartyStore } from "@/store/party.store";
import { EventDispatcher } from "./event-dispatcher";
import { margonemRuntimeBridge } from "./margonem-runtime/margonem-runtime-bridge";
import type * as ApiModule from "@/api";
import { useGameStore } from "@/store/game.store";
import type { MargonemRuntimeAdapter } from "./margonem-runtime/runtime-adapter";
import { RuntimeStateSynchronizer } from "./margonem-runtime/runtime-state-synchronizer";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";

const effects = vi.hoisted(() => ({
  cancelMapPingInteraction: vi.fn(),
  clearMapPings: vi.fn(),
  handleAirTagMapChange: vi.fn(),
  observeOtherPlayers: vi.fn(),
}));

const api = vi.hoisted(() => ({
  createBattle: vi.fn().mockResolvedValue({ battleId: "battle-1" }),
  createKill: vi.fn().mockResolvedValue({ updated: 1 }),
  createLoot: vi.fn().mockResolvedValue({ id: 1 }),
}));

vi.mock("@/api", async (importOriginal) => ({
  ...(await importOriginal<typeof ApiModule>()),
  createBattle: api.createBattle,
  createKill: api.createKill,
  createLoot: api.createLoot,
}));

vi.mock("@/features/air-tags/air-tag-observation-controller", () => ({
  airTagObservationController: { handle: effects.observeOtherPlayers },
}));

vi.mock("@/features/air-tags/air-tag-runtime", () => ({
  airTagRuntime: { handleMapChange: effects.handleAirTagMapChange },
}));

vi.mock("@/features/map-pings/map-ping-controller", () => ({
  mapPingController: { clear: effects.clearMapPings },
}));

vi.mock("@/features/map-pings/map-ping-interaction-controller", () => ({
  mapPingInteractionController: { cancel: effects.cancelMapPingInteraction },
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getAccountId: () => null,
    getNpc: () => undefined,
    getOther: () => ({ account: 222 }),
    getWorldName: () => "pandora",
    hero: { account: 67_890, id: 12_345 },
    map: { id: 13, name: "Nithal" },
  },
}));

type PipelineWindow = Window & {
  successData?: (payload: GameEvent | string) => unknown;
};

const pipelineWindow = window as PipelineWindow;
const originalSuccessData = pipelineWindow.successData;

const combinedEvent = {
  chat: { channels: [] },
  d: ["dialog", "npc", "7"],
  f: {
    init: "1",
    m: ["turn-1"],
    w: {
      "111": {
        hpp: 100,
        icon: "warrior.gif",
        id: 111,
        lvl: 300,
        name: "Warrior",
        originalId: 111,
        prof: "w",
        team: 1,
        type: 0,
        wt: 0,
      },
    },
  },
  friends: [
    "55",
    "Friend",
    "friend.gif",
    "300",
    "0",
    "m",
    "Nithal",
    "1",
    "2",
    "online",
    "unused",
  ],
  friends_max: 25,
  h: { stasis: 0 },
  item: {},
  loot: { source: "fight" },
  npcs: [],
  npcs_del: [],
  other: {},
  party: {
    members: {
      "1": {
        account: 67_890,
        commander: 1,
        icon: "hero.gif",
        id: 12_345,
        nick: "Hero",
      },
    },
  },
  town: { id: 13, name: "Nithal" },
} as unknown as GameEvent;

const finalFightEvent = {
  f: {
    endBattle: 1,
    m: ["final"],
    w: {
      "-100": {
        hpp: 0,
        icon: "boss.gif",
        id: -100,
        lvl: 300,
        name: "Boss",
        originalId: 100,
        prof: "w",
        team: 2,
        type: 2,
        wt: 85,
      },
    },
  },
} as unknown as GameEvent;

const fightLootEvent = {
  f: {},
  item: {
    "loot-1": {
      cl: 16,
      hid: "loot-hid",
      icon: "loot.gif",
      loc: "l",
      name: "Unique loot",
      pr: 1,
      prc: "1",
      stat: "rarity=unique",
      tpl: 9001,
    },
  },
  loot: {
    source: "fight",
    states: { "loot-1": 1 },
  },
} as unknown as GameEvent;

function resetPipelineState(): void {
  margonemRuntimeBridge.cleanup();
  api.createBattle.mockClear();
  api.createKill.mockClear();
  api.createLoot.mockClear();
  effects.cancelMapPingInteraction.mockClear();
  effects.clearMapPings.mockClear();
  effects.handleAirTagMapChange.mockClear();
  effects.observeOtherPlayers.mockClear();
  useBattleStore.getState().clearEvents();
  useBattleStore.setState({
    battleState: "idle",
    battleWarriors: {},
    events: [],
    lastBattleHash: "",
    lastKillHash: "",
  });
  useBattlePanelStore.setState({ isBattleCollectionEnabled: true });
  useDialogStore.getState().clearNpcContext();
  useFriendsStore.setState({ friends: [], friendsMax: 0 });
  useGlobalStore.setState({
    socketState: { connected: false, joined: false, joinedGuilds: [] },
  });
  useLootStore.setState({ lastLootId: null });
  useNpcsStore.getState().clearNpcs();
  useOthersStore.getState().clearOthers();
  useGameStore.getState().replaceGame({
    hero: {
      accountId: "67890",
      characterId: "12345",
      currentHp: 1,
      icon: "hero.gif",
      level: 300,
      maxHp: 1,
      name: "Hero",
      profession: "w",
      x: 1,
      y: 2,
    },
    interface: "ni",
    map: { id: 13, name: "Nithal", visibility: 30 },
    world: "pandora",
  });
  usePartyStore.setState({ members: [] });
}

function replayAndSnapshot(payload: GameEvent | string) {
  resetPipelineState();
  const dispatcher = new EventDispatcher();
  pipelineWindow.successData = vi.fn(() => "game-result");
  margonemRuntimeBridge.setupProxies();
  const other = Object.freeze({
    accountId: "222",
    characterId: "111",
    icon: "warrior.gif",
    level: 300,
    name: "Warrior",
    profession: "w",
  });
  const runtimeGame = useGameStore.getState().game;
  if (!runtimeGame) throw new Error("Expected golden runtime game snapshot");
  const adapter = {
    getAllNpcs: () => [],
    getAllOtherHandles: () => ({}),
    getAllOthers: () => ({ 111: other }),
    getGameSnapshot: () => runtimeGame,
    getNpc: () => undefined,
    getOther: (id: string) => (id === "111" ? other : undefined),
    getOtherHandle: () => undefined,
    getParty: () => [],
    getStateSnapshot: () => ({
      friends: [],
      game: runtimeGame,
      npcs: [],
      others: { 111: other },
      party: [],
    }),
    interface: "si",
    isReady: () => true,
  } as MargonemRuntimeAdapter;
  const synchronizer = new RuntimeStateSynchronizer({
    adapter,
    bridge: margonemRuntimeBridge,
  });
  synchronizer.install();
  dispatcher.register();
  margonemRuntimeBridge.setReady(true);

  const result = pipelineWindow.successData?.(payload);
  const battleState = useBattleStore.getState();
  const snapshot = {
    battle: {
      battleState: battleState.battleState,
      battleWarriors: battleState.battleWarriors,
      capture: battleState.getCaptureSnapshot(),
    },
    dialogNpcContext: useDialogStore.getState().npcContext,
    effects: {
      airTagMapChanges: effects.handleAirTagMapChange.mock.calls,
      mapPingCancels: effects.cancelMapPingInteraction.mock.calls.length,
      mapPingClears: effects.clearMapPings.mock.calls.length,
      otherObservations: effects.observeOtherPlayers.mock.calls,
    },
    friends: useFriendsStore.getState().friends,
    friendsMax: useFriendsStore.getState().friendsMax,
    lastLootId: useLootStore.getState().lastLootId,
    party: usePartyStore.getState().members,
    result,
  };

  dispatcher.cleanup();
  synchronizer.cleanup();
  return snapshot;
}

describe("game event pipeline golden replay", () => {
  afterEach(() => {
    margonemRuntimeBridge.cleanup();
    pipelineWindow.successData = originalSuccessData;
    useBattlePanelStore.setState({ isBattleCollectionEnabled: false });
  });

  it("produces the same real store state for object and string payloads", () => {
    const objectSnapshot = replayAndSnapshot(combinedEvent);
    const stringSnapshot = replayAndSnapshot(JSON.stringify(combinedEvent));

    expect(stringSnapshot).toEqual(objectSnapshot);
    expect(objectSnapshot).toEqual({
      battle: {
        battleState: "in-battle",
        battleWarriors: {
          "111": expect.objectContaining({ accountId: 222, name: "Warrior" }),
        },
        capture: {
          bytes: JSON.stringify(combinedEvent).length * 2,
          events: [combinedEvent],
          overflowed: false,
          turns: ["turn-1"],
        },
      },
      dialogNpcContext: null,
      effects: {
        airTagMapChanges: [[13, "Nithal"]],
        mapPingCancels: 1,
        mapPingClears: 1,
        otherObservations: [[{}]],
      },
      friends: [
        {
          characterId: "55",
          icon: "friend.gif",
          level: 300,
          location: "Nithal",
          name: "Friend",
          profession: "m",
          status: "online",
        },
      ],
      friendsMax: 25,
      lastLootId: null,
      party: [
        {
          accountId: "67890",
          characterId: "12345",
          currentHp: 0,
          icon: "hero.gif",
          isLeader: true,
          maxHp: 0,
          name: "Hero",
          profession: null,
        },
      ],
      result: "game-result",
    });
  });

  it("submits fight loot from the final packet with its warriors", async () => {
    resetPipelineState();
    useBattleStore.setState({ battleState: "in-battle" });
    const dispatcher = new EventDispatcher();
    pipelineWindow.successData = vi.fn(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    dispatcher.register();
    margonemRuntimeBridge.setReady(true);
    const finalFightLootEvent = {
      ...finalFightEvent,
      ...fightLootEvent,
      f: finalFightEvent.f,
    } as GameEvent;

    pipelineWindow.successData?.(finalFightLootEvent);

    expect(api.createLoot).toHaveBeenCalledOnce();
    expect(api.createLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        loots: [expect.objectContaining({ id: 9001, name: "Unique loot" })],
        npcs: [expect.objectContaining({ id: 100, name: "Boss" })],
        source: "FIGHT",
      }),
      expect.objectContaining({ source: "fight" }),
    );
    await vi.waitFor(() => expect(api.createKill).toHaveBeenCalledOnce());

    dispatcher.cleanup();
  });

  it("submits fight loot arriving immediately after the final packet", async () => {
    resetPipelineState();
    useBattleStore.setState({ battleState: "in-battle" });
    const dispatcher = new EventDispatcher();
    pipelineWindow.successData = vi.fn(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    dispatcher.register();
    margonemRuntimeBridge.setReady(true);

    pipelineWindow.successData?.(finalFightEvent);
    pipelineWindow.successData?.(fightLootEvent);

    expect(api.createLoot).toHaveBeenCalledOnce();
    expect(api.createLoot).toHaveBeenCalledWith(
      expect.objectContaining({
        npcs: [expect.objectContaining({ id: 100, name: "Boss" })],
      }),
      expect.objectContaining({ source: "fight" }),
    );
    await vi.waitFor(() => expect(api.createKill).toHaveBeenCalledOnce());

    dispatcher.cleanup();
  });

  it.each([
    ["same packet", "legacy"],
    ["next packet", "legacy"],
    ["same packet", "modern"],
    ["next packet", "modern"],
  ] as const)(
    "submits complete participants after a fragmentary final fight update (%s, %s HP)",
    async (lootTiming, hpFormat) => {
      resetPipelineState();
      useOthersStore.getState().replaceOthers({
        "111": Object.freeze({
          accountId: "222",
          characterId: "111",
          icon: "warrior.gif",
          level: 300,
          name: "Warrior",
          profession: "w",
        }),
      });
      const dispatcher = new EventDispatcher();
      pipelineWindow.successData = vi.fn(() => "game-result");
      margonemRuntimeBridge.setupProxies();
      dispatcher.register();
      margonemRuntimeBridge.setReady(true);

      pipelineWindow.successData?.({
        f: {
          init: "1",
          w: {
            "12345": {
              hp: { cur: 1_000, hpp: 100, max: 1_000 },
              hpp: 100,
              icon: "hero.gif",
              id: 12_345,
              lvl: 300,
              name: "Hero",
              originalId: 12_345,
              prof: "w",
              team: 1,
              type: 0,
              wt: 0,
            },
            "111": {
              hpp: 100,
              icon: "warrior.gif",
              id: 111,
              lvl: 300,
              name: "Warrior",
              originalId: 111,
              prof: "w",
              team: 1,
              type: 0,
              wt: 0,
            },
            "-100": {
              hp: { cur: 1_000, hpp: 100, max: 1_000 },
              hpp: 100,
              icon: "boss.gif",
              id: -100,
              lvl: 300,
              name: "Boss",
              originalId: 100,
              prof: "m",
              team: 2,
              type: 2,
              wt: 85,
            },
          },
        },
      } as GameEvent);

      const finalWarriorPatches =
        hpFormat === "modern"
          ? {
              "12345": { hp: { cur: 750, hpp: 75, max: 1_000 } },
              "-100": { hp: { cur: 0 } },
            }
          : {
              "12345": { hpp: 75 },
              "-100": { hpp: 0 },
            };
      const fragmentaryFinalFightEvent = {
        f: {
          endBattle: 1,
          m: ["final"],
          w: finalWarriorPatches,
        },
      } as unknown as GameEvent;

      if (lootTiming === "same packet") {
        pipelineWindow.successData?.({
          ...fightLootEvent,
          ...fragmentaryFinalFightEvent,
        } as GameEvent);
      } else {
        pipelineWindow.successData?.(fragmentaryFinalFightEvent);
        pipelineWindow.successData?.(fightLootEvent);
      }

      expect(api.createLoot).toHaveBeenCalledOnce();
      expect(api.createLoot).toHaveBeenCalledWith(
        expect.objectContaining({
          npcs: [
            {
              hpp: 0,
              icon: "boss.gif",
              id: 100,
              location: "Nithal",
              lvl: 300,
              name: "Boss",
              prof: "m",
              type: 2,
              wt: 85,
            },
          ],
          players: expect.arrayContaining([
            {
              accountId: 67_890,
              hpp: 75,
              icon: "hero.gif",
              id: 12_345,
              lvl: 300,
              name: "Hero",
              prof: "w",
            },
            {
              accountId: 222,
              hpp: 100,
              icon: "warrior.gif",
              id: 111,
              lvl: 300,
              name: "Warrior",
              prof: "w",
            },
          ]),
        }),
        expect.objectContaining({ source: "fight" }),
      );
      await vi.waitFor(() => expect(api.createKill).toHaveBeenCalledOnce());

      dispatcher.cleanup();
    },
  );
});
