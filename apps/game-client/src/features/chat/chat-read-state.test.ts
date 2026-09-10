import {
  groupDuplicateChatMessages,
  getMessagesForSelectedGuild,
  getVisibleChatMessageAliases,
} from "./chat.helpers";
import { describe, expect, it } from "vitest";
import { createChatMessage } from "./chat-test-fixtures";
import {
  getChatUnreadSummary,
  markChatMessagesRead,
  receiveChatMessage,
  retainChatReadEntries,
} from "./chat-read-state";

describe("chat read state", () => {
  it("only marks actually displayed messages read and ignores a redelivered read message", () => {
    const first = createChatMessage({ id: "first" });
    const second = createChatMessage({ id: "second", type: "NOTIFICATION" });
    const received = receiveChatMessage(
      receiveChatMessage({}, first, false),
      second,
      true,
    );
    const read = markChatMessagesRead(received, [first.id]);
    expect(getChatUnreadSummary(read, first.guildId).ids).toEqual(
      new Set([second.id]),
    );
    expect(getChatUnreadSummary(read, first.guildId).attention).toBe(1);
    expect(receiveChatMessage(read, first, false)).toBe(read);
  });

  it("removes unread metadata when history is deleted or evicted", () => {
    const message = createChatMessage();
    const state = receiveChatMessage({}, message, true);
    expect(
      getChatUnreadSummary(
        retainChatReadEntries(state, message.guildId, new Set()),
        "all",
      ).ids.size,
    ).toBe(0);
  });

  it("bounds received metadata per organization to the retained history", () => {
    let state = receiveChatMessage(
      {},
      createChatMessage({ guildId: "other" }),
      true,
    );
    for (let index = 0; index < 301; index++) {
      state = receiveChatMessage(
        state,
        createChatMessage({ id: String(index) }),
        false,
      );
    }
    expect(state["guild-1"]).toHaveLength(300);
    expect(state["other"]).toHaveLength(1);
    expect(getChatUnreadSummary(state, "guild-1").ids.has("0")).toBe(false);
  });
  it("marks all accessible copies read when their representative is viewed in All", () => {
    const first = createChatMessage({ id: "a", guildId: "a" });
    const copy = createChatMessage({
      id: "b",
      guildId: "b",
      timestamp: new Date(Date.parse(first.timestamp) + 100).toISOString(),
    });
    const hiddenCopy = createChatMessage({ id: "hidden", guildId: "hidden" });
    const received = receiveChatMessage(
      receiveChatMessage(receiveChatMessage({}, first, false), copy, false),
      hiddenCopy,
      false,
    );
    const groups = groupDuplicateChatMessages(
      getMessagesForSelectedGuild({ a: [first], b: [copy] }, "all"),
    );
    const read = markChatMessagesRead(
      received,
      getVisibleChatMessageAliases(groups, [first.id]),
    );
    expect(groups).toHaveLength(1);
    expect(getChatUnreadSummary(read, "a").ids.size).toBe(0);
    expect(getChatUnreadSummary(read, "b").ids.size).toBe(0);
    expect(getChatUnreadSummary(read, "hidden").ids.has(hiddenCopy.id)).toBe(
      true,
    );
  });

  it("does not mark copies in another organization read from a single-organization view", () => {
    const first = createChatMessage({ id: "a", guildId: "a" });
    const copy = createChatMessage({ id: "b", guildId: "b" });
    const received = receiveChatMessage(
      receiveChatMessage({}, first, false),
      copy,
      false,
    );
    const groups = groupDuplicateChatMessages(
      getMessagesForSelectedGuild({ a: [first], b: [copy] }, "a"),
    );
    const read = markChatMessagesRead(
      received,
      getVisibleChatMessageAliases(groups, [first.id]),
    );
    expect(getChatUnreadSummary(read, "a").ids.size).toBe(0);
    expect(getChatUnreadSummary(read, "b").ids.has(copy.id)).toBe(true);
  });
});

it("does not create unread badges for retired gathering messages", () => {
  expect(
    receiveChatMessage(
      {},
      createChatMessage({ type: "PARTY_GATHERING" }),
      true,
    ),
  ).toEqual({});
});
