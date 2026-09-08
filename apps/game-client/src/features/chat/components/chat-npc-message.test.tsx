import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";

import { ChatNpcMessage } from "./chat-npc-message";

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
        all
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
        count={3}
      />,
    );

    expect(screen.getByText("Member:")).toBeInTheDocument();
    expect(screen.getByText("[Guild]")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Hydra" })).toBeInTheDocument();
    expect(screen.getByText("Hydra")).toBeInTheDocument();
    expect(screen.getByText("Hydra").parentElement).toHaveTextContent(
      "Hydra(250m)",
    );
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

  it("shows the sender character tooltip", async () => {
    const user = userEvent.setup();
    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    await user.hover(screen.getByText("Member:"));
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Hero (100w)");
  });

  it("omits the location row when npc location is empty", () => {
    const npc = makeChatMessage().npc;
    if (!npc) throw new Error("Expected NPC fixture data");

    render(
      <ChatNpcMessage
        all={false}
        guildName="Guild"
        message={makeChatMessage({
          npc: {
            ...npc,
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

  it("renders the inline variant and respects every metadata flag", () => {
    render(
      <ChatNpcMessage
        all
        appearance={{
          npcLayout: "inline",
          fontScalePercent: 70,
          messageGapPx: 0,
          showTimestamp: false,
          showGuildLabel: false,
          showNpcAvatar: false,
          showNpcLevel: false,
          showNpcLocationAndCoordinates: false,
        }}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    expect(screen.queryByText("[Guild]")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Hydra" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("(250m)")).not.toBeInTheDocument();
    expect(screen.queryByText("Swamp")).not.toBeInTheDocument();
    expect(screen.queryByText("(7, 9)")).not.toBeInTheDocument();
    expect(screen.queryByText("[10:00]")).not.toBeInTheDocument();
  });

  it("shows location and coordinates with one metadata flag", () => {
    render(
      <ChatNpcMessage
        all={false}
        appearance={{
          npcLayout: "inline",
          fontScalePercent: 100,
          messageGapPx: 4,
          showTimestamp: true,
          showGuildLabel: true,
          showNpcAvatar: true,
          showNpcLevel: true,
          showNpcLocationAndCoordinates: true,
        }}
        guildName="Guild"
        message={makeChatMessage()}
        member={member}
      />,
    );

    expect(screen.getByText("Swamp")).toBeInTheDocument();
    expect(screen.getByText("(7, 9)")).toBeInTheDocument();
  });
});
