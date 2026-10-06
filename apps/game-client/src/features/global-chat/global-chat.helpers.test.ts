import { describe, expect, it } from "vitest";
import type { GlobalChatMessageResponse } from "@lootlog/client/main";
import {
  appendGlobalChatMessage,
  getGlobalChatRows,
  type GlobalChatPages,
} from "./global-chat.helpers";

const message = (
  id: string,
  overrides: Partial<GlobalChatMessageResponse> = {},
): GlobalChatMessageResponse => ({
  id,
  displayName: "Author",
  message: `Message ${id}`,
  timestamp: "2026-10-06T12:00:00.000Z",
  isOwn: false,
  ...overrides,
});

const pages = (
  ...messagesByPage: GlobalChatMessageResponse[][]
): GlobalChatPages => ({
  pages: messagesByPage.map((messages) => ({ messages, nextCursor: null })),
  pageParams: messagesByPage.map(() => ""),
});

const messageIds = (data: GlobalChatPages | undefined) =>
  getGlobalChatRows(data).flatMap((row) =>
    row.kind === "message" ? [[row.message.id, row.message.isOwn]] : [],
  );

describe("global chat history", () => {
  it("shows a sent message once and as own, whichever copy arrives first", () => {
    const sent = message("sent", { isOwn: true });
    const delivered = message("sent");
    const initial = pages([message("earlier")]);

    const responseFirst = appendGlobalChatMessage(
      appendGlobalChatMessage(initial, sent),
      delivered,
    );

    const deliveryFirst = appendGlobalChatMessage(
      appendGlobalChatMessage(initial, delivered),
      sent,
    );

    for (const data of [responseFirst, deliveryFirst])
      expect(messageIds(data)).toEqual([
        ["earlier", false],
        ["sent", true],
      ]);
  });

  it("lists older pages first and a message repeated across pages once", () => {
    const newest = [message("2"), message("3")];
    const older = [message("1"), message("2")];

    expect(messageIds(pages(newest, older))).toEqual([
      ["1", false],
      ["2", false],
      ["3", false],
    ]);
  });
});
