import { describe, expect, it } from "vitest";
import type { GlobalChatMessageResponse } from "@lootlog/client/main";
import { CHAT_VISIBLE_MESSAGE_LIMIT } from "@/features/chat/chat.helpers";
import { GLOBAL_CHAT_SHARED_CHANNEL } from "@/store/global-chat.store";
import {
  appendGlobalChatMessage,
  getGlobalChatRows,
  removeGlobalChatMessage,
  resolveGlobalChatChannel,
  setGlobalChatPinned,
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
  isAdmin: false,
  isOwn: false,
  ...overrides,
});

const pages = (
  ...messagesByPage: GlobalChatMessageResponse[][]
): GlobalChatPages => ({
  pages: messagesByPage.map((messages) => ({
    messages,
    nextCursor: null,
    pinned: null,
    viewer: { isAdmin: false, muted: false, mutedUntil: null },
  })),
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

  it("drops a deleted message from every page and keeps a pinned own message own", () => {
    const own = message("own", { isOwn: true });
    const data = pages([message("3"), own], [message("1"), message("3")]);

    // The gateway never knows whose message it pins.
    const { isOwn: _isOwn, ...delivered } = own;
    const pinned = setGlobalChatPinned(data, delivered);
    const unpinned = setGlobalChatPinned(pinned, null);

    expect(messageIds(removeGlobalChatMessage(data, "3"))).toEqual([
      ["1", false],
      ["own", true],
    ]);
    expect(pinned?.pages[0]?.pinned).toEqual(own);
    expect(unpinned?.pages[0]?.pinned).toBeNull();
  });

  const range = (from: number, count: number) =>
    Array.from({ length: count }, (_, index) => message(String(from + index)));

  it("drops the oldest pages past the limit and keeps the cursor before the oldest kept page", () => {
    const pageSize = CHAT_VISIBLE_MESSAGE_LIMIT / 2;

    const data = pages(
      range(2 * pageSize, pageSize - 1),
      range(pageSize, pageSize),
      range(0, 2),
    );

    data.pages[1] = { ...data.pages[1]!, nextCursor: "older" };
    data.pages[2] = { ...data.pages[2]!, nextCursor: "oldest" };

    const capped = appendGlobalChatMessage(data, message("live"));

    expect(capped?.pages).toHaveLength(2);
    expect(capped?.pageParams).toHaveLength(2);
    expect(capped?.pages.at(-1)?.nextCursor).toBe("older");
    expect(messageIds(capped).at(-1)).toEqual(["live", false]);
  });

  it("keeps the newest messages of a page that alone outgrows the limit, with no gap before them", () => {
    const data = pages(range(0, CHAT_VISIBLE_MESSAGE_LIMIT));

    data.pages[0] = { ...data.pages[0]!, nextCursor: "older" };

    const capped = appendGlobalChatMessage(data, message("live"));
    const ids = messageIds(capped);

    expect(ids).toHaveLength(CHAT_VISIBLE_MESSAGE_LIMIT);
    expect(ids[0]).toEqual(["1", false]);
    expect(ids.at(-1)).toEqual(["live", false]);
    expect(capped?.pages[0]?.nextCursor).toBeNull();
  });
});

describe("global chat channel", () => {
  const worlds = ["gordion", "tarhuna"];

  it("keeps the picked channel while it exists", () => {
    expect(resolveGlobalChatChannel("tarhuna", worlds)).toBe("tarhuna");
    expect(resolveGlobalChatChannel(GLOBAL_CHAT_SHARED_CHANNEL, worlds)).toBe(
      GLOBAL_CHAT_SHARED_CHANNEL,
    );
  });

  it("falls back to the shared channel", () => {
    expect(resolveGlobalChatChannel(null, worlds)).toBe(
      GLOBAL_CHAT_SHARED_CHANNEL,
    );
    expect(resolveGlobalChatChannel("removed", worlds)).toBe(
      GLOBAL_CHAT_SHARED_CHANNEL,
    );
  });

  it("trusts the picked world until the world list loads", () => {
    expect(resolveGlobalChatChannel("removed", undefined)).toBe("removed");
  });
});
