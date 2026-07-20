import { renderHook } from "@testing-library/react";
import { GatewayEvent } from "@/config/gateway";
import { useAirTags } from "./use-air-tags";

const testState = vi.hoisted(() => ({
  connected: true,
  enabled: false,
  joined: true,
}));
const socket = vi.hoisted(() => ({
  off: vi.fn(),
  on: vi.fn(),
}));
const runtime = vi.hoisted(() => ({
  configure: vi.fn(),
  handlePermissionsUpdated: vi.fn(),
  handleUpdate: vi.fn(),
  shutdown: vi.fn(),
}));

vi.mock("@/hooks/use-current-game-account-preferences", () => ({
  useCurrentGameAccountPreferences: () => ({
    data: { airTags: { enabled: testState.enabled } },
  }),
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => socket,
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: {
      socketState: { connected: boolean; joined: boolean };
    }) => unknown,
  ) =>
    selector({
      socketState: {
        connected: testState.connected,
        joined: testState.joined,
      },
    }),
}));

vi.mock("./air-tag-runtime", () => ({
  airTagRuntime: runtime,
}));

describe("useAirTags", () => {
  beforeEach(() => {
    testState.connected = true;
    testState.enabled = false;
    testState.joined = true;
    vi.clearAllMocks();
  });

  it("keeps socket listeners detached while the feature is disabled", () => {
    const { unmount } = renderHook(() => useAirTags());

    expect(runtime.configure).toHaveBeenCalledWith({
      connected: true,
      enabled: false,
      joined: true,
    });
    expect(socket.on).not.toHaveBeenCalled();

    unmount();
    expect(runtime.shutdown).toHaveBeenCalledOnce();
  });

  it("attaches listeners only while enabled and ready", () => {
    testState.enabled = true;
    const { rerender, unmount } = renderHook(() => useAirTags());

    expect(socket.on).toHaveBeenCalledWith(
      GatewayEvent.AIR_TAG_UPDATE,
      expect.any(Function),
    );
    expect(socket.on).toHaveBeenCalledWith(
      GatewayEvent.PERMISSIONS_UPDATED,
      expect.any(Function),
    );

    testState.connected = false;
    rerender();

    expect(socket.off).toHaveBeenCalledWith(
      GatewayEvent.AIR_TAG_UPDATE,
      expect.any(Function),
    );
    expect(socket.off).toHaveBeenCalledWith(
      GatewayEvent.PERMISSIONS_UPDATED,
      expect.any(Function),
    );

    unmount();
  });
});
