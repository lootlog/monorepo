import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useGlobalStore } from "@/store/global.store";
import { MapChangeProcessor } from "./map-change-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";

const mockEmit = vi.fn();
const cancelMapPingInteraction = vi.hoisted(() => vi.fn());
const clearMapPings = vi.hoisted(() => vi.fn());

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
  }),
}));

vi.mock("@/features/map-pings/map-ping-controller", () => ({
  mapPingController: { clear: clearMapPings },
}));

vi.mock("@/features/map-pings/map-ping-interaction-controller", () => ({
  mapPingInteractionController: { cancel: cancelMapPingInteraction },
}));

const createMapChangeEvent = (id: number, name: string): GameEvent =>
  ({
    town: {
      id,
      name,
    },
  }) as GameEvent;

describe("MapChangeProcessor", () => {
  let processor: MapChangeProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new MapChangeProcessor();
    useGlobalStore.setState({
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });
  });

  it("ignores events without town data", () => {
    processor.handle({});

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("ignores map changes when socket is not ready", () => {
    processor.handle(createMapChangeEvent(12, "Torneg"));

    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: [],
      },
    });

    processor.handle(createMapChangeEvent(13, "Nithal"));

    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("emits player presence update for the first distinct map", () => {
    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      },
    });

    processor.handle(createMapChangeEvent(12, "Torneg"));

    expect(mockEmit).toHaveBeenCalledWith(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
      mapId: 12,
      mapName: "Torneg",
    });
  });

  it("does not emit for repeated map ids", () => {
    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      },
    });

    processor.handle(createMapChangeEvent(12, "Torneg"));
    processor.handle(createMapChangeEvent(12, "Torneg"));

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(cancelMapPingInteraction).toHaveBeenCalledTimes(1);
    expect(clearMapPings).toHaveBeenCalledTimes(1);
  });

  it("emits again when map id changes", () => {
    useGlobalStore.setState({
      socketState: {
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      },
    });

    processor.handle(createMapChangeEvent(12, "Torneg"));
    processor.handle(createMapChangeEvent(13, "Nithal"));

    expect(mockEmit).toHaveBeenNthCalledWith(
      2,
      GatewayEvent.PLAYER_PRESENCE_UPDATE,
      {
        mapId: 13,
        mapName: "Nithal",
      },
    );
    expect(cancelMapPingInteraction).toHaveBeenCalledTimes(2);
    expect(clearMapPings).toHaveBeenCalledTimes(2);
  });
});
