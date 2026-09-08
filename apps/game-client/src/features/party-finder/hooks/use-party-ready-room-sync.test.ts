import { configureApiClients } from "@lootlog/client/transport";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomSync } from "@/features/party-finder/hooks/use-party-ready-room-sync";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";

const listReadyRooms = vi.fn<() => Promise<PartyReadyRoomProjection[]>>();

function createProjection(revision: number): PartyReadyRoomProjection {
  return {
    schemaVersion: 3,
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
    viewer: "PARTICIPANT",
    participants: {},
  };
}

let restoreClient = () => {};
afterEach(() => {
  restoreClient();
  vi.unstubAllGlobals();
});
describe("usePartyReadyRoomSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreClient = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });
    vi.stubGlobal("fetch", async () => Response.json(await listReadyRooms()));
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
    const listResponse = Promise.withResolvers<PartyReadyRoomProjection[]>();
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
