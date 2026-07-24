import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/types";
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
});
