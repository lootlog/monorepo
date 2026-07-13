import { act, renderHook } from "@testing-library/react";
import type { PartyReadyRoomOrganizerProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useReadyRoomInvitationStatusActions } from "@/features/party-finder/hooks/use-ready-room-invitation-status-actions";
import { usePartyFinderStore } from "@/store/party-finder.store";

const annotateInvitation = vi.fn<() => Promise<unknown>>();
const reconcileInvitation = vi.fn<() => Promise<unknown>>();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerAnnotateInvitation: () => annotateInvitation(),
  partyReadyRoomControllerReconcileInvitation: () => reconcileInvitation(),
}));

const projection = {
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 5,
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

describe("useReadyRoomInvitationStatusActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
    annotateInvitation.mockResolvedValue({ ...projection, revision: 6 });
    reconcileInvitation.mockResolvedValue({ ...projection, revision: 6 });
  });

  it("runs manual annotation only after explicit invocation", async () => {
    const { result } = renderHook(() => useReadyRoomInvitationStatusActions());

    expect(annotateInvitation).not.toHaveBeenCalled();
    await act(() => result.current.annotateInvitation("participant", "SENT"));
    expect(annotateInvitation).toHaveBeenCalledTimes(1);
  });

  it("runs unknown reconciliation only after explicit invocation", async () => {
    const { result } = renderHook(() => useReadyRoomInvitationStatusActions());

    expect(reconcileInvitation).not.toHaveBeenCalled();
    await act(() =>
      result.current.reconcileInvitation(
        "participant",
        "command-1",
        "NOT_MARKED",
      ),
    );
    expect(reconcileInvitation).toHaveBeenCalledTimes(1);
  });
});
