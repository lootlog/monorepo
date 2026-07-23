import { GatewayEvent } from "@/config/gateway";
import { AirTagRuntime } from "./air-tag-runtime";
import { afterEach } from "vitest";
import { useGameStore } from "@/store/game.store";

const mocks = vi.hoisted(() => ({
  applySubscriptionAck: vi.fn(),
  beginSubscription: vi.fn(),
  clearObservations: vi.fn(),
  clearReceived: vi.fn(),
  configureObservations: vi.fn(),
  emit: vi.fn(),
  getWorldName: vi.fn(() => "fobos"),
  handleUpdate: vi.fn(),
  map: { id: 12, name: "Torneg" } as { id: number; name: string } | null,
  registerRenderer: vi.fn(),
  resetObservationsForMap: vi.fn(),
  unregisterRenderer: vi.fn(),
}));

vi.mock("@/lib/margonem-runtime/runtime-adapter", () => ({
  getMargonemInterface: () => "ni",
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ emit: mocks.emit }),
}));

vi.mock("./air-tag-observation-controller", () => ({
  airTagObservationController: {
    clear: mocks.clearObservations,
    configure: mocks.configureObservations,
    resetForMap: mocks.resetObservationsForMap,
  },
}));

vi.mock("./air-tag-receive-controller", () => ({
  airTagReceiveController: {
    applySubscriptionAck: mocks.applySubscriptionAck,
    beginSubscription: mocks.beginSubscription,
    clear: mocks.clearReceived,
    handleUpdate: mocks.handleUpdate,
  },
}));

vi.mock("./air-tag-renderer", () => ({
  airTagRenderer: {
    register: mocks.registerRenderer,
    unregister: mocks.unregisterRenderer,
  },
}));

describe("AirTagRuntime", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.map = { id: 12, name: "Torneg" };
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "1",
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
      map: { id: 12, name: "Torneg", visibility: 30 },
      world: "fobos",
    });
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000001")
      .mockReturnValueOnce("00000000-0000-4000-8000-000000000002");
  });

  it("publishes presence before subscribing to the current map", () => {
    const runtime = new AirTagRuntime();

    runtime.configure({ connected: true, enabled: true, joined: true });

    expect(mocks.emit).toHaveBeenNthCalledWith(
      1,
      GatewayEvent.PLAYER_PRESENCE_UPDATE,
      { mapId: 12, mapName: "Torneg" },
    );
    expect(mocks.beginSubscription).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000001",
      "fobos",
      12,
    );
    expect(mocks.emit).toHaveBeenNthCalledWith(
      2,
      GatewayEvent.AIR_TAG_SUBSCRIPTION,
      {
        enabled: true,
        expectedMapId: 12,
        requestId: "00000000-0000-4000-8000-000000000001",
      },
      expect.any(Function),
    );
  });

  it("subscribes using raw map-change data before Game.map is updated", () => {
    const runtime = new AirTagRuntime();
    runtime.configure({ connected: true, enabled: true, joined: true });
    vi.clearAllMocks();

    runtime.handleMapChange(13, "Nithal");

    expect(mocks.resetObservationsForMap).toHaveBeenCalledWith(13);
    expect(mocks.beginSubscription).toHaveBeenCalledWith(
      "00000000-0000-4000-8000-000000000002",
      "fobos",
      13,
    );
    expect(mocks.emit).toHaveBeenCalledWith(
      GatewayEvent.AIR_TAG_SUBSCRIPTION,
      {
        enabled: true,
        expectedMapId: 13,
        requestId: "00000000-0000-4000-8000-000000000002",
      },
      expect.any(Function),
    );
    expect(mocks.emit).not.toHaveBeenCalledWith(
      GatewayEvent.PLAYER_PRESENCE_UPDATE,
      expect.anything(),
    );
  });

  it("unsubscribes and clears client state when disabled", () => {
    const runtime = new AirTagRuntime();
    runtime.configure({ connected: true, enabled: true, joined: true });
    vi.clearAllMocks();

    runtime.configure({ connected: true, enabled: false, joined: true });

    expect(mocks.emit).toHaveBeenCalledWith(
      GatewayEvent.AIR_TAG_SUBSCRIPTION,
      {
        enabled: false,
        requestId: "00000000-0000-4000-8000-000000000002",
      },
      expect.any(Function),
    );
    expect(mocks.clearReceived).toHaveBeenCalled();
    expect(mocks.unregisterRenderer).toHaveBeenCalled();
  });
});
