import { act, renderHook } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { usePartyFinderStore } from "@/store/party-finder.store";

const reserveInvitations = vi.fn<() => Promise<unknown>>();
const acknowledgeInvitation = vi.fn<() => Promise<unknown>>();
const inviteCharacterToParty = vi.fn();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerReserveInvitations: () => reserveInvitations(),
  partyReadyRoomControllerAcknowledgeInvitation: () => acknowledgeInvitation(),
}));

vi.mock("@/utils/game/character-actions", () => ({
  inviteCharacterToParty: (characterId: string) =>
    inviteCharacterToParty(characterId),
}));

const projection = {
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 3,
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

describe("useReadyRoomInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
    acknowledgeInvitation.mockResolvedValue(projection);
  });

  it("runs each game helper once only after a successful explicit reservation", async () => {
    reserveInvitations.mockResolvedValue({
      projection: { ...projection, revision: 4 },
      batch: {
        batchId: "batch-1",
        reservations: [
          {
            participantDiscordId: "participant-1",
            characterId: "character-1",
            commandId: "command-1",
          },
          {
            participantDiscordId: "participant-2",
            characterId: "character-2",
            commandId: "command-2",
          },
        ],
      },
    });
    const { result } = renderHook(() => useReadyRoomInvitations());
    expect(inviteCharacterToParty).not.toHaveBeenCalled();

    await act(() =>
      result.current.inviteParticipants(["participant-1", "participant-2"]),
    );

    expect(inviteCharacterToParty.mock.calls).toEqual([
      ["character-1"],
      ["character-2"],
    ]);
    expect(acknowledgeInvitation).toHaveBeenCalledTimes(2);
  });

  it("does not touch the game when reservation fails", async () => {
    reserveInvitations.mockRejectedValue(new Error("revision conflict"));
    const { result } = renderHook(() => useReadyRoomInvitations());

    await expect(
      result.current.inviteParticipants(["participant-1"]),
    ).rejects.toThrow("revision conflict");
    expect(inviteCharacterToParty).not.toHaveBeenCalled();
  });
});
