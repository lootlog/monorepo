import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { Permission, type Role } from "src/generated/prisma/client";
import { MessageType } from "src/chat/dto/send-message.dto";
import { ChatService } from "./chat.service";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";

function createRole(
  permissions: Permission[],
  lvlRangeFrom = 1,
  lvlRangeTo = 500,
): Role {
  return {
    id: crypto.randomUUID(),
    guildId: "guild-1",
    name: "role",
    color: null,
    position: null,
    permissions,
    lvlRangeFrom,
    lvlRangeTo,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function createStoredMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
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

function withCapabilities(
  message: ReturnType<typeof createStoredMessage>,
  capabilities: { canEdit: boolean; canDelete: boolean },
) {
  return {
    ...message,
    ...capabilities,
  };
}

describe("ChatService", () => {
  const amqpConnection = {
    publish: vi.fn(),
  };

  const redisService = {
    del: vi.fn(),
    lrange: vi.fn(),
    lrem: vi.fn(),
    lset: vi.fn(),
    ltrim: vi.fn(),
    rpush: vi.fn(),
  };

  const guildsService = {
    getGuildsForRequiredPermissions: vi.fn(),
    getMultipleGuildsPermissions: vi.fn(),
  };

  const logger = {
    log: vi.fn(),
  };

  let service: ChatService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ChatService(
      amqpConnection as never,
      redisService as never,
      guildsService as never,
      logger as never,
    );
  });

  describe("getMessages", () => {
    it("returns empty array when chat history is empty", async () => {
      redisService.lrange.mockResolvedValue([]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([]);
      expect(guildsService.getMultipleGuildsPermissions).not.toHaveBeenCalled();
    });

    it("returns empty array when user has no guild with base chat permission", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(createStoredMessage()),
      ]);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [],
          roles: [],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([]);
    });

    it("returns empty array when requested guild is not present in permissions result", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(createStoredMessage()),
      ]);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-2" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([]);
    });

    it("returns all messages for administrative users", async () => {
      const messages = [
        createStoredMessage(),
        createStoredMessage({
          id: "msg-2",
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
      ];
      redisService.lrange.mockResolvedValue(
        messages.map((message) => JSON.stringify(message)),
      );
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.ADMIN],
          roles: [],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual(
        messages.map((message) =>
          withCapabilities(message, { canEdit: true, canDelete: true }),
        ),
      );
    });

    it("returns all messages for OWNER users", async () => {
      const messages = [
        createStoredMessage(),
        createStoredMessage({
          id: "msg-2",
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
      ];
      redisService.lrange.mockResolvedValue(
        messages.map((message) => JSON.stringify(message)),
      );
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.OWNER],
          roles: [],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual(
        messages.map((message) =>
          withCapabilities(message, { canEdit: true, canDelete: true }),
        ),
      );
    });

    it("filters history for regular users based on NPC permissions and levels", async () => {
      const messages = [
        createStoredMessage({ id: "msg-normal" }),
        createStoredMessage({
          id: "msg-titan-ok",
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
        createStoredMessage({
          id: "msg-titan-nope",
          type: MessageType.NPC,
          npc: {
            id: 11,
            name: "Titan 2",
            location: "map",
            lvl: 450,
            prof: "w",
            wt: 120,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
        createStoredMessage({
          id: "msg-hero",
          type: MessageType.NPC,
          npc: {
            id: 12,
            name: "Hero",
            location: "map",
            lvl: 150,
            prof: "m",
            wt: 85,
            hpp: 100,
            icon: "npc.png",
            type: 2,
          },
        }),
      ];
      redisService.lrange.mockResolvedValue(
        messages.map((message) => JSON.stringify(message)),
      );
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [
            Permission.LOOTLOG_CHAT_READ,
            Permission.LOOTLOG_CHAT_TITANS_READ,
          ],
          roles: [
            createRole([Permission.LOOTLOG_CHAT_READ], 1, 500),
            createRole([Permission.LOOTLOG_CHAT_TITANS_READ], 250, 350),
          ],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([
        withCapabilities(messages[0], { canEdit: true, canDelete: true }),
        withCapabilities(messages[1], { canEdit: true, canDelete: true }),
      ]);
    });

    it("deletes corrupted redis key on WRONGTYPE errors", async () => {
      redisService.lrange.mockRejectedValue(
        new Error("WRONGTYPE Operation against a key"),
      );

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([]);
      expect(redisService.del).toHaveBeenCalledWith("guild:guild-1:messages");
    });

    it("ignores malformed redis entries and returns valid messages", async () => {
      const validMessage = createStoredMessage();

      redisService.lrange.mockResolvedValue([
        "not-json",
        JSON.stringify(validMessage),
      ]);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.ADMIN],
          roles: [],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([
        withCapabilities(validMessage, { canEdit: true, canDelete: true }),
      ]);
      expect(logger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "error",
          message: "Failed to parse chat message from Redis",
        }),
      );
    });

    it("returns canEdit and canDelete as false for visible messages from other users", async () => {
      const visibleMessage = createStoredMessage({
        senderId: "discord-owner",
        id: "msg-other",
      });
      redisService.lrange.mockResolvedValue([JSON.stringify(visibleMessage)]);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await expect(
        service.getMessages("discord-1", "guild-1"),
      ).resolves.toEqual([
        withCapabilities(visibleMessage, { canEdit: false, canDelete: false }),
      ]);
    });
  });

  describe("sendMessage", () => {
    it("returns the full message envelope for the sender", async () => {
      redisService.rpush.mockResolvedValue(1);
      redisService.ltrim.mockResolvedValue("OK");

      const result = await service.sendMessage("discord-1", "guild-1", {
        message: "hello",
        type: MessageType.NORMAL,
        characterData: {
          nick: "Tester",
          id: 1,
          acc: 2,
          lvl: 100,
          prof: "w",
          icon: "icon.png",
        },
      });

      expect(result).toEqual(
        expect.objectContaining({
          guildId: "guild-1",
          senderId: "discord-1",
          message: "hello",
          canEdit: true,
          canDelete: true,
        }),
      );
    });
  });

  describe("updateMessage", () => {
    it("publishes titan routing when updating an NPC chat message", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({
            senderId: "discord-1",
            type: MessageType.NPC,
            npc: {
              id: 77,
              name: "Titan",
              location: "map",
              lvl: 320,
              prof: "w",
              wt: 120,
              icon: "npc.png",
              type: 2,
            },
          }),
        ),
      ]);
      redisService.lset.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await service.updateMessage("discord-1", "guild-1", "msg-1", "updated");

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_UPDATE_MESSAGE,
        {
          guildId: "guild-1",
          messageId: "msg-1",
          message: "updated",
          routing: {
            tier: "titans",
            npcLevel: 320,
          },
        },
      );
    });

    it("publishes heroes routing for party gathering messages with NPC", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({
            senderId: "discord-1",
            type: MessageType.PARTY_GATHERING,
            npc: {
              id: 77,
              name: "Hero",
              location: "map",
              lvl: 140,
              prof: "m",
              wt: 85,
              icon: "npc.png",
              type: 2,
            },
            partyGathering: {
              notificationId: "notif-1",
              discordId: "discord-1",
              world: "Berufs",
            },
          }),
        ),
      ]);
      redisService.lset.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await service.updateMessage("discord-1", "guild-1", "msg-1", "updated");

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_UPDATE_MESSAGE,
        expect.objectContaining({
          routing: {
            tier: "heroes",
            npcLevel: 140,
          },
        }),
      );
    });

    it("publishes base routing for party gathering messages without NPC", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({
            senderId: "discord-1",
            type: MessageType.PARTY_GATHERING,
            partyGathering: {
              notificationId: "notif-1",
              discordId: "discord-1",
              world: "Berufs",
            },
          }),
        ),
      ]);
      redisService.lset.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await service.updateMessage("discord-1", "guild-1", "msg-1", "updated");

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_UPDATE_MESSAGE,
        expect.objectContaining({
          routing: {
            tier: "base",
          },
        }),
      );
    });

    it("rejects updates for missing messages", async () => {
      redisService.lrange.mockResolvedValue([]);

      await expect(
        service.updateMessage("discord-1", "guild-1", "missing", "updated"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects updates from non-owners", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(createStoredMessage({ senderId: "discord-owner" })),
      ]);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await expect(
        service.updateMessage("discord-other", "guild-1", "msg-1", "updated"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows updates from administrative users for other users messages", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(createStoredMessage({ senderId: "discord-owner" })),
      ]);
      redisService.lset.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.ADMIN],
          roles: [],
        },
      ]);

      await expect(
        service.updateMessage("discord-admin", "guild-1", "msg-1", "updated"),
      ).resolves.toEqual({ success: true });
    });
  });

  describe("deleteMessage", () => {
    it("publishes base routing when deleting a regular chat message", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({ senderId: "discord-2", id: "msg-2" }),
        ),
      ]);
      redisService.lrem.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await service.deleteMessage("discord-2", "guild-1", "msg-2");

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_DELETE_MESSAGE,
        {
          guildId: "guild-1",
          messageId: "msg-2",
          routing: {
            tier: "base",
          },
        },
      );
    });

    it("publishes titan routing when deleting NPC messages", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({
            senderId: "discord-2",
            id: "msg-2",
            type: MessageType.NPC,
            npc: {
              id: 10,
              name: "Titan",
              location: "map",
              lvl: 310,
              prof: "w",
              wt: 120,
              icon: "npc.png",
              type: 2,
            },
          }),
        ),
      ]);
      redisService.lrem.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await service.deleteMessage("discord-2", "guild-1", "msg-2");

      expect(amqpConnection.publish).toHaveBeenCalledWith(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_DELETE_MESSAGE,
        {
          guildId: "guild-1",
          messageId: "msg-2",
          routing: {
            tier: "titans",
            npcLevel: 310,
          },
        },
      );
    });

    it("rejects deletes for missing messages", async () => {
      redisService.lrange.mockResolvedValue([]);

      await expect(
        service.deleteMessage("discord-1", "guild-1", "missing"),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects deletes from non-owners", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({ senderId: "discord-owner", id: "msg-3" }),
        ),
      ]);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.LOOTLOG_CHAT_READ],
          roles: [createRole([Permission.LOOTLOG_CHAT_READ], 1, 500)],
        },
      ]);

      await expect(
        service.deleteMessage("discord-other", "guild-1", "msg-3"),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it("allows deletes from administrative users for other users messages", async () => {
      redisService.lrange.mockResolvedValue([
        JSON.stringify(
          createStoredMessage({ senderId: "discord-owner", id: "msg-3" }),
        ),
      ]);
      redisService.lrem.mockResolvedValue(1);
      guildsService.getMultipleGuildsPermissions.mockResolvedValue([
        {
          guild: { id: "guild-1" },
          permissions: [Permission.ADMIN],
          roles: [],
        },
      ]);

      await expect(
        service.deleteMessage("discord-admin", "guild-1", "msg-3"),
      ).resolves.toEqual({ success: true });
    });
  });
});
