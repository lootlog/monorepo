import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { EventDispatcher } from "@/lib/event-dispatcher";
import {
  margonemRuntimeBridge,
  type RuntimeFunction,
} from "@/lib/margonem-runtime/margonem-runtime-bridge";
import {
  NiRuntimeAdapter,
  SiRuntimeAdapter,
} from "@/lib/margonem-runtime/runtime-adapter";
import { RuntimeEventPipeline } from "@/lib/margonem-runtime/runtime-event-pipeline";
import { RuntimeStateProjection } from "@/lib/margonem-runtime/runtime-state-projection";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { useDialogStore } from "@/store/game-store/dialog.store";
import { MapChangeProcessor } from "./map-change-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { createAirTagTest } from "@/features/air-tags/air-tag-test";
import { airTagRuntime } from "@/features/air-tags/air-tag-runtime";
import { mapPingController } from "@/features/map-pings/map-ping-controller";
import { mapPingInteractionController } from "@/features/map-pings/map-ping-interaction-controller";

const createMapChangeEvent = (id: number, name: string): GameEvent => ({
  town: {
    id,
    name,
    visibility: 30,
    mainid: id,
    bg: "",
    file: "",
    mode: 0,
    pvp: 0,
    water: "",
    x: 0,
    y: 0,
  },
});

const npc = {
  id: 101,
  location: "Torneg",
  nick: "Old map NPC",
  notificationSentAt: null,
  icon: "npc.gif",
  lvl: 200,
  prof: "w",
  type: 2,
  wt: 80,
  tpl: 1,
  x: 10,
  y: 10,
};

const ping = {
  pingId: "ping",
  world: "fobos",
  mapId: 12,
  type: "attention" as const,
  x: 1,
  y: 2,
  sender: { characterId: "2", name: "Other" },
  createdAt: Date.now(),
};

const beginPing = () =>
  mapPingInteractionController.begin({
    identity: { kind: "mouse", button: 1 },
    mapId: 12,
    origin: { x: 100, y: 100 },
    tile: { x: 1, y: 2 },
  });

const completePing = () =>
  mapPingInteractionController.complete({ kind: "mouse", button: 1 });

describe("MapChangeProcessor", () => {
  let processor: MapChangeProcessor;
  let test: ReturnType<typeof createAirTagTest>;
  beforeEach(() => {
    test = createAirTagTest();
    processor = new MapChangeProcessor();
    useGlobalStore.setState({
      socketState: { connected: false, joined: false, joinedGuilds: [] },
    });
    useNpcDetectorStore.getState().clearNpcs();
    useDialogStore.getState().clearNpcContext();
  });
  afterEach(() => {
    airTagRuntime.shutdown();
    mapPingController.clear();
    mapPingInteractionController.cancel();
  });
  it("ignores events without town data", () => {
    processor.handle({});
    expect(test.wire.frames).toEqual([]);
  });
  it("does not clear current NPCs or publish presence for a partial town update", () => {
    processor.handle(createMapChangeEvent(12, "Torneg"));
    useNpcDetectorStore.setState({ npcs: [npc] });
    useGlobalStore.setState({
      socketState: { connected: true, joined: true, joinedGuilds: ["guild-1"] },
    });
    test.wire.frames.length = 0;
    processor.handle({ town: { pvp: 1 } });
    processor.handle(createMapChangeEvent(12, "Torneg"));
    expect(useNpcDetectorStore.getState().npcs).toEqual([npc]);
    expect(test.wire.frames).toEqual([]);
  });

  it("uses the resolved map for partial transition packets", () => {
    useGlobalStore.setState({
      socketState: { connected: true, joined: true, joinedGuilds: ["guild-1"] },
    });
    setTestRuntimeGame({
      world: "fobos",
      map: { id: 13, name: "Nithal", visibility: 30 },
    });
    test.wire.frames.length = 0;
    processor.handle({ town: { id: 13 } });
    expect(test.wire.frames).toContainEqual(
      expect.objectContaining({
        type: "presence.publish",
        data: expect.objectContaining({
          location: expect.objectContaining({ mapId: 13, map: "Nithal" }),
        }),
      }),
    );
  });

  it.each(["ni", "si"] as const)(
    "completes a deferred map transition once native map data recovers (%s)",
    (gameInterface) => {
      let nativeMapReady = false;

      const nativeMap = {
        id: 13,
        get name() {
          if (!nativeMapReady) throw new Error("Map is still initializing");

          return "Nithal";
        },
        visibility: 30,
      };

      const hero = {
        account: 202,
        id: 101,
        img: "hero.gif",
        lvl: 230,
        nick: "Tester",
        prof: "w",
        x: 1,
        y: 2,
      };

      const worldConfig = { getWorldName: () => "fobos" };
      vi.stubGlobal(
        "Engine",
        gameInterface === "ni"
          ? {
              hero: { d: hero },
              map: { d: nativeMap },
              worldConfig,
            }
          : undefined,
      );
      vi.stubGlobal("hero", hero);
      vi.stubGlobal("map", nativeMap);
      vi.stubGlobal("g", { worldConfig });
      vi.stubGlobal("successData", () => undefined);
      const runtimeWindow: Window & { successData?: RuntimeFunction } = window;

      const projection = new RuntimeStateProjection({
        adapter:
          gameInterface === "ni"
            ? new NiRuntimeAdapter()
            : new SiRuntimeAdapter(),
      });

      const pipeline = new RuntimeEventPipeline({ projection });
      const dispatcher = new EventDispatcher(pipeline);

      const dispatch = (event: GameEvent) => {
        runtimeWindow.successData?.(event);
        pipeline.flush();
      };

      margonemRuntimeBridge.setupProxies();
      pipeline.install();
      pipeline.setReady();
      dispatcher.register();

      try {
        useGlobalStore.setState({
          socketState: {
            connected: true,
            joined: true,
            joinedGuilds: ["guild-1"],
          },
        });
        airTagRuntime.configure({
          connected: true,
          enabled: true,
          joined: true,
        });
        dispatch(createMapChangeEvent(12, "Torneg"));
        useNpcDetectorStore.setState({ npcs: [npc] });
        useDialogStore.getState().setNpcContext({
          npcId: 101,
          npc: null,
          source: "talk-request",
        });
        beginPing();
        mapPingController.addRemote(ping, "Uwaga");
        test.wire.frames.length = 0;

        dispatch({ town: { id: 13 } });
        expect(useGameStore.getState().game?.map).toMatchObject({
          id: 13,
          name: "",
        });
        expect(test.wire.frames).toEqual([]);

        nativeMapReady = true;
        dispatch({ h: { x: 3 } });
        expect(test.wire.frames).toEqual([
          expect.objectContaining({
            type: "presence.publish",
            data: expect.objectContaining({
              location: expect.objectContaining({ mapId: 13, map: "Nithal" }),
            }),
          }),
          expect.objectContaining({
            type: "air-tag.subscription",
            data: expect.objectContaining({ expectedMapId: 13 }),
          }),
        ]);
        expect(useNpcDetectorStore.getState().npcs).toEqual([]);
        expect(useDialogStore.getState().npcContext).toBeNull();
        expect(completePing()).toBeNull();
        expect(mapPingController.addRemote(ping, "Uwaga")).toBe(true);

        dispatch({ h: { x: 4 } });
        expect(test.wire.frames).toHaveLength(2);
        expect(mapPingController.addRemote(ping, "Uwaga")).toBe(false);
      } finally {
        dispatcher.cleanup();
        pipeline.cleanup();
        margonemRuntimeBridge.cleanup();
        vi.unstubAllGlobals();
      }
    },
  );

  it("keeps transport silent when disconnected or no organization is joined", () => {
    processor.handle(createMapChangeEvent(12, "Torneg"));
    useGlobalStore.setState({
      socketState: { connected: true, joined: true, joinedGuilds: [] },
    });
    setTestRuntimeGame({
      world: "fobos",
      map: { id: 13, name: "Nithal", visibility: 30 },
    });
    processor.handle(createMapChangeEvent(13, "Nithal"));
    expect(test.wire.frames).toEqual([]);
  });
  it("publishes presence before the new air-tag map subscription", () => {
    useGlobalStore.setState({
      socketState: { connected: true, joined: true, joinedGuilds: ["guild-1"] },
    });
    airTagRuntime.configure({ connected: true, enabled: true, joined: true });
    test.wire.frames.length = 0;
    setTestRuntimeGame({
      world: "fobos",
      map: { id: 13, name: "Nithal", visibility: 30 },
    });
    processor.handle(createMapChangeEvent(13, "Nithal"));
    expect(test.wire.frames).toEqual([
      expect.objectContaining({
        type: "presence.publish",
        data: expect.objectContaining({
          location: expect.objectContaining({ mapId: 13, map: "Nithal" }),
        }),
      }),
      expect.objectContaining({
        type: "air-tag.subscription",
        data: expect.objectContaining({ expectedMapId: 13 }),
      }),
    ]);
  });
  it("keeps initial NPCs when first observing the current map", () => {
    useNpcDetectorStore.setState({ npcs: [npc] });
    processor.handle(createMapChangeEvent(12, "Torneg"));
    expect(useNpcDetectorStore.getState().npcs).toEqual([npc]);
  });
  it("clears previous NPCs even without an npcs_del packet", () => {
    processor.handle(createMapChangeEvent(12, "Torneg"));
    useNpcDetectorStore.setState({ npcs: [npc] });
    setTestRuntimeGame({
      world: "fobos",
      map: { id: 13, name: "Nithal", visibility: 30 },
    });
    processor.handle(createMapChangeEvent(13, "Nithal"));
    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });
  it("clears tracked dialog context on a map change", () => {
    useDialogStore
      .getState()
      .setNpcContext({ npcId: 501, npc: null, source: "talk-request" });
    processor.handle(createMapChangeEvent(12, "Torneg"));
    expect(useDialogStore.getState().npcContext).toBeNull();
  });
  it("preserves active ping interaction and markers on repeated map packets", () => {
    useGlobalStore.setState({
      socketState: { connected: true, joined: true, joinedGuilds: ["guild-1"] },
    });
    processor.handle(createMapChangeEvent(12, "Torneg"));
    beginPing();
    mapPingController.addRemote(ping, "Uwaga");
    processor.handle(createMapChangeEvent(12, "Torneg"));
    expect(test.wire.frames).toHaveLength(1);
    expect(completePing()).toMatchObject({ mapId: 12 });
    expect(mapPingController.addRemote(ping, "Uwaga")).toBe(false);
  });
  it("clears transient pings and sends presence on another map", () => {
    useGlobalStore.setState({
      socketState: { connected: true, joined: true, joinedGuilds: ["guild-1"] },
    });
    processor.handle(createMapChangeEvent(12, "Torneg"));
    beginPing();
    mapPingController.addRemote(ping, "Uwaga");
    setTestRuntimeGame({
      world: "fobos",
      map: { id: 13, name: "Nithal", visibility: 30 },
    });
    processor.handle(createMapChangeEvent(13, "Nithal"));
    expect(test.wire.frames.at(-1)).toMatchObject({
      type: "presence.publish",
      data: { location: { mapId: 13, map: "Nithal" } },
    });
    expect(completePing()).toBeNull();
    expect(mapPingController.addRemote(ping, "Uwaga")).toBe(true);
  });
});
