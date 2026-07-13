import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput,
  MemberSummaryResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { PartyGatheringCard } from "./party-gathering-card";

vi.mock("@/hooks/discord/use-member-color", () => ({
  useMemberColor: () => "abcdef",
}));

const applyToReadyRoom = vi.fn();

vi.mock("@/lib/api/generated/main/party-ready-room/party-ready-room", () => ({
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

vi.mock("@/components/ui/button", () => ({
  Button: (props: React.ComponentProps<"button">) => <button {...props} />,
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
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

    const characterRow = screen.getByText("Leader tile").parentElement;
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
  });
});
