import { Permission } from "@lootlog/schema/permissions";
import { MessageType } from "#src/chat/chat-message";
import type { ChatStoredMessage } from "#src/chat/chat-stored-message";
import { canViewChatMessage } from "./chat-message-visibility.js";

type Role = Parameters<typeof canViewChatMessage>[1][number];

function createRole(
  permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): Role {
  return {
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
  };
}

function createMessage(
  overrides: Partial<ChatStoredMessage> = {},
): ChatStoredMessage {
  return {
    id: "message-1",
    guildId: "guild-1",
    message: "hello",
    senderId: "discord-1",
    timestamp: new Date().toISOString(),
    type: MessageType.NORMAL,
    characterData: {
      nick: "Tester",
      id: 1,
      acc: 2,
      lvl: 100,
      prof: "w",
      icon: "icon.png",
    },
    ...overrides,
  };
}

describe("canViewChatMessage", () => {
  it("returns false when data is missing", () => {
    expect(canViewChatMessage(undefined, [])).toBe(false);
  });

  it("returns false without base chat permission", () => {
    const roles = [createRole([Permission.LOOTLOG_CHAT_TITANS_READ])];

    expect(canViewChatMessage(createMessage(), roles)).toBe(false);
  });

  it("returns true for normal messages with base chat permission", () => {
    const roles = [createRole([Permission.LOOTLOG_CHAT_READ])];

    expect(canViewChatMessage(createMessage(), roles)).toBe(true);
  });

  it("returns false for NPC messages without npc payload", () => {
    const roles = [createRole([Permission.LOOTLOG_CHAT_READ])];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: undefined,
        }),
        roles,
      ),
    ).toBe(false);
  });

  it("returns true for titan NPC messages when permission and level match", () => {
    const roles = [
      createRole(
        [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_TITANS_READ],
        250,
        350,
      ),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Titan",
            location: "map",
            lvl: 300,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        roles,
      ),
    ).toBe(true);
  });

  it("returns false for titan NPC messages without titan permission", () => {
    const roles = [createRole([Permission.LOOTLOG_CHAT_READ], 250, 350)];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Titan",
            location: "map",
            lvl: 300,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        roles,
      ),
    ).toBe(false);
  });

  it("returns false for titan NPC messages outside level range", () => {
    const roles = [
      createRole(
        [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_TITANS_READ],
        100,
        299,
      ),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Titan",
            location: "map",
            lvl: 300,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        roles,
      ),
    ).toBe(false);
  });

  it("allows access when chat read and titan access come from different roles", () => {
    const roles = [
      createRole([Permission.LOOTLOG_CHAT_READ], 1, 500),
      createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 250, 350),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Titan",
            location: "map",
            lvl: 300,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        roles,
      ),
    ).toBe(true);
  });

  it("blocks access when titan permission and matching level are split across roles", () => {
    const roles = [
      createRole([Permission.LOOTLOG_CHAT_READ], 1, 500),
      createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 1, 299),
      createRole([], 300, 400),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Titan",
            location: "map",
            lvl: 300,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        roles,
      ),
    ).toBe(false);
  });

  it("returns true for event hero messages with heroes permission", () => {
    const roles = [
      createRole(
        [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_HEROES_READ],
        80,
        180,
      ),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 11,
            name: "Event Hero",
            location: "map",
            lvl: 150,
            prof: "m",
            wt: 85,
            hpp: 100,
            icon: "npc.png",
            type: "EVENT_HERO" as never,
          },
        }),
        roles,
      ),
    ).toBe(true);
  });

  it("requires level check for base NPC messages", () => {
    const roles = [createRole([Permission.LOOTLOG_CHAT_READ], 1, 49)];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 12,
            name: "Regular NPC",
            location: "map",
            lvl: 50,
            prof: "",
            wt: 5,
            hpp: 100,
            icon: "npc.png",
            type: 5,
          },
        }),
        roles,
      ),
    ).toBe(false);
  });

  it("treats party gathering with npc like an NPC-scoped message", () => {
    const roles = [
      createRole(
        [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_HEROES_READ],
        100,
        200,
      ),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.PARTY_GATHERING,
          npc: {
            id: 13,
            name: "Hero",
            location: "map",
            lvl: 150,
            prof: "m",
            wt: 85,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
          partyGathering: {
            notificationId: "notif-1",
            discordId: "discord-1",
            world: "Berufs",
          },
        }),
        roles,
      ),
    ).toBe(true);
  });

  it("treats party gathering without npc like a base chat message", () => {
    const roles = [createRole([Permission.LOOTLOG_CHAT_READ])];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.PARTY_GATHERING,
          partyGathering: {
            notificationId: "notif-1",
            discordId: "discord-1",
            world: "Berufs",
          },
        }),
        roles,
      ),
    ).toBe(true);
  });

  it("includes level range boundaries", () => {
    const roles = [
      createRole(
        [Permission.LOOTLOG_CHAT_READ, Permission.LOOTLOG_CHAT_TITANS_READ],
        300,
        300,
      ),
    ];

    expect(
      canViewChatMessage(
        createMessage({
          type: MessageType.NPC,
          npc: {
            id: 10,
            name: "Titan",
            location: "map",
            lvl: 300,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        roles,
      ),
    ).toBe(true);
  });
});
