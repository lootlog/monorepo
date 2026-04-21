import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@/lib/api/generated/main/model";
import { ChatMessage } from "./chat-message";

vi.mock("@/hooks/discord/use-member-color", () => ({
  useMemberColor: () => "abcdef",
}));

vi.mock("@/components/character-tile", () => ({
  CharacterTile: ({ character }: { character: { nick: string } }) => (
    <div>{character.nick}</div>
  ),
}));

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ContextMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ContextMenuItem: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
  ContextMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("./party-gathering-card", () => ({
  PartyGatheringCard: ({ guildName }: { guildName: string }) => (
    <div>party:{guildName}</div>
  ),
}));

vi.mock("@/features/npc-detector/components/npc-list-item", () => ({
  NPCS_WITH_LOCATION: ["hero"],
}));

vi.mock("@/api/npcs.api", () => ({
  NpcType: {
    HERO: "hero",
  },
}));

vi.mock("@lootlog/types", () => ({
  getNpcTypeByWt: () => "hero",
}));

vi.mock("@/constants/margonem", () => ({
  NPC_NAMES: {
    hero: {
      shortname: "H",
    },
  },
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: {
      nick: "CurrentHero",
    },
    interface: "si",
  },
}));

const makeChatMessage = (
  overrides?: Partial<ChatMessageType>,
): ChatMessageType => ({
  id: "message-1",
  guildId: "guild-1",
  message: "hello",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.NORMAL,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
  },
  ...overrides,
});

const member: GuildMember = {
  id: 1,
  userId: "user-1",
  name: "Member",
};

describe("ChatMessage", () => {
  it("renders a notification message with guild name in all-chat mode", () => {
    render(
      <ChatMessage
        all
        guildName="Guild"
        member={member}
        message={makeChatMessage({
          type: MessageType.NOTIFICATION,
          message: "Ping",
        })}
      />,
    );

    expect(screen.getByText("[Guild]")).toBeInTheDocument();
    expect(screen.getByText("[P] Ping")).toBeInTheDocument();
    expect(screen.getByText("Member:")).toBeInTheDocument();
  });

  it("renders the party card for party gathering messages", () => {
    render(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage({
          type: MessageType.PARTY_GATHERING,
          partyGathering: {
            notificationId: "notification-1",
            discordId: "discord-1",
            world: "tempest",
          },
        })}
      />,
    );

    expect(screen.getByText("party:Guild")).toBeInTheDocument();
  });

  it("renders nothing without guild name", () => {
    const { container } = render(
      <ChatMessage all={false} member={member} message={makeChatMessage()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
