import { z } from "zod";
import { configureApiClients } from "@lootlog/client/transport";
import { airTagObservationController } from "@/features/air-tags/air-tag-observation-controller";
import { airTagRuntime } from "@/features/air-tags/air-tag-runtime";
import { mapPingController } from "@/features/map-pings/map-ping-controller";
import { mapPingInteractionController } from "@/features/map-pings/map-ping-interaction-controller";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { useBattlePanelStore } from "@/store/battle-panel.store";
import { useFriendsStore } from "@/store/friends.store";
import { useBattleStore } from "@/store/game-store/battle.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { useLootStore } from "@/store/game-store/loot.store";
import { useGlobalStore } from "@/store/global.store";
import { usePartyStore } from "@/store/party.store";
import { EventDispatcher } from "./event-dispatcher";
import {
  margonemRuntimeBridge,
  type RuntimeFunction,
} from "./margonem-runtime/margonem-runtime-bridge";
import { runtimeEventPipeline } from "./margonem-runtime/runtime-event-pipeline";
import { useGameStore } from "@/store/game.store";
import { useNpcsStore } from "@/store/npcs.store";
import { useOthersStore } from "@/store/others.store";

const effects = {
  cancelMapPingInteraction: vi.spyOn(mapPingInteractionController, "cancel"),
  clearMapPings: vi.spyOn(mapPingController, "clear"),
  handleAirTagMapChange: vi.spyOn(airTagRuntime, "handleMapChange"),
  observeOtherPlayers: vi.spyOn(airTagObservationController, "handle"),
};

type CapturedRequest = { path: string; body: unknown };
const requests: CapturedRequest[] = [];
const restoreApi = configureApiClients({
  main: { baseUrl: "https://api.example.test", fetch: captureHttp },
  battlelog: { baseUrl: "https://battlelog.example.test", fetch: captureHttp },
});
async function captureHttp(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const request = new Request(input, init);
  const path = new URL(request.url).pathname;
  const body: unknown = JSON.parse(await request.text());
  requests.push({ path, body });
  if (path === "/loots")
    return Response.json({ id: 1, submittedGuilds: [], rejectedGuilds: [] });
  if (path === "/kills") return Response.json({ updated: 1 });
  if (path === "/battles") return Response.json({ battleId: "battle-1" });
  return new Response(null, { status: 404 });
}
const requestsFor = (path: string) =>
  requests.filter((request) => request.path === path);
const submittedBattleSchema = z.object({
  events: z.array(
    z.object({
      f: z
        .object({
          m: z.array(z.string()).optional(),
          w: z.record(z.string(), z.unknown()).optional(),
        })
        .optional(),
    }),
  ),
});
const pipelineWindow: Window & { successData?: RuntimeFunction } = window;
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
};

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
};

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
};

const keuktaWarriors = {
  "220": {
    hpp: 100,
    icon: "cashtelan.gif",
    id: 220,
    lvl: 300,
    name: "cashtelan",
    originalId: 220,
    prof: "p",
    team: 1,
    type: 0,
    wt: 0,
  },
  "7533": {
    hpp: 100,
    icon: "keukta.gif",
    id: 7533,
    lvl: 300,
    name: "keukta",
    originalId: 7533,
    prof: "w",
    team: 2,
    type: 0,
    wt: 0,
  },
};

const keuktaMoves = [
  ...Array.from({ length: 40 }, (_, index) => `0;0;txt=opening-${index}`),
  ...Array.from(
    { length: 12 },
    (_, index) => `220=100;7533=90;+dmg=${index + 1};-dmg=${index + 1}`,
  ),
  ...Array.from({ length: 64 }, (_, index) => `0;0;txt=tempo-${index}`),
  "0;0;winner=cashtelan",
  "0;0;loser=keukta",
];

const keuktaIncrementalEvents = [
  {
    ev: 1_785_091_976.1,
    f: {
      init: "1",
      m: keuktaMoves.slice(0, 40),
      w: keuktaWarriors,
    },
  },
  {
    ev: 1_785_091_976.2,
    f: { m: keuktaMoves.slice(40, 80) },
  },
  {
    ev: 1_785_091_976.3,
    f: {
      endBattle: 1,
      m: keuktaMoves.slice(80),
    },
  },
];

const compactKeuktaEvent = {
  ev: 1_785_091_976.4,
  f: {
    endBattle: 1,
    init: "1",
    m: keuktaMoves,
    w: keuktaWarriors,
  },
};

function resetPipelineState(): void {
  runtimeEventPipeline.cleanup();
  margonemRuntimeBridge.cleanup();
  requests.length = 0;
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
  runtimeEventPipeline.install();
  runtimeEventPipeline.setReady(true);
}

// The replay enters the real foreign successData boundary, including fragmentary
// native packets and their serialized forms; the bridge owns field decoding.
function dispatchRuntimeEvent(payload: unknown): unknown {
  return dispatchRuntimeEvents([payload])[0];
}

function dispatchRuntimeEvents(payloads: readonly unknown[]): unknown[] {
  const results = payloads.map((payload) =>
    pipelineWindow.successData?.(payload),
  );
  runtimeEventPipeline.flush();
  return results;
}

function replayAndSnapshot(payload: unknown) {
  resetPipelineState();
  const dispatcher = new EventDispatcher();
  pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
  margonemRuntimeBridge.setupProxies();
  dispatcher.register();

  const result = dispatchRuntimeEvent(payload);
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
  runtimeEventPipeline.cleanup();
  return snapshot;
}

describe("game event pipeline golden replay", () => {
  afterAll(() => {
    restoreApi();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    runtimeEventPipeline.cleanup();
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
    pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    dispatcher.register();
    const finalFightLootEvent = {
      ...finalFightEvent,
      ...fightLootEvent,
      f: finalFightEvent.f,
    };

    dispatchRuntimeEvent(finalFightLootEvent);

    await vi.waitFor(() => expect(requestsFor("/loots")).toHaveLength(1));
    expect(requestsFor("/loots")[0]?.body).toEqual(
      expect.objectContaining({
        loots: [expect.objectContaining({ id: 9001, name: "Unique loot" })],
        npcs: [expect.objectContaining({ id: 100, name: "Boss" })],
        source: "FIGHT",
      }),
    );
    await vi.waitFor(() => expect(requestsFor("/kills")).toHaveLength(1));

    dispatcher.cleanup();
  });

  it("submits fight loot arriving immediately after the final packet", async () => {
    resetPipelineState();
    useBattleStore.setState({ battleState: "in-battle" });
    const dispatcher = new EventDispatcher();
    pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    dispatcher.register();

    dispatchRuntimeEvents([finalFightEvent, fightLootEvent]);

    await vi.waitFor(() => expect(requestsFor("/loots")).toHaveLength(1));
    expect(requestsFor("/loots")[0]?.body).toEqual(
      expect.objectContaining({
        npcs: [expect.objectContaining({ id: 100, name: "Boss" })],
      }),
    );
    await vi.waitFor(() => expect(requestsFor("/kills")).toHaveLength(1));

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
      const firstDispatcher = new EventDispatcher();
      const secondDispatcher = new EventDispatcher();
      pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
      margonemRuntimeBridge.setupProxies();
      firstDispatcher.register();
      secondDispatcher.register();

      dispatchRuntimeEvent({
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
      });

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
      };

      if (lootTiming === "same packet") {
        dispatchRuntimeEvent({
          ...fightLootEvent,
          ...fragmentaryFinalFightEvent,
        });
      } else {
        dispatchRuntimeEvents([fragmentaryFinalFightEvent, fightLootEvent]);
      }

      await vi.waitFor(() => expect(requestsFor("/loots")).toHaveLength(1));
      expect(requestsFor("/loots")[0]?.body).toEqual(
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
      );
      await vi.waitFor(() => expect(requestsFor("/kills")).toHaveLength(1));

      firstDispatcher.cleanup();
      secondDispatcher.cleanup();
    },
  );

  it("submits dialog loot after projection removes the talked NPC", async () => {
    resetPipelineState();
    const dispatcher = new EventDispatcher();
    pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    dispatcher.register();
    const talkedNpc = Object.freeze({
      icon: "npc.gif",
      id: 501,
      level: 300,
      name: "Talked NPC",
      profession: "m",
      templateId: 701,
      type: 2,
      weight: 85,
      x: 1,
      y: 2,
    });
    useNpcsStore.getState().replaceNpcs([talkedNpc]);
    useDialogStore.getState().setNpcContext({
      npc: null,
      npcId: 501,
      source: "talk-request",
    });

    dispatchRuntimeEvent({
      item: fightLootEvent.item,
      loot: { source: "dialog", states: { "loot-1": 1 } },
      npcs_del: [{ id: 501 }],
    });

    expect(useNpcsStore.getState().getNpc(501)).toBeUndefined();
    await vi.waitFor(() => expect(requestsFor("/loots")).toHaveLength(1));
    expect(requestsFor("/loots")[0]?.body).toEqual(
      expect.objectContaining({
        npcs: [expect.objectContaining({ id: 501, name: "Talked NPC" })],
        source: "DIALOG",
      }),
    );

    dispatcher.cleanup();
  });

  it("submits one complete battle when dispatcher registrations overlap and a compact replay follows", async () => {
    resetPipelineState();
    const firstDispatcher = new EventDispatcher();
    const secondDispatcher = new EventDispatcher();
    pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    firstDispatcher.register();
    secondDispatcher.register();

    for (const event of keuktaIncrementalEvents) {
      dispatchRuntimeEvent(event);
    }
    dispatchRuntimeEvent(compactKeuktaEvent);

    await vi.waitFor(() => expect(requestsFor("/battles")).toHaveLength(1));
    const submittedBattle = submittedBattleSchema.parse(
      requestsFor("/battles")[0]?.body,
    );
    const submittedMoves =
      submittedBattle?.events.flatMap((event) => event.f?.m ?? []) ?? [];

    expect(submittedMoves).toHaveLength(118);
    expect(
      submittedMoves.filter((move) => move.startsWith("220=")),
    ).toHaveLength(12);
    expect(submittedBattle?.events[0]?.f?.w).toEqual({
      "220": {
        icon: "cashtelan.gif",
        lvl: 300,
        name: "cashtelan",
        originalId: 220,
        prof: "p",
        team: 1,
      },
      "7533": {
        icon: "keukta.gif",
        lvl: 300,
        name: "keukta",
        originalId: 7533,
        prof: "w",
        team: 2,
      },
    });

    firstDispatcher.cleanup();
    secondDispatcher.cleanup();
  });

  it("accepts an identical battle after the semantic replay window expires", async () => {
    const dateNow = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse("2026-07-26T18:52:57.000Z"));
    resetPipelineState();
    const dispatcher = new EventDispatcher();
    pipelineWindow.successData = vi.fn<() => string>(() => "game-result");
    margonemRuntimeBridge.setupProxies();
    dispatcher.register();

    for (const event of keuktaIncrementalEvents) {
      dispatchRuntimeEvent(event);
    }
    await vi.waitFor(() => expect(requestsFor("/battles")).toHaveLength(1));
    dateNow.mockReturnValue(Date.parse("2026-07-26T18:53:07.001Z"));
    dispatchRuntimeEvent({
      ...compactKeuktaEvent,
      ev: 1_785_091_986.4,
    });

    await vi.waitFor(() => expect(requestsFor("/battles")).toHaveLength(2));

    dispatcher.cleanup();
    dateNow.mockRestore();
  });
});
