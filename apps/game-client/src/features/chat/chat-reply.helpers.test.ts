import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import {
  canReplyToChatMessage,
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
