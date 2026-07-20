import { act, renderHook, waitFor } from "@testing-library/react";
import type {
  PartyReadyRoomOrganizerProjection,
  PartyReadyRoomParticipant,
} from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import {
  READY_ROOM_INVITATION_PARTICIPANT_CAP,
  READY_ROOM_INVITATION_TIMEOUT_MS,
  resetReadyRoomInvitationCoordinatorForTests,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";

const resolveInvitationTargets =
  vi.fn<(...args: unknown[]) => Promise<unknown>>();
const inviteCharacterToParty = vi.fn();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerResolveInvitationTargets: (...args: unknown[]) =>
    resolveInvitationTargets(...args),
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

function createParticipant(
  participantId: string,
  characterId: string,
): PartyReadyRoomParticipant {
  return {
    participantId,
    discordId: `discord-${participantId}`,
    character: {
      accountId: `account-${participantId}`,
      characterId,
      icon: "participant.gif",
      lvl: 190,
      nick: participantId,
      prof: "m",
    },
    partyPresence: "OUTSIDE",
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
  };
}

const participant = createParticipant("participant-1", "participant-character");

const projection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 3,
  createdAt: "2026-07-13T10:00:00.000Z",
  updatedAt: "2026-07-13T10:00:00.000Z",
  expiresAt: "2999-07-13T10:30:00.000Z",
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
  });

  it("runs the game helper only after an explicit target resolution", async () => {
    resolveInvitationTargets.mockResolvedValue({
      targets: [
        {
          participantId: "participant-1",
          characterId: "participant-character",
        },
      ],
    });
    const { result } = renderHook(() => useReadyRoomInvitations());

    await act(() => result.current.inviteParticipants(["participant-1"]));

    expect(resolveInvitationTargets).toHaveBeenCalledWith(
      { notificationId: "room-1" },
      { participantIds: ["participant-1"] },
      { signal: expect.any(AbortSignal) },
    );
    expect(inviteCharacterToParty).toHaveBeenCalledOnce();
    expect(inviteCharacterToParty).toHaveBeenCalledWith(
      "participant-character",
    );
  });

  it("serializes rapid explicit clicks while preserving every intent", async () => {
    const firstResolution = createDeferred<unknown>();
    const response = {
      targets: [
        {
          participantId: "participant-1",
          characterId: "participant-character",
        },
      ],
    };
    resolveInvitationTargets
      .mockImplementationOnce(() => firstResolution.promise)
      .mockResolvedValueOnce(response);
    const { result } = renderHook(() => useReadyRoomInvitations());

    let firstIntent!: Promise<unknown>;
    let secondIntent!: Promise<unknown>;
    act(() => {
      firstIntent = result.current.inviteParticipants();
      secondIntent = result.current.inviteParticipants();
    });

    await waitFor(() =>
      expect(resolveInvitationTargets).toHaveBeenCalledOnce(),
    );
    firstResolution.resolve(response);
    await act(() => firstIntent);
    await waitFor(() =>
      expect(resolveInvitationTargets).toHaveBeenCalledTimes(2),
    );
    await act(() => secondIntent);

    expect(inviteCharacterToParty.mock.calls).toEqual([
      ["participant-character"],
      ["participant-character"],
    ]);
  });

  it("coalesces an arbitrary number of queued clicks into one pending promise", async () => {
    const firstResolution = createDeferred<unknown>();
    const response = {
      targets: [
        {
          participantId: "participant-1",
          characterId: "participant-character",
        },
      ],
    };
    resolveInvitationTargets
      .mockImplementationOnce(() => firstResolution.promise)
      .mockResolvedValueOnce(response);
    const { result } = renderHook(() => useReadyRoomInvitations());

    const firstIntent = result.current.inviteParticipants();
    const queuedIntents = Array.from({ length: 1_000 }, () =>
      result.current.inviteParticipants(),
    );

    expect(new Set(queuedIntents).size).toBe(1);
    await waitFor(() =>
      expect(resolveInvitationTargets).toHaveBeenCalledOnce(),
    );
    firstResolution.resolve(response);
    await act(() => firstIntent);
    await waitFor(() =>
      expect(resolveInvitationTargets).toHaveBeenCalledTimes(2),
    );
    await act(() => queuedIntents[0]);
  });

  it("keeps an outside participant available for repeated clicks", () => {
    const { result } = renderHook(() => useReadyRoomInvitations());

    expect(result.current.canInviteParticipants()).toBe(true);
    expect(result.current.canInviteParticipants(["participant-1"])).toBe(true);
  });

  it("skips a queued participant who enters the party before execution", async () => {
    const firstResolution = createDeferred<unknown>();
    resolveInvitationTargets.mockImplementationOnce(
      () => firstResolution.promise,
    );
    const { result } = renderHook(() => useReadyRoomInvitations());
    const firstIntent = result.current.inviteParticipants();
    const secondIntent = result.current.inviteParticipants();
    await waitFor(() =>
      expect(resolveInvitationTargets).toHaveBeenCalledOnce(),
    );

    act(() => {
      usePartyFinderStore.getState().mergeProjection({
        ...projection,
        revision: 4,
        participants: {
          "participant-1": { ...participant, partyPresence: "IN_PARTY" },
        },
      });
    });
    firstResolution.resolve({
      targets: [
        {
          participantId: "participant-1",
          characterId: "participant-character",
        },
      ],
    });

    await act(() => firstIntent);
    await act(() => secondIntent);
    expect(resolveInvitationTargets).toHaveBeenCalledOnce();
    expect(inviteCharacterToParty).not.toHaveBeenCalled();
  });

  it("does not touch the game when target resolution fails", async () => {
    resolveInvitationTargets.mockRejectedValue(new Error("resolver conflict"));
    const { result } = renderHook(() => useReadyRoomInvitations());

    await expect(
      act(() => result.current.inviteParticipants(["participant-1"])),
    ).rejects.toThrow("resolver conflict");
    expect(inviteCharacterToParty).not.toHaveBeenCalled();
  });

  it("aborts target resolution after five seconds", async () => {
    vi.useFakeTimers();

    try {
      resolveInvitationTargets.mockReturnValue(new Promise(() => undefined));
      const { result } = renderHook(() => useReadyRoomInvitations());
      const invitation = result.current.inviteParticipants();
      const rejection = expect(invitation).rejects.toThrow(
        "Ready Room invitation request timed out",
      );

      await vi.advanceTimersByTimeAsync(READY_ROOM_INVITATION_TIMEOUT_MS);
      await rejection;

      const requestOptions = resolveInvitationTargets.mock.calls[0]?.[2] as
        | { signal?: AbortSignal }
        | undefined;
      expect(requestOptions?.signal?.aborted).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("limits one target-resolution request to 100 participants", async () => {
    const participants = Object.fromEntries(
      Array.from(
        { length: READY_ROOM_INVITATION_PARTICIPANT_CAP + 25 },
        (_, index) => {
          const nextParticipant = createParticipant(
            `participant-${index}`,
            `character-${index}`,
          );
          return [nextParticipant.participantId, nextParticipant];
        },
      ),
    );
    usePartyFinderStore.getState().mergeProjection({
      ...projection,
      revision: 4,
      participants,
    });
    resolveInvitationTargets.mockResolvedValue({ targets: [] });
    const { result } = renderHook(() => useReadyRoomInvitations());

    await act(() => result.current.inviteParticipants());

    const request = resolveInvitationTargets.mock.calls[0]?.[1] as
      | { participantIds?: string[] }
      | undefined;
    expect(request?.participantIds).toHaveLength(
      READY_ROOM_INVITATION_PARTICIPANT_CAP,
    );
  });

  it("continues with later targets when one game helper call fails", async () => {
    const secondParticipant = createParticipant(
      "participant-2",
      "second-character",
    );
    usePartyFinderStore.getState().mergeProjection({
      ...projection,
      revision: 4,
      participants: {
        "participant-1": participant,
        "participant-2": secondParticipant,
      },
    });
    resolveInvitationTargets.mockResolvedValue({
      targets: [
        {
          participantId: "participant-1",
          characterId: "participant-character",
        },
        {
          participantId: "participant-2",
          characterId: "second-character",
        },
      ],
    });
    inviteCharacterToParty.mockImplementationOnce(() => {
      throw new Error("game rejected invite");
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { result } = renderHook(() => useReadyRoomInvitations());

    await act(() => result.current.inviteParticipants());

    expect(inviteCharacterToParty.mock.calls).toEqual([
      ["participant-character"],
      ["second-character"],
    ]);
  });
});
