import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import {
  deduplicateChatMessages,
  filterChatMessages,
  getCurrentChatMessages,
  getMessagesForSelectedGuild,
  getNextSelectedGuildId,
  hasVisibleChatMessages,
  removeChatMessage,
  updateChatMessage,
  upsertChatMessage,
} from "./chat.helpers";

const makeChatMessage = (
  overrides?: Partial<ChatMessageType>,
): ChatMessageType => ({
  id: "message-1",
  guildId: "guild-1",
  message: "hello",
  senderId: "user-1",
  timestamp: "2026-01-01T10:00:00.000Z",
  type: MessageType.NORMAL,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
  },
  ...overrides,
});

describe("chat helpers", () => {
  it("returns the first guild id only when selection is missing", () => {
    expect(
      getNextSelectedGuildId("", [{ id: "guild-1" }, { id: "guild-2" }]),
    ).toBe("guild-1");

    expect(getNextSelectedGuildId("guild-2", [{ id: "guild-1" }])).toBe(
      undefined,
    );
    expect(getNextSelectedGuildId("", [])).toBe(undefined);
  });

  it("returns messages for the selected guild or for all guilds", () => {
    const messageCache = {
      "guild-1": [
        makeChatMessage(),
        makeChatMessage({ id: "without-timestamp", timestamp: "" }),
      ],
      "guild-2": [makeChatMessage({ id: "message-2", guildId: "guild-2" })],
    };

    expect(getMessagesForSelectedGuild(messageCache, "guild-1")).toEqual([
      messageCache["guild-1"][0],
    ]);

    expect(getMessagesForSelectedGuild(messageCache, "all")).toEqual([
      messageCache["guild-1"][0],
      messageCache["guild-2"][0],
    ]);
  });

  it("deduplicates and filters chat messages", () => {
    const duplicate = makeChatMessage({
      id: "message-2",
      timestamp: "2026-01-01T10:00:00.150Z",
    });
    const npcMessage = makeChatMessage({
      id: "message-3",
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
    });
    const notificationMessage = makeChatMessage({
      id: "message-4",
      type: MessageType.NOTIFICATION,
      message: "ping",
      timestamp: "2026-01-01T10:01:00.000Z",
    });
    const original = makeChatMessage();
    const laterDuplicate = makeChatMessage({
      id: "message-2",
      timestamp: "2026-01-01T10:00:00.150Z",
    });
    const laterNpcMessage = makeChatMessage({
      id: "message-3",
      type: MessageType.NPC,
      timestamp: "2026-01-01T10:00:30.000Z",
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
    });

    expect(
      deduplicateChatMessages([
        original,
        notificationMessage,
        laterDuplicate,
        laterNpcMessage,
      ]).map((message) => message.id),
    ).toEqual(["message-1", "message-3", "message-4"]);

    expect(
      filterChatMessages(
        [makeChatMessage(), notificationMessage, npcMessage],
        "normal",
      ).map((message) => message.id),
    ).toEqual(["message-1", "message-4"]);

    expect(
      getCurrentChatMessages(
        { "guild-1": [makeChatMessage(), duplicate, npcMessage] },
        "guild-1",
        "npc",
      ).map((message) => message.id),
    ).toEqual(["message-3"]);
  });

  it("detects whether chat has renderable messages", () => {
    const messages = [makeChatMessage()];

    expect(hasVisibleChatMessages(messages, { "guild-1": "Guild" })).toBe(true);

    expect(hasVisibleChatMessages(messages, {})).toBe(false);
  });

  it("reconciles create, update and delete operations against a single message list", () => {
    const messages = [makeChatMessage()];
    const nextMessage = makeChatMessage({ id: "message-2", message: "next" });

    expect(upsertChatMessage(messages, nextMessage)).toEqual([
      messages[0],
      nextMessage,
    ]);
    expect(
      updateChatMessage(messages, "message-1", "updated message")[0]?.message,
    ).toBe("updated message");
    expect(removeChatMessage(messages, "message-1")).toEqual([]);
  });
});
