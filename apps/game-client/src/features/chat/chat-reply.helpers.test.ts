import { createChatMessage } from "./chat-test-fixtures";
import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import {
  canReplyToChatMessage,
  resolveChatReplyNames,
  getChatReplySnippet,
} from "./chat-reply.helpers";

describe("chat reply helpers", () => {
  it("allows replies only for normal and notification messages", () => {
    expect(canReplyToChatMessage({ type: MessageType.NORMAL })).toBe(true);
    expect(canReplyToChatMessage({ type: MessageType.NOTIFICATION })).toBe(
      true,
    );
    expect(canReplyToChatMessage({ type: MessageType.NPC })).toBe(false);
  });

  it("formats and truncates reply snippets", () => {
    expect(
      getChatReplySnippet({
        message: "alert",
        type: MessageType.NOTIFICATION,
      }),
    ).toBe("[P] alert");

    expect(
      getChatReplySnippet({
        message: "a".repeat(100),
        type: MessageType.NORMAL,
      }),
    ).toHaveLength(72);
  });
});

it("resolves historical quote names from Discord within the source organization and preserves unavailable snapshots", () => {
  const original = createChatMessage();
  const reply = createChatMessage({
    id: "reply",
    replyTo: {
      messageId: original.id,
      senderNick: "GameHero",
      message: "Hello",
      type: "NORMAL",
    },
  });
  const other = createChatMessage({ ...reply, guildId: "other" });
  const resolved = resolveChatReplyNames(
    [reply, other],
    { "guild-1": [original, reply] },
    {
      "guild-1": { "sender-1": { name: "DiscordName" } },
      other: { "sender-1": { name: "OtherDiscordName" } },
    },
  );
  expect(resolved[0]?.replyTo?.senderNick).toBe("DiscordName");
  expect(resolved[1]?.replyTo?.senderNick).toBe("GameHero");
  expect(reply.replyTo?.senderNick).toBe("GameHero");
  expect(
    resolveChatReplyNames([reply], { "guild-1": [original] }, {})[0]?.replyTo
      ?.senderNick,
  ).toBe("GameHero");
});
