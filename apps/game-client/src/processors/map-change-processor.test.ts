import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useGlobalStore } from "@/store/global.store";
import { useNpcDetectorStore } from "@/store/npc-detector.store";
import { MapChangeProcessor } from "./map-change-processor";
import type { GameEvent } from "@lootlog/margonem/game-events";
import { useDialogStore } from "@/store/game-store/dialog.store";

const mockEmit = vi.fn();
const cancelMapPingInteraction = vi.hoisted(() => vi.fn());
const clearMapPings = vi.hoisted(() => vi.fn());
const handleAirTagMapChange = vi.hoisted(() => vi.fn());

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

vi.mock("@/features/air-tags/air-tag-runtime", () => ({
  airTagRuntime: { handleMapChange: handleAirTagMapChange },
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
    useNpcDetectorStore.getState().clearNpcs();
    useDialogStore.getState().clearNpcContext();
  });

  it("ignores events without town data", () => {
    processor.handle({});

    expect(mockEmit).not.toHaveBeenCalled();
    expect(handleAirTagMapChange).not.toHaveBeenCalled();
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
    expect(handleAirTagMapChange).toHaveBeenNthCalledWith(1, 12, "Torneg");
    expect(handleAirTagMapChange).toHaveBeenNthCalledWith(2, 13, "Nithal");
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
    expect(handleAirTagMapChange).toHaveBeenCalledWith(12, "Torneg");
    expect(mockEmit.mock.invocationCallOrder[0]).toBeLessThan(
      handleAirTagMapChange.mock.invocationCallOrder[0],
    );
  });

  it("keeps the initial NPC snapshot when first observing its current map", () => {
    useNpcDetectorStore.setState({
      npcs: [
        {
          id: 101,
          location: "Torneg",
          name: "Old map NPC",
          notificationSent: false,
        } as never,
      ],
    });

    processor.handle(createMapChangeEvent(12, "Torneg"));

    expect(useNpcDetectorStore.getState().npcs).toHaveLength(1);
  });

  it("clears NPCs retained from the previous map without an npcs_del packet", () => {
    processor.handle(createMapChangeEvent(12, "Torneg"));
    useNpcDetectorStore.setState({
      npcs: [
        {
          id: 101,
          location: "Torneg",
          name: "Old map NPC",
          notificationSent: false,
        } as never,
      ],
    });

    processor.handle(createMapChangeEvent(13, "Nithal"));

    expect(useNpcDetectorStore.getState().npcs).toEqual([]);
  });

  it("clears the tracked dialog npc when the map changes", () => {
    useDialogStore.getState().setNpcContext({
      npcId: 501,
      npc: null,
      source: "talk-request",
    });

    processor.handle(createMapChangeEvent(12, "Torneg"));

    expect(useDialogStore.getState().npcContext).toBeNull();
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
    expect(handleAirTagMapChange).toHaveBeenCalledTimes(1);
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
    expect(handleAirTagMapChange).toHaveBeenNthCalledWith(2, 13, "Nithal");
  });
});
