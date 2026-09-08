import { configureApiClients } from "@lootlog/client/transport";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { PartyReadyRoomInvitationTarget } from "@lootlog/schema/party-ready-room";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import {
  READY_ROOM_INVITATION_PARTICIPANT_CAP,
  READY_ROOM_INVITATION_TIMEOUT_MS,
  resetReadyRoomInvitationCoordinatorForTests,
} from "@/features/party-finder/ready-room-invitation-coordinator";
import { useGlobalStore } from "@/store/global.store";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

type InvitationResponse = { targets: PartyReadyRoomInvitationTarget[] };
const resolveInvitationTargets =
  vi.fn<(request: Request) => Promise<InvitationResponse>>();
const inviteCharacterToParty = vi.fn<(command: string) => void>();
let restoreClient = () => {};
afterEach(() => {
  restoreClient();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

import {
  createReadyRoomParticipant as createParticipant,
  readyRoomOrganizerFixture as projection,
} from "@/test/ready-room-fixtures";

const participant = createParticipant("participant-1", "participant-character");

describe("useReadyRoomInvitations", () => {
  beforeEach(() => {
    setTestRuntimeGame({
      hero: {
        accountId: "organizer-account",
        characterId: "organizer-character",
      },
    });
    vi.resetAllMocks();
    restoreClient = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });
    vi.stubGlobal(
      "fetch",
      async (input: string | URL | Request, init?: RequestInit) =>
        Response.json(await resolveInvitationTargets(new Request(input, init))),
    );
    vi.stubGlobal("_g", inviteCharacterToParty);
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

    const request = resolveInvitationTargets.mock.calls[0]?.[0];
    expect(request?.url).toContain("room-1");
    expect(await request?.json()).toEqual({
      participantIds: ["participant-1"],
    });
    expect(inviteCharacterToParty).toHaveBeenCalledOnce();
    expect(inviteCharacterToParty).toHaveBeenCalledWith(
      "party&a=inv&id=participant-character",
    );
  });

  it("serializes rapid explicit clicks while preserving every intent", async () => {
    const firstResolution = Promise.withResolvers<InvitationResponse>();
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
    const secondIntent = result.current.inviteParticipants();

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
      ["party&a=inv&id=participant-character"],
      ["party&a=inv&id=participant-character"],
    ]);
  });

  it("coalesces an arbitrary number of queued clicks into one pending promise", async () => {
    const firstResolution = Promise.withResolvers<InvitationResponse>();
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
    const firstResolution = Promise.withResolvers<InvitationResponse>();
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
      await Promise.all([
        expect(invitation).rejects.toThrow(
          "Ready Room invitation request timed out",
        ),
        vi.advanceTimersByTimeAsync(READY_ROOM_INVITATION_TIMEOUT_MS),
      ]);
      expect(resolveInvitationTargets.mock.calls[0]?.[0].signal.aborted).toBe(
        true,
      );
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

    const request = resolveInvitationTargets.mock.calls[0]?.[0];
    expect(await request?.json()).toEqual({
      participantIds: Object.keys(participants).slice(
        0,
        READY_ROOM_INVITATION_PARTICIPANT_CAP,
      ),
    });
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
      ["party&a=inv&id=participant-character"],
      ["party&a=inv&id=second-character"],
    ]);
  });
});
