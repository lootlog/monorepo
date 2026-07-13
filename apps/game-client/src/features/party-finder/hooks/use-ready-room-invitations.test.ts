import { act, renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { resetReadyRoomInvitationCoordinatorForTests } from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";

const reserveInvitations = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const acknowledgeInvitation = vi.fn<(...args: unknown[]) => Promise<unknown>>();
const inviteCharacterToParty = vi.fn();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerReserveInvitations: (...args: unknown[]) =>
    reserveInvitations(...args),
  partyReadyRoomControllerAcknowledgeInvitation: (...args: unknown[]) =>
    acknowledgeInvitation(...args),
}));

vi.mock("@/utils/game/character-actions", () => ({
  inviteCharacterToParty: (characterId: string) =>
    inviteCharacterToParty(characterId),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getAccountId: () => "organizer-account",
    hero: { id: "organizer-character" },
  },
}));

const participant = {
  participantId: "participant-1",
  applicationVersion: 1,
  discordId: "participant",
  character: {
    accountId: "participant-account",
    characterId: "participant-character",
    icon: "participant.gif",
    lvl: 190,
    nick: "Participant",
    prof: "m",
  },
  application: "ACCEPTED",
  readiness: "NOT_REQUESTED",
  invitation: {
    status: "NOT_MARKED",
    source: null,
    commandId: null,
    batchId: null,
    reservationExpiresAt: null,
    updatedAt: "2026-07-13T10:00:00.000Z",
  },
  partyPresence: "OUTSIDE",
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
} as const;

const projection = {
  schemaVersion: 2,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2999-07-13T10:30:00.000Z",
  readyCheck: null,
  viewer: "ORGANIZER",
  organizerCharacter: {
    accountId: "organizer-account",
    characterId: "organizer-character",
    icon: "character.gif",
    lvl: 200,
    nick: "Organizer",
    prof: "w",
  },
  participants: { "participant-1": participant },
  ownedParticipantIds: [],
} satisfies PartyReadyRoomOrganizerProjection;

function createReservationResponse(
  revision: number,
  commandId: string,
  characterId = "participant-character",
) {
  return {
    projection: { ...projection, revision },
    batch: {
      batchId: `batch-${commandId}`,
      reservations: [
        {
          participantId: "participant-1",
          applicationVersion: 1,
          characterId,
          commandId,
        },
      ],
    },
  };
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

describe("useReadyRoomInvitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetReadyRoomInvitationCoordinatorForTests();
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
    usePartyFinderStore.getState().setReadyRoomsSynchronized(true);
    useGlobalStore.getState().setSocketState({ connected: true, joined: true });
    acknowledgeInvitation.mockResolvedValue({ ...projection, revision: 100 });
  });

  it("runs the game helper once only after a successful explicit reservation", async () => {
    reserveInvitations.mockResolvedValue(
      createReservationResponse(4, "command-1"),
    );
    const { result } = renderHook(() => useReadyRoomInvitations());
    expect(inviteCharacterToParty).not.toHaveBeenCalled();

    await act(() => result.current.inviteParticipants(["participant-1"]));

    expect(reserveInvitations).toHaveBeenCalledWith(
      { notificationId: "room-1" },
      {
        targets: [{ participantId: "participant-1", applicationVersion: 1 }],
      },
    );
    expect(inviteCharacterToParty).toHaveBeenCalledTimes(1);
    expect(inviteCharacterToParty).toHaveBeenCalledWith(
      "participant-character",
    );
    await waitFor(() => expect(acknowledgeInvitation).toHaveBeenCalledTimes(1));
  });

  it("serializes rapid explicit clicks without disabling later intents", async () => {
    const firstReservation = createDeferred<unknown>();
    reserveInvitations
      .mockImplementationOnce(() => firstReservation.promise)
      .mockResolvedValueOnce(createReservationResponse(5, "command-2"));
    const { result } = renderHook(() => useReadyRoomInvitations());

    let firstIntent!: Promise<unknown>;
    let secondIntent!: Promise<unknown>;
    act(() => {
      firstIntent = result.current.inviteParticipants();
      secondIntent = result.current.inviteParticipants();
    });

    await waitFor(() => expect(reserveInvitations).toHaveBeenCalledTimes(1));
    firstReservation.resolve(createReservationResponse(4, "command-1"));
    await act(() => firstIntent);
    await waitFor(() => expect(reserveInvitations).toHaveBeenCalledTimes(2));
    await act(() => secondIntent);

    expect(inviteCharacterToParty.mock.calls).toEqual([
      ["participant-character"],
      ["participant-character"],
    ]);
  });

  it("keeps an accepted outside target available during an active reservation", () => {
    usePartyFinderStore.getState().mergeProjection({
      ...projection,
      revision: 4,
      participants: {
        "participant-1": {
          ...participant,
          invitation: {
            status: "COMMAND_RESERVED",
            source: "LOOTLOG_COMMAND",
            commandId: "older-command",
            batchId: "older-batch",
            reservationExpiresAt: "2999-07-13T10:00:15.000Z",
            updatedAt: "2026-07-13T10:00:00.000Z",
          },
        },
      },
    });
    const { result } = renderHook(() => useReadyRoomInvitations());

    expect(result.current.canInviteParticipants()).toBe(true);
  });

  it("skips a queued target that enters the party before its intent executes", async () => {
    const firstReservation = createDeferred<unknown>();
    reserveInvitations.mockImplementationOnce(() => firstReservation.promise);
    acknowledgeInvitation.mockResolvedValue({
      ...projection,
      revision: 5,
      participants: {
        "participant-1": { ...participant, partyPresence: "IN_PARTY" },
      },
    });
    const { result } = renderHook(() => useReadyRoomInvitations());
    const firstIntent = result.current.inviteParticipants();
    const secondIntent = result.current.inviteParticipants();
    await waitFor(() => expect(reserveInvitations).toHaveBeenCalledTimes(1));

    act(() => {
      usePartyFinderStore.getState().mergeProjection({
        ...projection,
        revision: 4,
        participants: {
          "participant-1": {
            ...participant,
            partyPresence: "IN_PARTY",
          },
        },
      });
    });
    firstReservation.resolve(createReservationResponse(4, "command-1"));

    await act(() => firstIntent);
    await act(() => secondIntent);
    expect(reserveInvitations).toHaveBeenCalledTimes(1);
    expect(inviteCharacterToParty).toHaveBeenCalledTimes(1);
  });

  it("does not touch the game when reservation fails", async () => {
    reserveInvitations.mockRejectedValue(new Error("reservation conflict"));
    const { result } = renderHook(() => useReadyRoomInvitations());

    await expect(
      act(() => result.current.inviteParticipants(["participant-1"])),
    ).rejects.toThrow("reservation conflict");
    expect(inviteCharacterToParty).not.toHaveBeenCalled();
  });

  it("retries acknowledgements without invoking the game helper again", async () => {
    reserveInvitations.mockResolvedValue(
      createReservationResponse(4, "command-1"),
    );
    acknowledgeInvitation
      .mockRejectedValueOnce(new Error("network-1"))
      .mockRejectedValueOnce(new Error("network-2"))
      .mockResolvedValueOnce({ ...projection, revision: 5 });
    const { result } = renderHook(() => useReadyRoomInvitations());

    await act(() => result.current.inviteParticipants());

    await waitFor(() => expect(acknowledgeInvitation).toHaveBeenCalledTimes(3));
    expect(inviteCharacterToParty).toHaveBeenCalledTimes(1);
    expect(acknowledgeInvitation.mock.calls[0]).toEqual(
      acknowledgeInvitation.mock.calls[1],
    );
  });
});
