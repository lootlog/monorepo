import { act, renderHook } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomExpiry } from "@/features/party-finder/hooks/use-party-ready-room-expiry";

const getReadyRoom = vi.fn<() => Promise<unknown>>();
const mergeProjection = vi.fn();
const removeProjection = vi.fn();
const projection = {
  notificationId: "room-1",
  expiresAt: "2026-07-13T10:00:01.000Z",
  status: "ACTIVE",
} as PartyReadyRoomProjection;

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerGet: () => getReadyRoom(),
}));

vi.mock("@/store/party-finder.store", () => ({
  usePartyFinderStore: (
    selector: (state: {
      projections: Record<string, PartyReadyRoomProjection>;
      mergeProjection: typeof mergeProjection;
      removeProjection: typeof removeProjection;
    }) => unknown,
  ) =>
    selector({
      projections: { "room-1": projection },
      mergeProjection,
      removeProjection,
    }),
}));

describe("usePartyReadyRoomExpiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00.000Z"));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes a locally expired projection after the API confirms 404", async () => {
    getReadyRoom.mockRejectedValue({ status: 404 });
    renderHook(() => usePartyReadyRoomExpiry());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });

    expect(removeProjection).toHaveBeenCalledWith("room-1");
  });
});
