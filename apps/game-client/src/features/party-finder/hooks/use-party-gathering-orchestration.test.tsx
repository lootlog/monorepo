import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import type { PartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { usePartyGatheringOrchestration } from "./use-party-gathering-orchestration";

const createRoom = vi.fn<(request: Request) => Promise<Response>>();

const sendChat = vi.fn<(request: Request) => Promise<Response>>();

const getRoom = vi.fn<(request: Request) => Promise<Response>>();

const notify = vi.fn<(request: Request) => Promise<Response>>();

const npc = {
  id: 1,
  nick: "Hydra",
  lvl: 250,
  prof: "m",
  icon: "hydra.gif",
  tpl: 1,
  x: 1,
  y: 2,
  type: 2,
  wt: 80,
  location: "Ithan",
  notificationSent: false,
};

let restoreClient = () => {};

let queryClient: QueryClient;

function Wrapper({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

afterEach(() => {
  restoreClient();
  queryClient.clear();
  vi.unstubAllGlobals();
});

const projection: PartyReadyRoomProjection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer-1",
  organizerCharacter: {
    accountId: "account-1",
    characterId: "character-1",
    icon: "hero.gif",
    lvl: 200,
    nick: "Hero",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "tempest",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-22T10:00:00.000Z",
  updatedAt: "2026-07-22T10:00:00.000Z",
  expiresAt: "2999-07-22T10:30:00.000Z",
  viewer: "ORGANIZER",
  participants: {},
  ownedParticipantIds: [],
};

describe("usePartyGatheringOrchestration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    restoreClient = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });
    setTestRuntimeGame({
      hero: {
        accountId: "account-1",
        characterId: "character-1",
        name: "Hero",
      },
    });
    usePartyFinderStore.getState().clearReadyRooms();
    useWindowsStore.getState().setOpen("party-finder", false);
    useWindowsStore.getState().setOpen("create-party-gathering", true);
    createRoom.mockImplementation(() =>
      Promise.resolve(Response.json(projection)),
    );
    getRoom.mockImplementation(() =>
      Promise.resolve(Response.json(projection)),
    );
    sendChat.mockImplementation(() =>
      Promise.resolve(Response.json({ id: "message-1" })),
    );
    notify.mockImplementation(() =>
      Promise.resolve(
        Response.json({ notificationId: "room-1", guildIds: ["guild-1"] }),
      ),
    );
    vi.stubGlobal(
      "fetch",
      (input: string | URL | Request, init?: RequestInit) => {
        const request = new Request(input, init);
        const path = new URL(request.url).pathname;

        if (path.endsWith("/chat-messages")) return sendChat(request);

        if (path === "/messaging") return notify(request);

        if (request.method === "GET") return getRoom(request);

        return createRoom(request);
      },
    );
  });
  it("creates a gathering without publishing a chat message or opening Party Finder when requested", async () => {
    const { result } = renderHook(() => usePartyGatheringOrchestration(), {
      wrapper: Wrapper,
    });

    await act(() =>
      result.current.startPartyGathering({
        openPartyFinder: false,
        guildIds: ["guild-1"],
        world: "tempest",
      }),
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(false);
    expect(usePartyFinderStore.getState().projections["room-1"]).toEqual(
      projection,
    );
    expect(sendChat).not.toHaveBeenCalled();
  });
  it("opens the committed gathering and closes its creation window", async () => {
    const { result } = renderHook(() => usePartyGatheringOrchestration(), {
      wrapper: Wrapper,
    });

    await act(() =>
      result.current.startPartyGathering({
        guildIds: ["guild-1"],
        world: "tempest",
        closeCreateWindow: true,
      }),
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(true);
    expect(useWindowsStore.getState()["create-party-gathering"].open).toBe(
      false,
    );
    expect(usePartyFinderStore.getState().projections["room-1"]).toEqual(
      projection,
    );
  });
  it("opens a known active gathering without creating another one", async () => {
    usePartyFinderStore.getState().mergeProjection(projection);

    const { result } = renderHook(() => usePartyGatheringOrchestration(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.startPartyGathering({
          guildIds: ["guild-1"],
          world: "tempest",
          closeCreateWindow: true,
        }),
      ).rejects.toMatchObject({ code: "ACTIVE_GATHERING_EXISTS" });
    });
    expect(createRoom).not.toHaveBeenCalled();
    expect(sendChat).not.toHaveBeenCalled();
    expect(useWindowsStore.getState()["party-finder"].open).toBe(true);
    expect(useWindowsStore.getState()["create-party-gathering"].open).toBe(
      false,
    );
  });
  it("synchronizes an active gathering reported by the backend", async () => {
    createRoom.mockImplementation(() =>
      Promise.resolve(
        Response.json(
          { code: "ACTIVE_GATHERING_EXISTS", notificationId: "room-1" },
          { status: 409 },
        ),
      ),
    );

    const { result } = renderHook(() => usePartyGatheringOrchestration(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await expect(
        result.current.startPartyGathering({
          guildIds: ["guild-1"],
          world: "tempest",
        }),
      ).rejects.toMatchObject({ status: 409 });
    });
    expect(getRoom.mock.calls[0]?.[0].url).toBe(
      "https://api.test/messaging/party-gathering/room-1",
    );
    expect(usePartyFinderStore.getState().projections["room-1"]).toEqual(
      projection,
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(true);
    expect(sendChat).not.toHaveBeenCalled();
  });
  it("creates an NPC gathering without publishing a chat message or opening Party Finder when requested", async () => {
    const { result } = renderHook(() => usePartyGatheringOrchestration(), {
      wrapper: Wrapper,
    });

    await act(() =>
      result.current.startNpcPartyGathering({
        openPartyFinder: false,
        npc,
        guildIds: ["guild-1"],
        world: "tempest",
      }),
    );
    expect(useWindowsStore.getState()["party-finder"].open).toBe(false);
    expect(usePartyFinderStore.getState().projections["room-1"]).toEqual(
      projection,
    );
    expect(sendChat).not.toHaveBeenCalled();
  });
  it("still publishes ordinary NPC notifications to chat", async () => {
    const { result } = renderHook(() => usePartyGatheringOrchestration(), {
      wrapper: Wrapper,
    });

    await act(() =>
      result.current.startNpcNotification({
        npc,
        guildIds: ["guild-1"],
        world: "tempest",
      }),
    );
    expect(await notify.mock.calls[0]?.[0].json()).toMatchObject({
      npc: { name: "Hydra" },
      world: "tempest",
    });
    expect(sendChat).toHaveBeenCalledTimes(1);
    expect(await sendChat.mock.calls[0]?.[0].json()).toMatchObject({
      type: "NPC",
      npc: { name: "Hydra", world: "tempest" },
    });
    expect(usePartyFinderStore.getState().projections).toEqual({});
  });
});
