import type { GameEvent } from "@lootlog/margonem/game-events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventDispatcher } from "./event-dispatcher";

const mocks = vi.hoisted(() => ({
  afkHandle: vi.fn(),
  battleHandle: vi.fn(),
  chatHandle: vi.fn(),
  dialogHandle: vi.fn(),
  dialogLootHandle: vi.fn(),
  friendsHandle: vi.fn(),
  lootFromBattleHandle: vi.fn(),
  mapChangeHandle: vi.fn(),
  npcsDeleteHandle: vi.fn(),
  npcsDetectionHandle: vi.fn(),
  npcsInitialDetectionHandle: vi.fn(),
  otherHandle: vi.fn(),
  partyHandle: vi.fn(),
  partyInitialDetectionHandle: vi.fn(),
  gameEventsManager: {
    markStripFriendsFromNextEvent: vi.fn(),
    removeProcessor: vi.fn(),
    setProcessor: vi.fn(),
  },
}));

vi.mock("@/lib/game-events-manager", () => ({
  gameEventsManager: mocks.gameEventsManager,
}));

vi.mock("@/processors/afk-processor", () => ({
  AfkProcessor: vi.fn(function AfkProcessor() {
    return {
      handle: mocks.afkHandle,
    };
  }),
}));

vi.mock("@/processors/battle-event-processor", () => ({
  BattleEventProcessor: vi.fn(function BattleEventProcessor() {
    return {
      handle: mocks.battleHandle,
    };
  }),
}));

vi.mock("@/processors/chat-event-processor", () => ({
  ChatEventProcessor: vi.fn(function ChatEventProcessor() {
    return {
      handle: mocks.chatHandle,
    };
  }),
}));

vi.mock("@/processors/dialog-processor", () => ({
  DialogProcessor: vi.fn(function DialogProcessor() {
    return {
      handle: mocks.dialogHandle,
    };
  }),
}));

vi.mock("@/processors/friends-processor", () => ({
  FriendsProcessor: vi.fn(function FriendsProcessor() {
    return {
      handle: mocks.friendsHandle,
    };
  }),
}));

vi.mock("@/processors/loot-event-processor", () => ({
  LootEventProcessor: vi.fn(function LootEventProcessor() {
    return {
      handleDialogLoot: mocks.dialogLootHandle,
      handleLootFromBattle: mocks.lootFromBattleHandle,
    };
  }),
}));

vi.mock("@/processors/map-change-processor", () => ({
  MapChangeProcessor: vi.fn(function MapChangeProcessor() {
    return {
      handle: mocks.mapChangeHandle,
    };
  }),
}));

vi.mock("@/processors/npcs-delete-processor", () => ({
  NpcsDeleteProcessor: vi.fn(function NpcsDeleteProcessor() {
    return {
      handle: mocks.npcsDeleteHandle,
    };
  }),
}));

vi.mock("@/processors/npcs-detection-processor", () => ({
  npcsDetectionProcessor: {
    handle: mocks.npcsDetectionHandle,
    handleInitialDetection: mocks.npcsInitialDetectionHandle,
  },
}));

vi.mock("@/processors/other-event-processor", () => ({
  OtherEventProcessor: vi.fn(function OtherEventProcessor() {
    return {
      handle: mocks.otherHandle,
    };
  }),
}));

vi.mock("@/processors/party-processor", () => ({
  PartyProcessor: vi.fn(function PartyProcessor() {
    return {
      handle: mocks.partyHandle,
      handleInitialDetection: mocks.partyInitialDetectionHandle,
    };
  }),
}));

const expectNoProcessorCalls = () => {
  expect(mocks.afkHandle).not.toHaveBeenCalled();
  expect(mocks.battleHandle).not.toHaveBeenCalled();
  expect(mocks.chatHandle).not.toHaveBeenCalled();
  expect(mocks.dialogHandle).not.toHaveBeenCalled();
  expect(mocks.dialogLootHandle).not.toHaveBeenCalled();
  expect(mocks.friendsHandle).not.toHaveBeenCalled();
  expect(mocks.lootFromBattleHandle).not.toHaveBeenCalled();
  expect(mocks.mapChangeHandle).not.toHaveBeenCalled();
  expect(mocks.npcsDeleteHandle).not.toHaveBeenCalled();
  expect(mocks.npcsDetectionHandle).not.toHaveBeenCalled();
  expect(mocks.otherHandle).not.toHaveBeenCalled();
  expect(mocks.partyHandle).not.toHaveBeenCalled();
};

describe("EventDispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ignores events without relevant keys", () => {
    const dispatcher = new EventDispatcher();

    dispatcher.handleEvent({ ok: 1 } as unknown as GameEvent);

    expectNoProcessorCalls();
  });

  it("routes simple events only to matching processors", () => {
    const dispatcher = new EventDispatcher();
    const chatEvent = { chat: { channels: [] } } as unknown as GameEvent;
    const npcEvent = { npcs: [] } as unknown as GameEvent;

    dispatcher.handleEvent(chatEvent);

    expect(mocks.chatHandle).toHaveBeenCalledWith(chatEvent);
    expect(mocks.npcsDetectionHandle).not.toHaveBeenCalled();
    expect(mocks.battleHandle).not.toHaveBeenCalled();

    vi.clearAllMocks();

    dispatcher.handleEvent(npcEvent);

    expect(mocks.npcsDetectionHandle).toHaveBeenCalledWith(npcEvent);
    expect(mocks.chatHandle).not.toHaveBeenCalled();
    expect(mocks.battleHandle).not.toHaveBeenCalled();
  });

  it("routes fight loot packets to battle and fight-loot processors", () => {
    const dispatcher = new EventDispatcher();
    const event = {
      f: { m: ["turn"] },
      item: { "1": { name: "Loot" } },
      loot: { source: "fight" },
    } as unknown as GameEvent;

    dispatcher.handleEvent(event);

    expect(mocks.battleHandle).toHaveBeenCalledWith(event);
    expect(mocks.lootFromBattleHandle).toHaveBeenCalledWith(event);
    expect(mocks.dialogLootHandle).not.toHaveBeenCalled();
    expect(mocks.npcsDeleteHandle).not.toHaveBeenCalled();
  });

  it("routes dialog loot packets to dialog-loot and npc-delete processors", () => {
    const dispatcher = new EventDispatcher();
    const event = {
      item: { "1": { name: "Loot" } },
      loot: { source: "dialog" },
      npcs_del: [{ id: 10 }],
    } as unknown as GameEvent;

    dispatcher.handleEvent(event);

    expect(mocks.dialogLootHandle).toHaveBeenCalledWith(event);
    expect(mocks.npcsDeleteHandle).toHaveBeenCalledWith(event);
    expect(mocks.lootFromBattleHandle).not.toHaveBeenCalled();
    expect(mocks.battleHandle).not.toHaveBeenCalled();
  });

  it("routes status, map, other, friends and party packets independently", () => {
    const dispatcher = new EventDispatcher();
    const event = {
      friends: [],
      friends_max: 20,
      h: { stasis: 1 },
      other: { "1": { id: 1, x: 10, y: 20 } },
      party: { members: {} },
      town: { id: 1 },
    } as unknown as GameEvent;

    dispatcher.handleEvent(event);

    expect(mocks.afkHandle).toHaveBeenCalledWith(event);
    expect(mocks.friendsHandle).toHaveBeenCalledWith(event);
    expect(mocks.mapChangeHandle).toHaveBeenCalledWith(event);
    expect(mocks.otherHandle).toHaveBeenCalledWith(event);
    expect(mocks.partyHandle).toHaveBeenCalledWith(event);
    expect(mocks.chatHandle).not.toHaveBeenCalled();
    expect(mocks.npcsDetectionHandle).not.toHaveBeenCalled();
    expect(mocks.mapChangeHandle.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.otherHandle.mock.invocationCallOrder[0],
    );
  });

  it("runs initial detections and marks the friends payload strip", () => {
    const dispatcher = new EventDispatcher();

    dispatcher.handleInitialEvents();

    expect(mocks.npcsInitialDetectionHandle).toHaveBeenCalledOnce();
    expect(mocks.partyInitialDetectionHandle).toHaveBeenCalledOnce();
    expect(
      mocks.gameEventsManager.markStripFriendsFromNextEvent,
    ).toHaveBeenCalledOnce();
  });
});
