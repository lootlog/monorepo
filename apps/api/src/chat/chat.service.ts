import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import {
  MessageType,
  type SendMessageDto,
} from "src/chat/dto/send-message.dto";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { RedisService } from "@lootlog/nest-shared/redis";
import { getNpcRoutingTier, type NpcRoutingTier } from "@lootlog/types";
import { v6 } from "uuid";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission, type Role } from "src/generated/prisma/client";
import { canViewChatMessage } from "src/shared/utils/can-view-chat-message";
import type { ChatStoredMessage } from "src/chat/types/chat-stored-message.type";
import type { ChatMessageViewer } from "src/chat/types/chat-message-viewer.type";
import { canManageChatMessage } from "src/chat/chat-message-permissions";
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";

const MAX_MESSAGES = 100;

type MessageRouting = {
  tier: NpcRoutingTier;
  npcLevel?: number;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
    private readonly guildsService: GuildsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  private getChatMessagesKey(guildId: string): string {
    return `guild:${guildId}:messages`;
  }

  async sendMessage(discordId: string, guildId: string, data: SendMessageDto) {
    const key = this.getChatMessagesKey(guildId);
    const msg: ChatStoredMessage = {
      id: v6(),
      message: data.message,
      senderId: discordId,
      timestamp: new Date().toISOString(),
      guildId,
      type: data.type,
      npc: data.npc ? { ...data.npc } : undefined,
      characterData: data.characterData,
      partyGathering: data.partyGathering,
    };

    await this.redisService.rpush(key, JSON.stringify(msg));
    await this.redisService.ltrim(key, -MAX_MESSAGES, -1);
    this.emitMessage(msg);

    return this.toChatMessageEnvelope(msg, {
      discordId,
      permissions: [],
      roles: [],
    });
  }

  private async getRawMessages(guildId: string): Promise<ChatStoredMessage[]> {
    const key = this.getChatMessagesKey(guildId);
    let elements: string[];

    try {
      elements = await this.redisService.lrange(key, 0, -1);
    } catch (error) {
      if (error instanceof Error && error.message.includes("WRONGTYPE")) {
        this.logger.log({
          level: "warn",
          message: `Corrupted Redis key type for guild ${guildId}, deleting key`,
        });
        await this.redisService.del(key);
        return [];
      }
      throw error;
    }

    return elements.reduce<ChatStoredMessage[]>((acc, element) => {
      try {
        acc.push(JSON.parse(element));
      } catch (error) {
        this.logger.log({
          level: "error",
          message: "Failed to parse chat message from Redis",
          guildId,
          error: error instanceof Error ? error.stack : error,
        });
      }
      return acc;
    }, []);
  }

  async getMessages(discordId: string, guildId: string) {
    const messages = await this.getRawMessages(guildId);

    if (messages.length === 0) {
      return [];
    }

    const viewer = await this.getChatMessageViewer(discordId, guildId);

    if (!viewer) {
      return [];
    }

    const visibleMessages = isAdministrativeUser(viewer.permissions)
      ? messages
      : this.filterMessagesByPermissions(messages, viewer.roles);

    return visibleMessages.map((message) =>
      this.toChatMessageEnvelope(message, viewer),
    );
  }

  private filterMessagesByPermissions(
    messages: ChatStoredMessage[],
    roles: Role[],
  ): ChatStoredMessage[] {
    return messages.filter((message) => canViewChatMessage(message, roles));
  }

  async clearMessages(guildId: string) {
    const key = this.getChatMessagesKey(guildId);
    await this.redisService.del(key);
  }

  emitMessage(msg: ChatStoredMessage) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_SEND_MESSAGE,
      msg,
    );
  }

  async updateMessage(
    discordId: string,
    guildId: string,
    messageId: string,
    newMessage: string,
  ) {
    const key = this.getChatMessagesKey(guildId);
    const elements = await this.redisService.lrange(key, 0, -1);

    const messageIndex = elements.findIndex((element) => {
      const parsed = JSON.parse(element);
      return parsed.id === messageId;
    });

    if (messageIndex === -1) {
      throw new NotFoundException("Message not found");
    }

    const message = JSON.parse(elements[messageIndex]) as ChatStoredMessage;
    const viewer = await this.getChatMessageViewer(discordId, guildId);

    if (!viewer || !canManageChatMessage(viewer, message)) {
      throw new ForbiddenException("Not allowed to manage this message");
    }

    const updated = {
      ...message,
      message: newMessage,
      partyGathering: undefined,
    };
    const routing = this.getMessageRouting(message);

    await this.redisService.lset(key, messageIndex, JSON.stringify(updated));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE_MESSAGE,
      {
        guildId,
        messageId,
        message: newMessage,
        routing,
      },
    );

    return { success: true };
  }

  async deleteMessage(discordId: string, guildId: string, messageId: string) {
    const key = this.getChatMessagesKey(guildId);
    const elements = await this.redisService.lrange(key, 0, -1);

    const targetElement = elements.find((element) => {
      const parsed = JSON.parse(element);
      return parsed.id === messageId;
    });

    if (!targetElement) {
      throw new NotFoundException("Message not found");
    }

    const message = JSON.parse(targetElement) as ChatStoredMessage;
    const viewer = await this.getChatMessageViewer(discordId, guildId);

    if (!viewer || !canManageChatMessage(viewer, message)) {
      throw new ForbiddenException("Not allowed to manage this message");
    }
    const routing = this.getMessageRouting(message);

    await this.redisService.lrem(key, 1, targetElement);

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_DELETE_MESSAGE,
      { guildId, messageId, routing },
    );

    return { success: true };
  }

  private getMessageRouting(
    message: Pick<SendMessageDto, "type" | "npc">,
  ): MessageRouting {
    const hasNpcScopedRouting =
      message.type === MessageType.NPC ||
      (message.type === MessageType.PARTY_GATHERING && message.npc);

    if (!hasNpcScopedRouting || !message.npc) {
      return { tier: "base" };
    }

    return {
      tier: getNpcRoutingTier(message.npc),
      npcLevel: message.npc.lvl,
    };
  }

  private toChatMessageEnvelope(
    message: ChatStoredMessage,
    viewer: ChatMessageViewer,
  ) {
    const canManageMessage = canManageChatMessage(viewer, message);

    return {
      ...message,
      canEdit: canManageMessage,
      canDelete: canManageMessage,
    };
  }

  private async getChatMessageViewer(
    discordId: string,
    guildId: string,
  ): Promise<ChatMessageViewer | null> {
    const guildsWithPermissions =
      await this.guildsService.getMultipleGuildsPermissions(discordId, [
        guildId,
      ]);
    const guildViewer = guildsWithPermissions.find(
      (g) => g.guild.id === guildId,
    );

    if (!guildViewer) {
      return null;
    }

    const permissions = guildViewer.permissions ?? [];
    const roles = guildViewer.roles ?? [];
    const canReadChatMessages =
      isAdministrativeUser(permissions) ||
      roles.some((role) =>
        role.permissions.includes(Permission.LOOTLOG_CHAT_READ),
      );

    if (!canReadChatMessages) {
      return null;
    }

    return {
      discordId,
      permissions,
      roles,
    };
  }
}
