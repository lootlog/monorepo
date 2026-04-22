import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import {
  getChatMessageTypeForSubmitAction,
  getChatReplyPayload,
  getChatSubmitAction,
} from "./chat-submit.helpers";

describe("chat submit helpers", () => {
  it("builds a reply payload when a reply draft exists", () => {
    expect(
      getChatReplyPayload({
        guildId: "guild-1",
        messageId: "message-1",
        senderNick: "Hero",
        message: "hej",
        type: MessageType.NORMAL,
      }),
    ).toEqual({
      messageId: "message-1",
      senderNick: "Hero",
      message: "hej",
      type: MessageType.NORMAL,
    });

    expect(getChatReplyPayload(null)).toBeUndefined();
  });

  it("detects a clear chat action only when the user can clear chat", () => {
    expect(
      getChatSubmitAction({
        canClearChat: true,
        messageValue: " /clr ",
      }),
    ).toEqual({
      kind: "clear",
    });

    expect(
      getChatSubmitAction({
        canClearChat: false,
        messageValue: "/clr",
      }),
    ).toEqual({
      kind: "message",
      message: "/clr",
    });
  });

  it("detects party, notification and normal message actions", () => {
    expect(
      getChatSubmitAction({
        canClearChat: false,
        messageValue: "/grp  hydra",
      }),
    ).toEqual({
      kind: "party",
      description: "hydra",
    });

    expect(
      getChatSubmitAction({
        canClearChat: false,
        messageValue: "!",
      }),
    ).toEqual({
      kind: "notification",
      message: "!",
    });

    expect(
      getChatSubmitAction({
        canClearChat: false,
        messageValue: "hello",
      }),
    ).toEqual({
      kind: "message",
      message: "hello",
    });
  });

  it("maps submit actions to the expected chat message type", () => {
    expect(
      getChatMessageTypeForSubmitAction({
        kind: "notification",
        message: "hello",
      }),
    ).toBe(MessageType.NOTIFICATION);

    expect(
      getChatMessageTypeForSubmitAction({
        kind: "message",
        message: "hello",
      }),
    ).toBe(MessageType.NORMAL);
  });
});
