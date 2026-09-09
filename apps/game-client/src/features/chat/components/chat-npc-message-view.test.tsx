import { DEFAULT_NPC_TYPE_COLORS } from "@lootlog/schema/npc-appearance";
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
  it("renders the production tile metadata through its public interface", () => {
    render(
      <ChatNpcMessageView
        all
        appearance={CHAT_APPEARANCE_READABLE_PRESET}
        count={3}
        guildName="Northern Guard"
        memberColor="abcdef"
        message={message}
        senderName="Arianna"
      />,
    );

    expect(screen.getByText("[Northern Guard]")).toBeInTheDocument();
    expect(screen.getByText("Arianna:")).toHaveStyle({ color: "#abcdef" });
    expect(
      screen.getByRole("img", { name: "Dark Hunter" }),
    ).toBeInTheDocument();
    const npcName = screen.getByText("Dark Hunter");
    const countBadge = screen.getByText("x3");

    expect(npcName).toBeInTheDocument();
    expect(npcName.parentElement?.parentElement).toContainElement(countBadge);
    expect(countBadge.parentElement).not.toHaveClass("ll:overflow-hidden");
    expect(countBadge.parentElement?.parentElement).not.toHaveClass(
      "ll:overflow-hidden",
    );
    expect(screen.getByText("(120m)")).toBeInTheDocument();
    expect(screen.getByText("Old Ruins")).toBeInTheDocument();
    expect(screen.getByText("(42, 18)")).toBeInTheDocument();
  });

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

it("uses configured NPC background colors in both layouts", () => {
  const props = {
    all: false,
    guildName: "Guild",
    memberColor: "ffffff",
    message,
    senderName: "Hero",
    npcTypeColors: { ...DEFAULT_NPC_TYPE_COLORS, HERO: "#123456" },
  };
  const { container, rerender } = render(<ChatNpcMessageView {...props} />);
  expect(container.querySelector('[data-slot="bubble"]')).toHaveStyle({
    backgroundColor:
      "color-mix(in srgb, rgba(18, 52, 86, 0.4) 37.5%, transparent)",
  });
  rerender(
    <ChatNpcMessageView
      {...props}
      appearance={{ ...CHAT_APPEARANCE_READABLE_PRESET, npcLayout: "inline" }}
      npcTypeColors={{ ...DEFAULT_NPC_TYPE_COLORS, HERO: "#abcdef" }}
    />,
  );
  expect(container.querySelector('[data-slot="bubble"]')).toHaveStyle({
    backgroundColor:
      "color-mix(in srgb, rgba(171, 205, 239, 0.4) 37.5%, transparent)",
  });
});
