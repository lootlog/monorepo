import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { beforeEach, afterEach, describe, expect, it } from "vitest";
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
  notificationSent: false,
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
