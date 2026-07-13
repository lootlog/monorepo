import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomSync } from "@/features/party-finder/hooks/use-party-ready-room-sync";

const listReadyRooms = vi.fn<() => Promise<unknown[]>>();
const mergeProjections = vi.fn();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerList: () => listReadyRooms(),
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { socketState: { joined: boolean } }) => unknown,
  ) => selector({ socketState: { joined: true } }),
}));

vi.mock("@/store/party-finder.store", () => ({
  usePartyFinderStore: (
    selector: (state: { mergeProjections: typeof mergeProjections }) => unknown,
  ) => selector({ mergeProjections }),
}));

describe("usePartyReadyRoomSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("merges the authorized REST snapshot after gateway join", async () => {
    const projections = [{ notificationId: "room-1", revision: 3 }];
    listReadyRooms.mockResolvedValue(projections);

    renderHook(() => usePartyReadyRoomSync());

    await waitFor(() => {
      expect(mergeProjections).toHaveBeenCalledWith(projections);
    });
  });
});
