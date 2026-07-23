import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { ChatReadyRoomIndicator } from "./chat-ready-room-indicator";

beforeEach(() =>
  setTestRuntimeGame({
    hero: { accountId: "account-1", characterId: "101" },
  }),
);

const withdraw = vi.fn();

vi.mock("@/lib/game", () => ({
  Game: {
    getAccountId: () => "account-1",
    hero: { id: 101 },
  },
}));

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
  partyReadyRoomControllerWithdraw: (...args: unknown[]) => withdraw(...args),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { organizer?: string }) =>
      key === "partyGathering.registration.organizer"
        ? `Zapisano do grupy: ${values?.organizer}`
        : key === "states.partyPresence.OUTSIDE"
          ? "poza grupą"
          : "Wycofaj zgłoszenie",
  }),
}));

const projection: PartyReadyRoomProjection = {
  schemaVersion: 3,
  notificationId: "room-1",
  organizerDiscordId: "organizer",
  organizerCharacter: {
    accountId: "organizer-account",
    characterId: "organizer-character",
    icon: "organizer.gif",
    lvl: 200,
    nick: "Leader",
    prof: "w",
  },
  guildIds: ["guild-1"],
  world: "Fobos",
  status: "ACTIVE",
  revision: 2,
  createdAt: "2026-07-21T10:00:00.000Z",
  updatedAt: "2026-07-21T10:00:00.000Z",
  expiresAt: "2099-07-21T10:30:00.000Z",
  viewer: "PARTICIPANT",
  participants: {
    "participant-1": {
      participantId: "participant-1",
      discordId: "participant",
      character: {
        accountId: "account-1",
        characterId: "101",
        icon: "hero.gif",
        lvl: 190,
        nick: "Hero",
        prof: "m",
      },
      partyPresence: "OUTSIDE",
      createdAt: "2026-07-21T10:00:00.000Z",
      updatedAt: "2026-07-21T10:00:00.000Z",
    },
  },
};

describe("ChatReadyRoomIndicator", () => {
  beforeEach(() => {
    withdraw.mockReset().mockResolvedValue({
      schemaVersion: 3,
      type: "REMOVE",
      notificationId: "room-1",
      revision: 3,
    });
    usePartyFinderStore.getState().clearReadyRooms();
    usePartyFinderStore.getState().mergeProjection(projection);
  });

  it("shows the current registration and withdraws without opening another window", async () => {
    render(<ChatReadyRoomIndicator />);

    expect(screen.getByText("Zapisano do grupy: Leader")).toBeVisible();
    expect(screen.getByText("poza grupą")).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Wycofaj zgłoszenie" }));

    await waitFor(() => {
      expect(withdraw).toHaveBeenCalledWith(
        { notificationId: "room-1" },
        { participantId: "participant-1" },
      );
      expect(
        screen.queryByText("Zapisano do grupy: Leader"),
      ).not.toBeInTheDocument();
    });
  });
});
