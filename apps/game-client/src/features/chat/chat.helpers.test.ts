import { describe, expect, it } from "vitest";
import { MessageType } from "@/api/chat.api";
import { CHAT_MESSAGE_LIMIT } from "@lootlog/types";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import {
  deduplicateChatMessages,
  filterChatMessages,
  getCurrentChatMessages,
  getChatRenderableMessages,
  getMessagesForSelectedGuild,
  getNextSelectedGuildId,
  hasVisibleChatMessages,
  mergeChatMessageHistories,
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
  canEdit: false,
  canDelete: false,
  ...overrides,
});

describe("chat helpers", () => {
  it("merges a reconnect snapshot without duplicating IDs or reordering updates", () => {
    const cachedMessages = [
      makeChatMessage({ id: "message-1" }),
      makeChatMessage({
        id: "message-3",
        timestamp: "2026-01-01T10:03:00.000Z",
      }),
    ];
    const serverMessages = [
      makeChatMessage({ id: "message-1", message: "edited on server" }),
      makeChatMessage({
        id: "message-2",
        timestamp: "2026-01-01T10:02:00.000Z",
      }),
    ];

    const mergedMessages = mergeChatMessageHistories(
      cachedMessages,
      serverMessages,
    );

    expect(mergedMessages.map((message) => message.id)).toEqual([
      "message-1",
      "message-2",
      "message-3",
    ]);
    expect(mergedMessages[0]?.message).toBe("edited on server");
  });

  it("retains only the newest 300 messages after a reconnect merge", () => {
    const serverMessages = Array.from(
      { length: CHAT_MESSAGE_LIMIT },
      (_, index) =>
        makeChatMessage({
          id: `message-${index}`,
          timestamp: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
        }),
    );
    const socketMessage = makeChatMessage({
      id: `message-${CHAT_MESSAGE_LIMIT}`,
      timestamp: new Date(
        Date.UTC(2026, 0, 1, 0, CHAT_MESSAGE_LIMIT),
      ).toISOString(),
    });

    const mergedMessages = mergeChatMessageHistories(
      [socketMessage],
      serverMessages,
    );

    expect(mergedMessages).toHaveLength(CHAT_MESSAGE_LIMIT);
    expect(mergedMessages[0]?.id).toBe("message-1");
    expect(mergedMessages.at(-1)).toBe(socketMessage);
  });

  it("keeps only the newest server-sized chat history", () => {
    const messages = Array.from({ length: CHAT_MESSAGE_LIMIT }, (_, index) =>
      makeChatMessage({ id: `message-${index}` }),
    );
    const nextMessage = makeChatMessage({ id: "message-new" });

    const updatedMessages = upsertChatMessage(messages, nextMessage);

    expect(updatedMessages).toHaveLength(CHAT_MESSAGE_LIMIT);
    expect(updatedMessages[0]?.id).toBe("message-1");
    expect(updatedMessages.at(-1)).toBe(nextMessage);
  });

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

  it("groups identical NPC bursts within a one-minute window", () => {
    const firstNpcMessage = makeChatMessage({
      id: "npc-1",
      message: "",
      timestamp: "2026-01-01T10:00:00.000Z",
      type: MessageType.NPC,
      npc: {
        id: 10,
        name: "Hydra",
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
    const secondNpcMessage = makeChatMessage({
      ...firstNpcMessage,
      id: "npc-2",
      timestamp: "2026-01-01T10:00:30.000Z",
    });
    const nextBurstNpcMessage = makeChatMessage({
      ...firstNpcMessage,
      id: "npc-3",
      timestamp: "2026-01-01T10:01:01.000Z",
    });

    expect(
      getChatRenderableMessages([
        firstNpcMessage,
        secondNpcMessage,
        nextBurstNpcMessage,
      ]),
    ).toEqual([
      {
        kind: "date-divider",
        key: "date-divider:2026-01-01",
        timestamp: "2026-01-01T10:00:30.000Z",
      },
      {
        additionalSenderCount: 0,
        kind: "npc-group",
        key: "npc-group:npc-1",
        count: 2,
        message: secondNpcMessage,
      },
      {
        additionalSenderCount: 0,
        kind: "npc-group",
        key: "npc-group:npc-3",
        count: 1,
        message: nextBurstNpcMessage,
      },
    ]);
  });

  it("groups interleaved NPC messages by payload instead of adjacency", () => {
    const hydraNpc = {
      id: 10,
      name: "Hydra",
      icon: "npc.png",
      x: 1,
      y: 2,
      hpp: 100,
      location: "Cave",
      lvl: 50,
      prof: "m",
      type: 1,
      wt: 100,
    };
    const dragonNpc = {
      id: 11,
      name: "Dragon",
      icon: "dragon.png",
      x: 5,
      y: 9,
      hpp: 100,
      location: "Ruins",
      lvl: 55,
      prof: "h",
      type: 1,
      wt: 100,
    };

    const renderables = getChatRenderableMessages([
      makeChatMessage({
        id: "npc-a-1",
        message: "",
        timestamp: "2026-01-01T10:00:00.000Z",
        type: MessageType.NPC,
        npc: hydraNpc,
      }),
      makeChatMessage({
        id: "npc-b-1",
        message: "",
        timestamp: "2026-01-01T10:00:05.000Z",
        type: MessageType.NPC,
        npc: dragonNpc,
      }),
      makeChatMessage({
        id: "npc-a-2",
        message: "",
        timestamp: "2026-01-01T10:00:10.000Z",
        type: MessageType.NPC,
        npc: hydraNpc,
      }),
      makeChatMessage({
        id: "npc-b-2",
        message: "",
        timestamp: "2026-01-01T10:00:15.000Z",
        type: MessageType.NPC,
        npc: dragonNpc,
      }),
    ]);

    expect(renderables).toEqual([
      {
        kind: "date-divider",
        key: "date-divider:2026-01-01",
        timestamp: "2026-01-01T10:00:10.000Z",
      },
      {
        additionalSenderCount: 0,
        kind: "npc-group",
        key: "npc-group:npc-a-1",
        count: 2,
        message: expect.objectContaining({ id: "npc-a-2" }),
      },
      {
        additionalSenderCount: 0,
        kind: "npc-group",
        key: "npc-group:npc-b-1",
        count: 2,
        message: expect.objectContaining({ id: "npc-b-2" }),
      },
    ]);
  });

  it("does not group NPC messages when their payload differs", () => {
    const renderables = getChatRenderableMessages([
      makeChatMessage({
        id: "npc-1",
        message: "",
        timestamp: "2026-01-01T10:00:00.000Z",
        type: MessageType.NPC,
        npc: {
          id: 10,
          name: "Hydra",
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
      }),
      makeChatMessage({
        id: "npc-2",
        message: "",
        timestamp: "2026-01-01T10:00:30.000Z",
        type: MessageType.NPC,
        npc: {
          id: 10,
          name: "Hydra",
          icon: "npc.png",
          x: 4,
          y: 2,
          hpp: 100,
          location: "Cave",
          lvl: 50,
          prof: "m",
          type: 1,
          wt: 100,
        },
      }),
    ]);

    expect(renderables).toEqual([
      {
        kind: "date-divider",
        key: "date-divider:2026-01-01",
        timestamp: "2026-01-01T10:00:00.000Z",
      },
      {
        additionalSenderCount: 0,
        kind: "npc-group",
        key: "npc-group:npc-1",
        count: 1,
        message: expect.objectContaining({ id: "npc-1" }),
      },
      {
        additionalSenderCount: 0,
        kind: "npc-group",
        key: "npc-group:npc-2",
        count: 1,
        message: expect.objectContaining({ id: "npc-2" }),
      },
    ]);
  });

  it("tracks additional unique senders inside a grouped npc burst", () => {
    const hydraNpc = {
      id: 10,
      name: "Hydra",
      icon: "npc.png",
      x: 1,
      y: 2,
      hpp: 100,
      location: "Cave",
      lvl: 50,
      prof: "m",
      type: 1,
      wt: 100,
    };

    expect(
      getChatRenderableMessages([
        makeChatMessage({
          id: "npc-a-1",
          senderId: "user-1",
          message: "",
          timestamp: "2026-01-01T10:00:00.000Z",
          type: MessageType.NPC,
          npc: hydraNpc,
        }),
        makeChatMessage({
          id: "npc-a-2",
          senderId: "user-2",
          message: "",
          timestamp: "2026-01-01T10:00:05.000Z",
          type: MessageType.NPC,
          npc: hydraNpc,
        }),
        makeChatMessage({
          id: "npc-a-3",
          senderId: "user-3",
          message: "",
          timestamp: "2026-01-01T10:00:10.000Z",
          type: MessageType.NPC,
          npc: hydraNpc,
        }),
      ]),
    ).toEqual([
      {
        kind: "date-divider",
        key: "date-divider:2026-01-01",
        timestamp: "2026-01-01T10:00:10.000Z",
      },
      {
        additionalSenderCount: 2,
        kind: "npc-group",
        key: "npc-group:npc-a-1",
        count: 3,
        message: expect.objectContaining({ id: "npc-a-3" }),
      },
    ]);
  });

  it("adds date dividers when the rendered list crosses day boundaries", () => {
    expect(
      getChatRenderableMessages([
        makeChatMessage({
          id: "message-1",
          timestamp: "2026-01-02T10:00:00.000Z",
        }),
        makeChatMessage({
          id: "message-2",
          timestamp: "2026-01-01T10:00:00.000Z",
        }),
      ]),
    ).toEqual([
      {
        kind: "date-divider",
        key: "date-divider:2026-01-01",
        timestamp: "2026-01-01T10:00:00.000Z",
      },
      {
        kind: "message",
        key: "message-2",
        message: expect.objectContaining({ id: "message-2" }),
      },
      {
        kind: "date-divider",
        key: "date-divider:2026-01-02",
        timestamp: "2026-01-02T10:00:00.000Z",
      },
      {
        kind: "message",
        key: "message-1",
        message: expect.objectContaining({ id: "message-1" }),
      },
    ]);
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
