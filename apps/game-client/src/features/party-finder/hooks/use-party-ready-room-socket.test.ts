import { act, renderHook } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { usePartyReadyRoomSocket } from "@/features/party-finder/hooks/use-party-ready-room-socket";

const on = vi.fn();
const off = vi.fn();
const mergeProjection = vi.fn();

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({ socket: { on, off }, connected: true }),
}));

vi.mock("@/store/party-finder.store", () => ({
  usePartyFinderStore: (
    selector: (state: { mergeProjection: typeof mergeProjection }) => unknown,
  ) => selector({ mergeProjection }),
}));

describe("usePartyReadyRoomSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges personalized gateway projections and unsubscribes", () => {
    const { unmount } = renderHook(() => usePartyReadyRoomSocket());
    const handler = on.mock.calls.find(
      ([event]) => event === GatewayEvent.PARTY_READY_ROOM_UPDATE,
    )?.[1] as ((projection: PartyReadyRoomProjection) => void) | undefined;
    const projection = {
      notificationId: "room-1",
      revision: 4,
    } as PartyReadyRoomProjection;

    act(() => handler?.(projection));

    expect(mergeProjection).toHaveBeenCalledWith(projection);
    unmount();
    expect(off).toHaveBeenCalledWith(
      GatewayEvent.PARTY_READY_ROOM_UPDATE,
      handler,
    );
  });
});
