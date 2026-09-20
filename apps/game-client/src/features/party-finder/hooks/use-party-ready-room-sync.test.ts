import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomSync } from "@/features/party-finder/hooks/use-party-ready-room-sync";
import { areReadyRoomsSynchronized } from "@/features/party-finder/hooks/use-ready-rooms";
import { mergeReadyRoomProjectionIntoCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { useGlobalStore } from "@/store/global.store";
import { readSeededReadyRoomCache } from "@/test/ready-room-fixtures";

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

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

const renderSync = () => renderHook(() => usePartyReadyRoomSync(), { wrapper });

const readCache = () => readSeededReadyRoomCache(queryClient);

afterEach(() => {
  restoreClient();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("usePartyReadyRoomSync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreClient = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });
    vi.stubGlobal("fetch", async () => Response.json(await listReadyRooms()));
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
  });

  it("applies the authorized REST snapshot after gateway join", async () => {
    listReadyRooms.mockResolvedValue([createProjection(3)]);

    renderSync();

    await waitFor(() => {
      expect(readCache()).toMatchObject({
        projections: { "room-1": { revision: 3 } },
      });
      expect(areReadyRoomsSynchronized(queryClient)).toBe(true);
    });
  });

  it("preserves a newer socket projection received during a delayed list request", async () => {
    mergeReadyRoomProjectionIntoCache(createProjection(2), queryClient);
    const listResponse = Promise.withResolvers<PartyReadyRoomProjection[]>();
    listReadyRooms.mockImplementation(() => listResponse.promise);
    renderSync();

    act(() => {
      mergeReadyRoomProjectionIntoCache(createProjection(3), queryClient);
    });
    listResponse.resolve([]);

    await waitFor(() => {
      expect(readCache()).toMatchObject({
        projections: { "room-1": { revision: 3 } },
      });
      expect(areReadyRoomsSynchronized(queryClient)).toBe(true);
    });
  });
  it("keeps the collection unsynchronized when a socket update follows a failed list", async () => {
    listReadyRooms.mockRejectedValue(new Error("Gateway unavailable"));
    renderSync();

    await waitFor(() => expect(listReadyRooms).toHaveBeenCalled());
    expect(areReadyRoomsSynchronized(queryClient)).toBe(false);

    act(() => {
      mergeReadyRoomProjectionIntoCache(createProjection(4), queryClient);
    });

    expect(readCache().projections["room-1"]?.revision).toBe(4);
    expect(areReadyRoomsSynchronized(queryClient)).toBe(false);
  });

  it("synchronizes once per gateway join instead of polling", async () => {
    vi.useFakeTimers();
    listReadyRooms
      .mockResolvedValueOnce([createProjection(1)])
      .mockResolvedValueOnce([]);
    const { unmount } = renderSync();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(readCache().projections["room-1"]).toBeDefined();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60_000);
    });
    expect(listReadyRooms).toHaveBeenCalledTimes(1);
    expect(readCache().projections["room-1"]).toBeDefined();
    act(() => {
      useGlobalStore
        .getState()
        .setSocketState({ connected: false, joined: false });
    });
    expect(areReadyRoomsSynchronized(queryClient)).toBe(false);
    act(() => {
      useGlobalStore
        .getState()
        .setSocketState({ connected: true, joined: true });
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(listReadyRooms).toHaveBeenCalledTimes(2);
    expect(readCache()).toMatchObject({ projections: {} });
    expect(areReadyRoomsSynchronized(queryClient)).toBe(true);
    unmount();
  });
});
