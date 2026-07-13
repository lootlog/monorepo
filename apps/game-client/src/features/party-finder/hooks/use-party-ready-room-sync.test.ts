import { act, renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomSync } from "@/features/party-finder/hooks/use-party-ready-room-sync";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";

const listReadyRooms = vi.fn<() => Promise<unknown[]>>();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerList: () => listReadyRooms(),
}));

function createProjection(revision: number): PartyReadyRoomProjection {
  return {
    schemaVersion: 2,
    notificationId: "room-1",
    organizerDiscordId: "organizer",
    organizerCharacter: {
      accountId: "organizer-account",
      characterId: "organizer-character",
      icon: "organizer.gif",
      lvl: 200,
      nick: "Organizer",
      prof: "w",
    },
    guildIds: ["guild-1"],
    world: "Fobos",
    status: "ACTIVE",
    revision,
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
    expiresAt: "2999-07-13T10:30:00.000Z",
    readyCheck: null,
    viewer: "PARTICIPANT",
    participants: {},
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("usePartyReadyRoomSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartyFinderStore.getState().clearReadyRooms();
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
  });

  it("applies the authorized REST snapshot after gateway join", async () => {
    listReadyRooms.mockResolvedValue([createProjection(3)]);

    renderHook(() => usePartyReadyRoomSync());

    await waitFor(() => {
      expect(usePartyFinderStore.getState()).toMatchObject({
        readyRoomsSynchronized: true,
        projections: { "room-1": { revision: 3 } },
      });
    });
  });

  it("preserves a newer socket projection received during a delayed list request", async () => {
    usePartyFinderStore.getState().mergeProjection(createProjection(2));
    const listResponse = createDeferred<unknown[]>();
    listReadyRooms.mockImplementation(() => listResponse.promise);
    renderHook(() => usePartyReadyRoomSync());

    act(() => {
      usePartyFinderStore.getState().mergeProjection(createProjection(3));
    });
    listResponse.resolve([]);

    await waitFor(() => {
      expect(usePartyFinderStore.getState()).toMatchObject({
        readyRoomsSynchronized: true,
        projections: { "room-1": { revision: 3 } },
      });
    });
  });
});
