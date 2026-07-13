import { renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyReadyRoomObserver } from "@/features/party-finder/hooks/use-party-ready-room-observer";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { usePartyStore } from "@/store/party.store";

const observeParty =
  vi.fn<
    (
      path: { notificationId: string },
      data: { memberCharacterIds: string[] },
    ) => Promise<unknown>
  >();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerObserveParty: (
    path: { notificationId: string },
    data: { memberCharacterIds: string[] },
  ) => observeParty(path, data),
}));

const projection = {
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 1,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2026-07-13T10:30:00.000Z",
  readyCheck: null,
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
} satisfies PartyReadyRoomOrganizerProjection;

describe("usePartyReadyRoomObserver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    observeParty.mockResolvedValue(projection);
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
    usePartyStore.getState().clearParty();
  });

  it("reports the initial empty snapshot and only changed normalized member sets", async () => {
    renderHook(() => usePartyReadyRoomObserver());

    await waitFor(() => expect(observeParty).toHaveBeenCalledTimes(1));
    usePartyStore.getState().setMembers([
      {
        id: 20,
        nick: "Second",
        icon: "second.gif",
        leader: false,
        hp: [100, 100],
        profession: "m",
        accountId: 2,
      },
      {
        id: 10,
        nick: "First",
        icon: "first.gif",
        leader: true,
        hp: [100, 100],
        profession: "w",
        accountId: 1,
      },
    ]);

    await waitFor(() => expect(observeParty).toHaveBeenCalledTimes(2));
    expect(observeParty).toHaveBeenNthCalledWith(
      2,
      { notificationId: "room-1" },
      { memberCharacterIds: ["10", "20"] },
    );
  });
});
