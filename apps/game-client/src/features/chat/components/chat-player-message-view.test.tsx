import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { ChatPlayerMessageView } from "./chat-player-message-view";

describe("ChatPlayerMessageView", () => {
  it("renders production message metadata, sender and body through its public interface", () => {
    render(
      <ChatPlayerMessageView
        all
        appearance={CHAT_APPEARANCE_READABLE_PRESET}
        body={<span>Hello from the fixture</span>}
        guildName="Northern Guard"
        isMsgYesterday={false}
        messageId="message-1"
        sender={<strong>Arianna:</strong>}
        timestamp="2026-07-24T10:00:00.000Z"
      />,
    );

    expect(
      document.querySelector('[data-chat-message-id="message-1"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("[Northern Guard]")).toBeInTheDocument();
    expect(screen.getByText("Arianna:")).toBeInTheDocument();
    expect(screen.getByText("Hello from the fixture")).toBeInTheDocument();
    expect(screen.getByText(/\[\d{2}:\d{2}\]/)).toBeInTheDocument();
  });

  it("respects hidden timestamp and guild metadata", () => {
    render(
      <ChatPlayerMessageView
        all
        appearance={{
          ...CHAT_APPEARANCE_READABLE_PRESET,
          showGuildLabel: false,
          showTimestamp: false,
        }}
        body={<span>Compact body</span>}
        guildName="Northern Guard"
        isMsgYesterday={false}
        messageId="message-2"
        sender={<strong>Arianna:</strong>}
        timestamp="2026-07-24T10:00:00.000Z"
      />,
    );

    expect(screen.queryByText("[Northern Guard]")).not.toBeInTheDocument();
    expect(screen.queryByText(/\[\d{2}:\d{2}\]/)).not.toBeInTheDocument();
    expect(screen.getByText("Compact body")).toBeInTheDocument();
  });

  it("opens a composed context menu from the whole player message", () => {
    render(
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <ChatPlayerMessageView
            all={false}
            body={<span>Message body</span>}
            guildName="Northern Guard"
            isMsgYesterday={false}
            messageId="message-3"
            sender={<strong>Arianna:</strong>}
            timestamp="2026-07-24T10:00:00.000Z"
          />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Reply to message</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText("Message body"), {
      clientX: 10,
      clientY: 10,
    });

    expect(screen.getByText("Reply to message")).toBeInTheDocument();
  });
});
