import { renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomObserver } from "@/features/party-finder/hooks/use-party-ready-room-observer";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";
import { useGlobalStore } from "@/store/global.store";

vi.mock("@/features/party-finder/ready-room-character-identity", () => ({
  getCurrentReadyRoomCharacterIdentity: () => ({
    accountId: "account",
    characterId: "character",
  }),
}));

const observeParty = vi.fn<
  (
    path: { notificationId: string },
    data: {
      memberCharacterIds: string[];
      organizerAccountId: string;
      organizerCharacterId: string;
    },
  ) => Promise<unknown>
>();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerObserveParty: (
    path: { notificationId: string },
    data: {
      memberCharacterIds: string[];
      organizerAccountId: string;
      organizerCharacterId: string;
    },
  ) => observeParty(path, data),
}));

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
    observeParty.mockResolvedValue(projection);
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
    usePartyFinderStore.getState().setReadyRoomsSynchronized(true);
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
    usePartyStore.getState().clearParty();
  });

  it("reports the initial empty snapshot and only changed normalized member sets", async () => {
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
    expect(observeParty).toHaveBeenNthCalledWith(
      2,
      { notificationId: "room-1" },
      {
        memberCharacterIds: ["10", "20"],
        organizerAccountId: "account",
        organizerCharacterId: "character",
      },
    );
  });

  it("does not report another character's party for the organizer", async () => {
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
