import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@/lib/api/generated/main/model";
import { ChatNpcMessage } from "./chat-npc-message";

vi.mock("@/components/npc-tile", () => ({
  NpcTile: ({ npc }: { npc: { nick: string } }) => <div>{npc.nick} tile</div>,
}));

vi.mock("@/hooks/discord/use-member-color", () => ({
  useMemberColor: () => "abcdef",
}));

vi.mock("@/api/npcs.api", () => ({
  NpcType: {
    HERO: "hero",
  },
}));

vi.mock("@lootlog/types", () => ({
  getNpcTypeByWt: () => "hero",
}));

const makeChatMessage = (
  overrides?: Partial<ChatMessageType>,
): ChatMessageType => ({
  id: "message-1",
  guildId: "guild-1",
  message: "",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.NPC,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
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
  canEdit: false,
  canDelete: false,
  ...overrides,
});

const member: GuildMember = {
  id: 1,
  userId: "user-1",
  name: "Member",
};

describe("ChatNpcMessage", () => {
  it("renders a compact npc card with sender, guild label and group badge", () => {
    render(
      <ChatNpcMessage
        additionalSenderCount={2}
        all
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
        count={3}
      />,
    );

    expect(screen.getByText("Member:")).toBeInTheDocument();
    expect(screen.getByText("[Guild]")).toBeInTheDocument();
    expect(screen.getByText("Hydra tile")).toBeInTheDocument();
    expect(screen.getByText("Hydra")).toBeInTheDocument();
    expect(screen.getByText("Hydra").parentElement).toHaveTextContent(
      "Hydra(250m)",
    );
    expect(screen.getByText("+2")).toBeInTheDocument();
    expect(screen.getByText("(250m)")).toBeInTheDocument();
    expect(screen.getByText("Swamp")).toBeInTheDocument();
    expect(screen.getByText("(7, 9)")).toHaveClass("ll:whitespace-nowrap");
    expect(screen.getByText("x3")).toBeInTheDocument();
  });

  it("hides the counter when there is only one grouped message", () => {
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    expect(screen.queryByText("x1")).not.toBeInTheDocument();
  });

  it("does not show the additional sender badge when only one sender contributed", () => {
    render(
      <ChatNpcMessage
        additionalSenderCount={0}
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
        count={3}
      />,
    );

    expect(screen.queryByText("+1")).not.toBeInTheDocument();
  });

  it("falls back to the character nick when member metadata is missing", () => {
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
      />,
    );

    expect(screen.getByText("Hero:")).toBeInTheDocument();
  });

  it("omits the location row when npc location is empty", () => {
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage({
          npc: {
            ...makeChatMessage().npc!,
            location: "   ",
            x: undefined,
            y: undefined,
          },
        })}
        member={member}
      />,
    );

    expect(screen.queryByText(/Swamp/)).not.toBeInTheDocument();
  });
});
