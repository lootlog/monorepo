import { fireEvent, render as renderUi, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import type {
  ChatMessageResponseDtoOutput as ChatMessageType,
  MemberSummaryResponseDtoOutput as GuildMember,
} from "@lootlog/client/main";

import type { ReactElement } from "react";
import { createChatTestWrapper } from "../chat-test-wrapper";
import { createChatMessage } from "../chat-test-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  subscribeToChatScrollToMessage,
  type ChatScrollToMessageEvent,
} from "../chat-scroll-to-message";
import { ChatMessage } from "./chat-message";

const render = (ui: ReactElement) =>
  renderUi(ui, { wrapper: createChatTestWrapper().wrapper });
const makeChatMessage = (overrides?: Partial<ChatMessageType>) =>
  createChatMessage({ message: "hello", ...overrides });
beforeEach(() =>
  setTestRuntimeGame({ interface: "si", hero: { name: "CurrentHero" } }),
);

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
    setTestRuntimeGame({ world: "tempest" });
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

    expect(
      screen.getByRole("button", { name: "Dołącz do grupy" }),
    ).toBeInTheDocument();
  });

  it("renders nothing without guild name", () => {
    const { container } = render(
      <ChatMessage all={false} member={member} message={makeChatMessage()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("falls back to the character nick when member metadata is missing", () => {
    render(
      <ChatMessage all={false} guildName="Guild" message={makeChatMessage()} />,
    );

    expect(screen.getByText("Hero:")).toBeInTheDocument();
  });

  it("shows delete without edit when backend allows only moderation", () => {
    render(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage({
          canDelete: true,
        })}
      />,
    );

    fireEvent.contextMenu(screen.getByText("Member:"));
    expect(screen.queryByText("Edytuj")).not.toBeInTheDocument();
    expect(screen.getByText("Usuń")).toBeInTheDocument();
  });

  it("renders reply preview snapshot when the message references another message", () => {
    render(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage({
          replyTo: {
            messageId: "message-0",
            senderNick: "QuotedHero",
            message: "quoted message",
            type: MessageType.NORMAL,
          },
        })}
      />,
    );

    expect(screen.getByText("QuotedHero:")).toBeInTheDocument();
    expect(screen.getByText("quoted message")).toBeInTheDocument();
  });

  it("routes every reply jump through the virtual list controller", () => {
    const listener = vi.fn<(event: ChatScrollToMessageEvent) => void>();
    const unsubscribe = subscribeToChatScrollToMessage(listener);

    render(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage({
          replyTo: {
            messageId: "message-0",
            senderNick: "QuotedHero",
            message: "quoted message",
            type: MessageType.NORMAL,
          },
        })}
      />,
    );

    fireEvent.click(screen.getByText("quoted message"));

    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]?.[0].detail).toEqual({
      messageId: "message-0",
    });
    unsubscribe();
  });

  it("shows the reply action only for replyable message types", () => {
    const onReply = vi.fn<() => void>();

    const { rerender } = render(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage()}
        onReply={onReply}
      />,
    );

    fireEvent.contextMenu(screen.getByText("Member:"));
    expect(screen.getByText("Odpowiedz")).toBeInTheDocument();

    rerender(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Npc",
            icon: "npc.png",
            x: 1,
            y: 2,
            hpp: 100,
            location: "Cave",
            lvl: 50,
            prof: "m",
            type: 1,
            wt: 100,
          },
        })}
        onReply={onReply}
      />,
    );

    expect(screen.queryByText("Odpowiedz")).not.toBeInTheDocument();
  });

  it("hides edit and delete actions when backend capabilities deny them", () => {
    render(
      <ChatMessage
        all={false}
        guildName="Guild"
        member={member}
        message={makeChatMessage()}
      />,
    );

    fireEvent.contextMenu(screen.getByText("Member:"));
    expect(screen.queryByText("Edytuj")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuń")).not.toBeInTheDocument();
  });
});
