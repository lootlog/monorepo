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
import { gameEventsManager } from "./game-events-manager";

const effects = vi.hoisted(() => ({
  cancelMapPingInteraction: vi.fn(),
  clearMapPings: vi.fn(),
  handleAirTagMapChange: vi.fn(),
  observeOtherPlayers: vi.fn(),
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
  d: ["dialog", "npc", "npc-7"],
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

function resetPipelineState(): void {
  gameEventsManager.cleanup();
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
  useDialogStore.setState({ talkingNpcId: null });
  useFriendsStore.setState({ friends: [], friendsMax: 0 });
  useGlobalStore.setState({
    socketState: { connected: false, joined: false, joinedGuilds: [] },
  });
  useLootStore.setState({ lastLootId: null });
  usePartyStore.setState({ members: [] });
}

function replayAndSnapshot(payload: GameEvent | string) {
  resetPipelineState();
  const dispatcher = new EventDispatcher();
  pipelineWindow.successData = vi.fn(() => "game-result");
  gameEventsManager.setupProxies();
  dispatcher.register();
  gameEventsManager.setReady(true);

  const result = pipelineWindow.successData?.(payload);
  const battleState = useBattleStore.getState();
  const snapshot = {
    battle: {
      battleState: battleState.battleState,
      battleWarriors: battleState.battleWarriors,
      capture: battleState.getCaptureSnapshot(),
    },
    dialogNpcId: useDialogStore.getState().talkingNpcId,
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
  return snapshot;
}

describe("game event pipeline golden replay", () => {
  afterEach(() => {
    gameEventsManager.cleanup();
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
      dialogNpcId: "npc-7",
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
          location: "Nithal",
          lvl: "300",
          nick: "Friend",
          opLvl: "0",
          prof: "m",
          status: "online",
          unknown1: "unused",
          x: "1",
          y: "2",
        },
      ],
      friendsMax: 25,
      lastLootId: null,
      party: [
        {
          accountId: 67_890,
          hp: [0, 0],
          icon: "hero.gif",
          id: 12_345,
          leader: true,
          nick: "Hero",
          profession: null,
        },
      ],
      result: "game-result",
    });
  });
});
