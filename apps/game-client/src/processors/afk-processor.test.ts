import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useGlobalStore } from "@/store/global.store";
import { AfkProcessor } from "./afk-processor";

const mockEmit = vi.fn();

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    emit: mockEmit,
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    map: {
      id: 77,
      name: "Ithan",
    },
  },
}));

describe("AfkProcessor", () => {
  let processor: AfkProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new AfkProcessor();
    useGlobalStore.setState({
      socketState: {
        connected: false,
        joined: false,
        joinedGuilds: [],
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("ignores events without stasis", () => {
    processor.handle({});

    expect(mockEmit).not.toHaveBeenCalled();
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

    expect(mockEmit).toHaveBeenCalledWith(GatewayEvent.PLAYER_PRESENCE_UPDATE, {
      isAfk: true,
      mapId: 77,
      mapName: "Ithan",
    });
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

    expect(mockEmit).toHaveBeenCalledTimes(1);
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

    expect(mockEmit).not.toHaveBeenCalled();
  });
});
