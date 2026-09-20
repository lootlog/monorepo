import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomExpiry } from "@/features/party-finder/hooks/use-party-ready-room-expiry";
import {
  readSeededReadyRoomCache,
  seedReadyRoomCache,
} from "@/test/ready-room-fixtures";

const projection: PartyReadyRoomProjection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  organizerCharacter: {
    accountId: "account",
    characterId: "character",
    icon: "hero.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2026-07-13T10:00:01.000Z",
  viewer: "PARTICIPANT",
  participants: {},
};

let restoreClient = () => {};

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children);

describe("usePartyReadyRoomExpiry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00.000Z"));
    vi.clearAllMocks();
    queryClient = new QueryClient();
    seedReadyRoomCache(queryClient, [projection]);
    restoreClient = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });
    vi.stubGlobal("fetch", () =>
      Promise.resolve(Response.json({ message: "Not found" }, { status: 404 })),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    restoreClient();
    vi.unstubAllGlobals();
  });

  it("removes a locally expired projection after the API confirms 404", async () => {
    renderHook(() => usePartyReadyRoomExpiry(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await Promise.resolve();
    });

    expect(
      readSeededReadyRoomCache(queryClient).projections["room-1"],
    ).toBeUndefined();
  });
});
