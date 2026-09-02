import { act, renderHook } from "@testing-library/react";
import type { PartyReadyRoomClientUpdate } from "@lootlog/schema/party-ready-room";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { usePartyReadyRoomSocket } from "@/features/party-finder/hooks/use-party-ready-room-socket";

const on = vi.fn();
const off = vi.fn();
const applyUpdate = vi.fn();

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({ socket: { on, off }, connected: true }),
}));

vi.mock("@/store/party-finder.store", () => ({
  usePartyFinderStore: (
    selector: (state: { applyUpdate: typeof applyUpdate }) => unknown,
  ) => selector({ applyUpdate }),
}));

describe("usePartyReadyRoomSocket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies personalized gateway updates and unsubscribes", () => {
    const { unmount } = renderHook(() => usePartyReadyRoomSocket());
    const handler = on.mock.calls.find(
      ([event]) => event === GatewayEvent.PARTY_READY_ROOM_UPDATE,
    )?.[1] as ((update: PartyReadyRoomClientUpdate) => void) | undefined;
    const update: PartyReadyRoomClientUpdate = {
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 4,
    };

    act(() => handler?.(update));

    expect(applyUpdate).toHaveBeenCalledWith(update);
    unmount();
    expect(off).toHaveBeenCalledWith(
      GatewayEvent.PARTY_READY_ROOM_UPDATE,
      handler,
    );
  });
});
