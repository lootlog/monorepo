import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/api-client/models/main/member-summary-response-dto-output";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { PartyGatheringCard } from "./party-gathering-card";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";

beforeEach(() => setTestRuntimeGame());

vi.mock("@/hooks/discord/use-member-color", () => ({
  useMemberColor: () => "abcdef",
}));

const applyToReadyRoom = vi.fn();

vi.mock("@lootlog/api-client/react-query/main/party-ready-room", () => ({
  usePartyReadyRoomControllerApply: () => ({
    mutate: applyToReadyRoom,
    isPending: false,
  }),
}));

vi.mock("@/components/character-tile", () => ({
  CharacterTile: ({ character }: { character: { nick: string } }) => (
    <div>{character.nick} tile</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="character-tooltip-content">{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getAccountId: () => "999",
    hero: {
      account: 999,
      id: 999,
      lvl: 200,
      nick: "CurrentHero",
    },
  },
}));

vi.mock("@/lib/api/generated-helpers", () => ({
  buildCurrentCharacterPayload: () => ({}),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { max?: number; min?: number }) => {
      if (key === "contextMenu.unknownUser") {
        return "Unknown user";
      }

      if (key === "partyGathering.levelRange") {
        return `Range ${values?.min}-${values?.max}`;
      }

      if (key === "partyGathering.volunteering") {
        return "Volunteering";
      }

      if (key === "partyGathering.requiredLevel") {
        return `Required ${values?.min}-${values?.max}`;
      }
      if (key === "partyGathering.joined") {
        return "Joined party";
      }

      return "Join party";
    },
  }),
}));

const member: MemberSummaryResponseDtoOutput = {
  id: 1,
  userId: "user-1",
  name: "Member",
};

const makeMessage = (
  overrides?: Partial<ChatMessageResponseDtoOutput>,
): ChatMessageResponseDtoOutput => ({
  id: "message-1",
  guildId: "guild-1",
  message: "Party up",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.PARTY_GATHERING,
  characterData: {
    nick: "Leader",
    id: 1,
    acc: 1,
    lvl: 200,
    prof: "w",
    icon: "leader.png",
  },
  npc: {
    id: 10,
    name: "Hydra",
    icon: "npc.png",
    x: 7,
    y: 9,
    hpp: 100,
    location: "Swamp",
    lvl: 250,
    prof: "m",
    type: 1,
    wt: 100,
  },
  partyGathering: {
    notificationId: "notification-1",
    discordId: "discord-1",
    world: "tempest",
    description:
      "Very long party gathering description that should stay inside the card without causing horizontal overflow",
    minLvl: 180,
    maxLvl: 230,
  },
  canEdit: false,
  canDelete: false,
  ...overrides,
});

describe("PartyGatheringCard", () => {
  beforeEach(() => {
    applyToReadyRoom.mockReset();
    usePartyFinderStore.getState().clearReadyRooms();
    useWindowsStore.getState().setOpen("party-finder", false);
  });

  it("keeps width-constrained classes on the card rows and button", () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    const characterRow = screen
      .getAllByText("Leader tile")
      .at(-1)?.parentElement;
    const npcRow = screen.getByText("Hydra (250m)").parentElement;
    const card = characterRow?.parentElement;
    const joinButton = screen.getByRole("button", { name: "Join party" });

    expect(card?.className).toContain("ll:overflow-hidden");
    expect(characterRow?.className).toContain("ll:max-w-full");
    expect(characterRow?.className).toContain("ll:overflow-hidden");
    expect(npcRow?.className).toContain("ll:max-w-full");
    expect(npcRow?.className).toContain("ll:overflow-hidden");
    expect(joinButton.className).toContain("ll:box-border");
    expect(joinButton.className).toContain("ll:max-w-full");
  });

  it("shows the organizer character tooltip", () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    expect(screen.getByTestId("character-tooltip-content")).toHaveTextContent(
      "Leader (200w)",
    );
  });

  it("keeps the organizer tooltip after the gathering ends", () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage({ partyGathering: undefined })}
      />,
    );

    expect(screen.getByTestId("character-tooltip-content")).toHaveTextContent(
      "Leader (200w)",
    );
  });

  it("applies to the Ready Room from the explicit join click", () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    expect(applyToReadyRoom).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Join party" }));
    expect(applyToReadyRoom).toHaveBeenCalledWith(
      {
        pathParams: { notificationId: "notification-1" },
        data: { character: {}, world: "tempest" },
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );

    const mutationOptions = applyToReadyRoom.mock.calls[0]?.[1] as {
      onSuccess: (projection: unknown) => void;
    };
    mutationOptions.onSuccess({ schemaVersion: 2 });
    expect(useWindowsStore.getState()["party-finder"].open).toBe(false);
  });

  it("shows that the current character is already registered", () => {
    setTestRuntimeGame({
      hero: { accountId: "999", characterId: "999" },
    });
    usePartyFinderStore.getState().mergeProjection({
      schemaVersion: 3,
      notificationId: "notification-1",
      revision: 2,
      status: "ACTIVE",
      viewer: "PARTICIPANT",
      participants: {
        participant: {
          participantId: "participant",
          discordId: "discord-1",
          character: { accountId: "999", characterId: "999" },
        },
      },
    } as never);

    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage()}
      />,
    );

    expect(screen.getByRole("button", { name: "Joined party" })).toBeDisabled();
  });

  it("allows another character with the same nickname to apply", () => {
    render(
      <PartyGatheringCard
        all={false}
        guildName="Guild"
        isMsgYesterday={false}
        member={member}
        message={makeMessage({
          characterData: {
            nick: "CurrentHero",
            id: 1,
            acc: 1,
            lvl: 200,
            prof: "w",
            icon: "leader.png",
          },
        })}
      />,
    );

    expect(screen.getByRole("button", { name: "Join party" })).toBeVisible();
  });
});
