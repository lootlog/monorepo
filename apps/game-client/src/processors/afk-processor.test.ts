import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RealtimeClient } from "@lootlog/client/realtime";
import { configureGameClientPlatform } from "@/lib/game-client-platform";
import { disposeSocket, getSocket } from "@/lib/socket";
import { RealtimeWire } from "@/test/realtime-wire";
import { useGlobalStore } from "@/store/global.store";
import { useGameStore } from "@/store/game.store";
import { AfkProcessor } from "./afk-processor";

describe("AfkProcessor", () => {
  let processor: AfkProcessor;
  let wire: RealtimeWire;
  let restorePlatform: () => void;

  beforeEach(async () => {
    disposeSocket();
    wire = new RealtimeWire();
    const realtime = new RealtimeClient({
      url: "https://gateway.example.test",
      webSocketFactory: () => wire,
    });
    restorePlatform = configureGameClientPlatform({
      fetch: globalThis.fetch,
      createRealtime: () => realtime,
    });
    getSocket().connect();
    wire.open();
    processor = new AfkProcessor();
    useGlobalStore.setState({
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "2",
        characterId: "1",
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
      map: { id: 77, name: "Ithan", visibility: 30 },
      world: "pandora",
    });
    wire.receive({
      v: 1,
      type: "permissions.updated",
      data: { organizationIds: ["guild-1"], subscriptionScopes: [] },
    });
    await vi.waitUntil(() => wire.frames.length === 1);
    wire.frames.length = 0;
  });

  afterEach(() => {
    disposeSocket();
    restorePlatform();
  });

  it("ignores events without stasis", () => {
    processor.handle({});

    expect(wire.frames).toEqual([]);
  });

  it("emits player presence update when afk state changes and socket is ready", () => {
    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      },
    });

    processor.handle({ h: { stasis: 1 } });

    expect(wire.frames).toMatchObject([
      {
        type: "presence.publish",
        data: {
          isAfk: true,
          location: { mapId: 77, map: "Ithan" },
        },
      },
    ]);
  });

  it("does not emit when stasis value repeats", () => {
    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      },
    });

    processor.handle({ h: { stasis: 1 } });
    processor.handle({ h: { stasis: 1 } });

    expect(wire.frames).toHaveLength(1);
  });

  it("does not emit when socket is disconnected or no guilds are joined", () => {
    processor.handle({ h: { stasis: 1 } });

    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: [],
      },
    });

    processor.handle({ h: { stasis: 0 } });

    expect(wire.frames).toEqual([]);
  });
});
