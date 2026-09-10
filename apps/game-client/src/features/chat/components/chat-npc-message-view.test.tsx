import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { ChatNpcMessageView } from "./chat-npc-message-view";

const message: ChatMessageType = {
  id: "npc-message-1",
  guildId: "guild-1",
  message: "",
  senderId: "user-1",
  timestamp: "2026-07-24T10:00:00.000Z",
  type: MessageType.NPC,
  characterData: {
    nick: "Arianna",
    id: 1,
    acc: 1,
    lvl: 85,
    prof: "m",
    icon: "hero.png",
  },
  npc: {
    id: 10,
    name: "Dark Hunter",
    icon: "npc.png",
    x: 42,
    y: 18,
    hpp: 100,
    location: "Old Ruins",
    lvl: 120,
    prof: "m",
    type: 1,
    wt: 80,
  },

  canDelete: false,
};

describe("ChatNpcMessageView", () => {
  it("renders the inline variant without disabled metadata", () => {
    render(
      <ChatNpcMessageView
        all
        appearance={{
          ...CHAT_APPEARANCE_READABLE_PRESET,
          npcLayout: "inline",
          showGuildLabel: false,
          showNpcAvatar: false,
          showNpcLevel: false,
          showNpcLocationAndCoordinates: false,
          showTimestamp: false,
        }}
        guildName="Northern Guard"
        memberColor="abcdef"
        message={message}
        senderName="Arianna"
      />,
    );

    expect(screen.queryByText("[Northern Guard]")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("img", { name: "Dark Hunter" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("(120m)")).not.toBeInTheDocument();
    expect(screen.queryByText("Old Ruins")).not.toBeInTheDocument();
    expect(screen.queryByText(/\[\d{2}:\d{2}\]/)).not.toBeInTheDocument();
    expect(screen.getByText("Dark Hunter")).toBeInTheDocument();
  });
});
