import type { GameEvent } from "@lootlog/margonem/game-events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EventDispatcher } from "./event-dispatcher";

const mocks = vi.hoisted(() => ({
  afkHandle: vi.fn(),
  battleHandle: vi.fn(),
  chatHandle: vi.fn(),
  dialogHandle: vi.fn(),
  dialogLootHandle: vi.fn(),
  lootFromBattleHandle: vi.fn(),
  mapChangeHandle: vi.fn(),
  npcsDeleteHandle: vi.fn(),
  npcsDetectionHandle: vi.fn(),
  npcsInitialDetectionHandle: vi.fn(),
  otherHandle: vi.fn(),
  runtimePipeline: {
    acquireProcessor: vi.fn(() => vi.fn(() => true)),
  },
}));

vi.mock("@/lib/margonem-runtime/runtime-event-pipeline", () => ({
  runtimeEventPipeline: mocks.runtimePipeline,
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
    bootstrapProjection: mocks.npcsInitialDetectionHandle,
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

const expectNoProcessorCalls = () => {
  expect(mocks.afkHandle).not.toHaveBeenCalled();
  expect(mocks.battleHandle).not.toHaveBeenCalled();
  expect(mocks.chatHandle).not.toHaveBeenCalled();
  expect(mocks.dialogHandle).not.toHaveBeenCalled();
  expect(mocks.dialogLootHandle).not.toHaveBeenCalled();
  expect(mocks.lootFromBattleHandle).not.toHaveBeenCalled();
  expect(mocks.mapChangeHandle).not.toHaveBeenCalled();
  expect(mocks.npcsDeleteHandle).not.toHaveBeenCalled();
  expect(mocks.npcsDetectionHandle).not.toHaveBeenCalled();
  expect(mocks.otherHandle).not.toHaveBeenCalled();
};

const processorHandlers = {
  afk: mocks.afkHandle,
  battle: mocks.battleHandle,
  chat: mocks.chatHandle,
  dialog: mocks.dialogHandle,
  dialogLoot: mocks.dialogLootHandle,
  lootFromBattle: mocks.lootFromBattleHandle,
  mapChange: mocks.mapChangeHandle,
  npcsDelete: mocks.npcsDeleteHandle,
  npcsDetection: mocks.npcsDetectionHandle,
  other: mocks.otherHandle,
};

const getProcessorCallOrder = () =>
  Object.entries(processorHandlers)
    .flatMap(([processorName, handler]) =>
      handler.mock.invocationCallOrder.map((callOrder) => ({
        callOrder,
        processorName,
      })),
    )
    .sort((left, right) => left.callOrder - right.callOrder)
    .map(({ processorName }) => processorName);

describe("EventDispatcher", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

    expect(mocks.battleHandle).toHaveBeenCalledWith(event, undefined);
    expect(mocks.lootFromBattleHandle).toHaveBeenCalledWith(event, undefined);
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

    expect(mocks.dialogLootHandle).toHaveBeenCalledWith(event, undefined);
    expect(mocks.npcsDeleteHandle).toHaveBeenCalledWith(event, undefined);
    expect(mocks.lootFromBattleHandle).not.toHaveBeenCalled();
    expect(mocks.battleHandle).not.toHaveBeenCalled();
  });

  it("routes status, map and other packets while state facts bypass processors", () => {
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

    expect(mocks.afkHandle).toHaveBeenCalledWith(event, undefined);
    expect(mocks.mapChangeHandle).toHaveBeenCalledWith(event);
    expect(mocks.otherHandle).toHaveBeenCalledWith(event);
    expect(mocks.chatHandle).not.toHaveBeenCalled();
    expect(mocks.npcsDetectionHandle).not.toHaveBeenCalled();
    expect(mocks.mapChangeHandle.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.otherHandle.mock.invocationCallOrder[0],
    );
  });

  it.each([
    ["chat", { chat: { channels: [] } }, ["chat"]],
    ["dialog", { d: {} }, ["dialog"]],
    ["battle", { f: { m: ["turn"] } }, ["battle"]],
    ["npcs", { npcs: [] }, ["npcsDetection"]],
    ["fight loot", { item: {}, loot: { source: "fight" } }, ["lootFromBattle"]],
    ["dialog loot", { item: {}, loot: { source: "dialog" } }, ["dialogLoot"]],
    ["npc deletion", { npcs_del: [] }, ["npcsDelete"]],
    ["map change", { town: { id: 1 } }, ["mapChange"]],
    ["other players", { other: {} }, ["other"]],
    ["hero AFK status", { h: { stasis: 1 } }, ["afk"]],
    ["friends", { friends: [] }, []],
    ["friends capacity", { friends_max: 50 }, []],
    ["party", { party: {} }, []],
    [
      "combined packet",
      {
        chat: { channels: [] },
        d: {},
        f: { m: ["turn"] },
        friends: [],
        h: { stasis: 0 },
        item: {},
        loot: { source: "fight" },
        npcs: [],
        npcs_del: [],
        other: {},
        party: {},
        town: { id: 1 },
      },
      [
        "chat",
        "dialog",
        "battle",
        "mapChange",
        "npcsDetection",
        "lootFromBattle",
        "npcsDelete",
        "other",
        "afk",
      ],
    ],
  ])("golden-routes the %s event in stable order", (_name, event, expected) => {
    const dispatcher = new EventDispatcher();
    const gameEvent = event as unknown as GameEvent;

    dispatcher.handleEvent(gameEvent);

    expect(getProcessorCallOrder()).toEqual(expected);
    for (const processorName of expected) {
      expect(
        processorHandlers[processorName as keyof typeof processorHandlers].mock
          .calls[0]?.[0],
      ).toBe(gameEvent);
    }
  });

  it("reconciles the map before applying an NPC snapshot from the same packet", () => {
    const dispatcher = new EventDispatcher();
    const event = {
      npcs: [],
      town: { id: 13, name: "Nithal" },
    } as unknown as GameEvent;

    dispatcher.handleEvent(event);

    expect(mocks.mapChangeHandle).toHaveBeenCalledWith(event);
    expect(mocks.npcsDetectionHandle).toHaveBeenCalledWith(event);
    expect(mocks.mapChangeHandle.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.npcsDetectionHandle.mock.invocationCallOrder[0],
    );
  });

  it("runs feature projections without bootstrapping domain state", () => {
    const dispatcher = new EventDispatcher();

    dispatcher.handleInitialEvents();

    expect(mocks.npcsInitialDetectionHandle).toHaveBeenCalledOnce();
  });
});
