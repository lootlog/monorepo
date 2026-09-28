import { configureApiClients } from "@lootlog/client/transport";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomObserver } from "@/features/party-finder/hooks/use-party-ready-room-observer";
import { QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { mergeReadyRoomProjectionIntoCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import {
  createReadyRoomParticipant,
  readSeededReadyRoomCache,
  seedReadyRoomCache,
} from "@/test/ready-room-fixtures";
import { usePartyStore } from "@/store/party.store";
import { useGlobalStore } from "@/store/global.store";
import { queryClient } from "@/lib/query-client";
import type { RuntimePartyMember } from "@/lib/margonem-runtime/runtime.types";
import {
  canEnqueueReadyRoomInvitations,
  disposeReadyRoomInvitationCoordinator,
  enqueueReadyRoomInvitations,
} from "@/features/party-finder/ready-room-invitation-coordinator";

const observeParty = vi.fn<(request: Request) => Promise<Response>>();

let restoreClient = () => {};

const advanceTime = async (milliseconds = 0) => {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds));
};

const member = (characterId: string): RuntimePartyMember => ({
  characterId,
  accountId: `account-${characterId}`,
  name: characterId,
  icon: "character.gif",
  isLeader: false,
  currentHp: 100,
  maxHp: 100,
  profession: "m",
});

const renderObserver = () =>
  renderHook(() => usePartyReadyRoomObserver(), {
    wrapper: ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  });

afterEach(() => {
  cleanup();
  disposeReadyRoomInvitationCoordinator();
  queryClient.clear();
  restoreClient();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const projection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2999-07-13T10:30:00.000Z",
  viewer: "ORGANIZER",
  organizerCharacter: {
    accountId: "account",
    characterId: "character",
    icon: "character.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  participants: {},
  ownedParticipantIds: [],
} satisfies PartyReadyRoomOrganizerProjection;

describe("usePartyReadyRoomObserver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    restoreClient = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });
    vi.stubGlobal(
      "fetch",
      (input: string | URL | Request, init?: RequestInit) =>
        observeParty(new Request(input, init)),
    );
    observeParty.mockImplementation(() =>
      Promise.resolve(Response.json(projection)),
    );
    setTestRuntimeGame({
      hero: { accountId: "account", characterId: "character" },
    });
    queryClient.clear();
    disposeReadyRoomInvitationCoordinator();
    seedReadyRoomCache(queryClient, [projection]);
    useGlobalStore.getState().setSocketState({
      connected: true,
      joined: true,
      joinedGuilds: ["guild-1"],
    });
    usePartyStore.getState().clearParty();
  });

  it("reports the initial empty snapshot and only changed normalized member sets", async () => {
    usePartyStore.getState().setMembers([]);
    renderObserver();

    await waitFor(() => expect(observeParty).toHaveBeenCalledTimes(1));
    usePartyStore.getState().setMembers([
      {
        characterId: "20",
        name: "Second",
        icon: "second.gif",
        isLeader: false,
        currentHp: 100,
        maxHp: 100,
        profession: "m",
        accountId: "2",
      },
      {
        characterId: "10",
        name: "First",
        icon: "first.gif",
        isLeader: true,
        currentHp: 100,
        maxHp: 100,
        profession: "w",
        accountId: "1",
      },
    ]);

    await waitFor(() => expect(observeParty).toHaveBeenCalledTimes(2));
    const request = observeParty.mock.calls[1]?.[0];
    expect(request?.url).toContain("room-1");
    expect(await request?.json()).toEqual({
      memberCharacterIds: ["10", "20"],
      organizerAccountId: "account",
      organizerCharacterId: "character",
    });

    const members = usePartyStore.getState().members;
    act(() =>
      usePartyStore
        .getState()
        .setMembers([...members.toReversed(), ...members]),
    );
    expect(observeParty).toHaveBeenCalledTimes(2);
  });

  it("waits for the runtime party snapshot and does not report reset state as an empty party", async () => {
    renderObserver();
    expect(observeParty).not.toHaveBeenCalled();

    act(() => usePartyStore.getState().setMembers([]));
    await waitFor(() => expect(observeParty).toHaveBeenCalledTimes(1));

    act(() => usePartyStore.getState().clearParty());
    expect(observeParty).toHaveBeenCalledTimes(1);

    act(() => usePartyStore.getState().setMembers([]));
    await waitFor(() => expect(observeParty).toHaveBeenCalledTimes(2));
  });

  it("does not report another character's party for the organizer", async () => {
    usePartyStore.getState().setMembers([]);
    mergeReadyRoomProjectionIntoCache(
      {
        ...projection,
        revision: 2,
        organizerCharacter: {
          ...projection.organizerCharacter,
          characterId: "different-character",
        },
      },
      queryClient,
    );

    renderObserver();
    await Promise.resolve();

    expect(observeParty).not.toHaveBeenCalled();
  });

  it("recovers a failed departure report and lets the organizer invite that player again", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const participant = {
      ...createReadyRoomParticipant("volunteer", "10"),
      partyPresence: "IN_PARTY" as const,
    };

    const room = {
      ...projection,
      participants: { volunteer: participant },
    };

    seedReadyRoomCache(queryClient, [room]);
    const invitationRequests = vi.fn<(request: Request) => void>();
    const gameRequest = vi.fn<(command: string) => void>();
    vi.stubGlobal("_g", gameRequest);
    vi.stubGlobal(
      "fetch",
      (input: string | URL | Request, init?: RequestInit) => {
        const request = new Request(input, init);

        if (request.url.endsWith("/invitations/targets")) {
          invitationRequests(request);

          return Promise.resolve(
            Response.json({
              targets: [{ participantId: "volunteer", characterId: "10" }],
            }),
          );
        }

        return observeParty(request);
      },
    );
    observeParty
      .mockResolvedValueOnce(Response.json(room))
      .mockResolvedValueOnce(
        Response.json({ message: "Unavailable" }, { status: 503 }),
      )
      .mockResolvedValueOnce(
        Response.json({
          ...room,
          revision: 2,
          participants: {
            volunteer: { ...participant, partyPresence: "OUTSIDE" },
          },
        }),
      );
    usePartyStore.getState().setMembers([member("10")]);
    renderObserver();
    await advanceTime();
    expect(canEnqueueReadyRoomInvitations(["volunteer"])).toBe(false);

    act(() => usePartyStore.getState().setMembers([]));
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(2);
    expect(canEnqueueReadyRoomInvitations(["volunteer"])).toBe(false);

    await advanceTime(1_000);
    expect(observeParty).toHaveBeenCalledTimes(3);
    expect(await observeParty.mock.calls[2]?.[0].json()).toEqual({
      memberCharacterIds: [],
      organizerAccountId: "account",
      organizerCharacterId: "character",
    });
    expect(
      readSeededReadyRoomCache(queryClient).projections["room-1"]?.participants
        .volunteer?.partyPresence,
    ).toBe("OUTSIDE");
    expect(canEnqueueReadyRoomInvitations(["volunteer"])).toBe(true);

    await act(() => enqueueReadyRoomInvitations(["volunteer"]));
    expect(await invitationRequests.mock.calls[0]?.[0].json()).toEqual({
      participantIds: ["volunteer"],
    });
    expect(gameRequest).toHaveBeenCalledWith("party&a=inv&id=10");
    await advanceTime(10_000);
    expect(observeParty).toHaveBeenCalledTimes(3);
  });

  it("serializes reports and coalesces roster changes without merging a superseded response", async () => {
    vi.useFakeTimers();
    const initialResponse = Promise.withResolvers<Response>();
    const latestResponse = Promise.withResolvers<Response>();
    observeParty
      .mockImplementationOnce(() => initialResponse.promise)
      .mockImplementationOnce(() => latestResponse.promise);
    usePartyStore.getState().setMembers([]);
    renderObserver();
    await advanceTime();

    act(() => usePartyStore.getState().setMembers([member("10")]));
    await advanceTime();
    act(() => usePartyStore.getState().setMembers([member("20")]));
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(1);

    initialResponse.resolve(Response.json({ ...projection, revision: 50 }));
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(2);
    expect(await observeParty.mock.calls[1]?.[0].json()).toEqual({
      memberCharacterIds: ["20"],
      organizerAccountId: "account",
      organizerCharacterId: "character",
    });
    expect(
      readSeededReadyRoomCache(queryClient).projections["room-1"]?.revision,
    ).toBe(1);

    latestResponse.resolve(Response.json({ ...projection, revision: 51 }));
    await advanceTime();
    expect(
      readSeededReadyRoomCache(queryClient).projections["room-1"]?.revision,
    ).toBe(51);
    await advanceTime(10_000);
    expect(observeParty).toHaveBeenCalledTimes(2);
  });

  it("reports the latest roster after a pending request fails", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const initialResponse = Promise.withResolvers<Response>();
    observeParty.mockImplementationOnce(() => initialResponse.promise);
    usePartyStore.getState().setMembers([member("10")]);
    renderObserver();
    await advanceTime();
    act(() => usePartyStore.getState().setMembers([member("20")]));
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(1);

    initialResponse.resolve(
      Response.json({ message: "Unavailable" }, { status: 503 }),
    );
    await advanceTime(1_000);
    expect(observeParty).toHaveBeenCalledTimes(2);
    expect(await observeParty.mock.calls[1]?.[0].json()).toEqual({
      memberCharacterIds: ["20"],
      organizerAccountId: "account",
      organizerCharacterId: "character",
    });
    await advanceTime(10_000);
    expect(observeParty).toHaveBeenCalledTimes(2);
  });

  it("bounds retries despite HP changes and gives a new roster its own recovery attempts", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    observeParty.mockImplementation(() =>
      Promise.resolve(
        Response.json({ message: "Unavailable" }, { status: 503 }),
      ),
    );
    usePartyStore.getState().setMembers([member("10")]);
    renderObserver();
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(1);

    act(() =>
      usePartyStore.getState().setMembers([{ ...member("10"), currentHp: 90 }]),
    );
    await advanceTime(999);
    expect(observeParty).toHaveBeenCalledTimes(1);
    await advanceTime(1);
    expect(observeParty).toHaveBeenCalledTimes(2);

    act(() =>
      usePartyStore.getState().setMembers([{ ...member("10"), currentHp: 80 }]),
    );
    await advanceTime(1_999);
    expect(observeParty).toHaveBeenCalledTimes(2);
    await advanceTime(1);
    expect(observeParty).toHaveBeenCalledTimes(3);

    act(() =>
      usePartyStore.getState().setMembers([{ ...member("10"), currentHp: 70 }]),
    );
    await advanceTime(10_000);
    expect(observeParty).toHaveBeenCalledTimes(3);

    act(() => usePartyStore.getState().setMembers([member("20")]));
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(4);
    await advanceTime(1_000);
    expect(observeParty).toHaveBeenCalledTimes(5);
    expect(await observeParty.mock.calls[4]?.[0].json()).toEqual({
      memberCharacterIds: ["20"],
      organizerAccountId: "account",
      organizerCharacterId: "character",
    });
  });

  it("does not retry an authorization rejection", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    observeParty.mockResolvedValueOnce(
      Response.json({ message: "Forbidden" }, { status: 403 }),
    );
    usePartyStore.getState().setMembers([]);
    renderObserver();
    await advanceTime(10_000);
    expect(observeParty).toHaveBeenCalledTimes(1);
  });

  it.each(["room", "organizations"] as const)(
    "does not merge a response after the %s scope changes",
    async (scope) => {
      vi.useFakeTimers();
      const obsoleteResponse = Promise.withResolvers<Response>();
      const currentResponse = Promise.withResolvers<Response>();
      observeParty
        .mockImplementationOnce(() => obsoleteResponse.promise)
        .mockImplementationOnce(() => currentResponse.promise);
      usePartyStore.getState().setMembers([]);
      renderObserver();
      await advanceTime();

      const currentRoom = {
        ...projection,
        notificationId: scope === "room" ? "room-2" : "room-1",
        guildIds: scope === "organizations" ? ["guild-2"] : ["guild-1"],
        revision: 2,
      };

      act(() => seedReadyRoomCache(queryClient, [currentRoom]));
      await advanceTime();
      expect(observeParty).toHaveBeenCalledTimes(1);

      obsoleteResponse.resolve(Response.json({ ...projection, revision: 100 }));
      await advanceTime();
      expect(readSeededReadyRoomCache(queryClient).projections).toEqual({
        [currentRoom.notificationId]: currentRoom,
      });
      expect(observeParty).toHaveBeenCalledTimes(2);
      expect(observeParty.mock.calls[1]?.[0].url).toBe(
        `https://api.test/messaging/party-gathering/${currentRoom.notificationId}/party-observation`,
      );
      currentResponse.resolve(Response.json({ ...currentRoom, revision: 3 }));
      await advanceTime();
    },
  );

  it("waits for the previous observer's report before reporting after a remount", async () => {
    vi.useFakeTimers();
    const obsoleteResponse = Promise.withResolvers<Response>();
    const currentResponse = Promise.withResolvers<Response>();
    observeParty
      .mockImplementationOnce(() => obsoleteResponse.promise)
      .mockImplementationOnce(() => currentResponse.promise);
    usePartyStore.getState().setMembers([]);
    const firstObserver = renderObserver();
    await advanceTime();
    firstObserver.unmount();

    act(() => usePartyStore.getState().setMembers([member("10")]));
    renderObserver();
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(1);

    obsoleteResponse.resolve(Response.json({ ...projection, revision: 100 }));
    await advanceTime();
    expect(observeParty).toHaveBeenCalledTimes(2);
    expect(await observeParty.mock.calls[1]?.[0].json()).toEqual({
      memberCharacterIds: ["10"],
      organizerAccountId: "account",
      organizerCharacterId: "character",
    });
    expect(readSeededReadyRoomCache(queryClient).projections["room-1"]).toEqual(
      projection,
    );

    currentResponse.resolve(Response.json({ ...projection, revision: 101 }));
    await advanceTime();
    expect(
      readSeededReadyRoomCache(queryClient).projections["room-1"]?.revision,
    ).toBe(101);
  });

  it.each(["unmount", "disconnect", "character switch"] as const)(
    "discards an in-flight response after %s",
    async (transition) => {
      vi.useFakeTimers();
      const response = Promise.withResolvers<Response>();
      observeParty.mockImplementationOnce(() => response.promise);
      usePartyStore.getState().setMembers([]);
      const observer = renderObserver();
      await advanceTime();

      if (transition === "unmount") {
        observer.unmount();
      } else if (transition === "character switch") {
        act(() =>
          setTestRuntimeGame({
            hero: { accountId: "account", characterId: "another-character" },
          }),
        );
      } else {
        act(() =>
          useGlobalStore
            .getState()
            .setSocketState({ connected: false, joined: false }),
        );
      }

      response.resolve(Response.json({ ...projection, revision: 100 }));
      await advanceTime(10_000);
      expect(
        readSeededReadyRoomCache(queryClient).projections["room-1"],
      ).toEqual(projection);
      expect(observeParty).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["unmount", "disconnect", "character switch"] as const)(
    "cancels scheduled recovery on %s",
    async (transition) => {
      vi.useFakeTimers();
      vi.spyOn(console, "warn").mockImplementation(() => {});
      observeParty.mockRejectedValueOnce(new TypeError("Failed to fetch"));
      usePartyStore.getState().setMembers([]);
      const observer = renderObserver();
      await advanceTime();
      expect(observeParty).toHaveBeenCalledTimes(1);

      if (transition === "unmount") {
        observer.unmount();
      } else if (transition === "character switch") {
        act(() =>
          setTestRuntimeGame({
            hero: { accountId: "account", characterId: "another-character" },
          }),
        );
      } else {
        act(() =>
          useGlobalStore
            .getState()
            .setSocketState({ connected: false, joined: false }),
        );
      }

      await advanceTime(10_000);
      expect(observeParty).toHaveBeenCalledTimes(1);
    },
  );
});
