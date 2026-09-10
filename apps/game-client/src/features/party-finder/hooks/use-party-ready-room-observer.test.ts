import { configureApiClients } from "@lootlog/client/transport";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomObserver } from "@/features/party-finder/hooks/use-party-ready-room-observer";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { useGlobalStore } from "@/store/global.store";

const observeParty = vi.fn<(request: Request) => Promise<Response>>();

let restoreClient = () => {};

afterEach(() => {
  restoreClient();
  vi.unstubAllGlobals();
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
  expiresAt: "2026-07-13T10:30:00.000Z",
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
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
    usePartyFinderStore.getState().setReadyRoomsSynchronized(true);
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
    usePartyStore.getState().clearParty();
  });

  it("reports the initial empty snapshot and only changed normalized member sets", async () => {
    usePartyStore.getState().setMembers([]);
    renderHook(() => usePartyReadyRoomObserver());

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
    renderHook(() => usePartyReadyRoomObserver());
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
    usePartyFinderStore.getState().mergeProjection({
      ...projection,
      revision: 2,
      organizerCharacter: {
        ...projection.organizerCharacter,
        characterId: "different-character",
      },
    });

    renderHook(() => usePartyReadyRoomObserver());
    await Promise.resolve();

    expect(observeParty).not.toHaveBeenCalled();
  });
});
