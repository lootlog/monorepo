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
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission, type Role } from "src/generated/prisma/client";
import { canViewChatMessage } from "src/shared/utils/can-view-chat-message";

const MAX_MESSAGES = 100;

type ChatMessage = SendMessageDto & {
  id: string;
  senderId: string;
  timestamp: string;
  guildId: string;
};

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
    const msg = {
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

    return msg;
  }

  private async getRawMessages(guildId: string): Promise<ChatMessage[]> {
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

    return elements.reduce<ChatMessage[]>((acc, element) => {
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

    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_CHAT_READ],
    );

    if (guilds.length === 0) return [];

    const guildIds = guilds.map((guild) => guild.id);
    const guildsWithPermissions =
      await this.guildsService.getMultipleGuildsPermissions(
        discordId,
        guildIds,
      );

    const guild = guildsWithPermissions.find((g) => g.guild.id === guildId);

    if (!guild) {
      return [];
    }

    const permissions = guild.permissions ?? [];
    const roles = guild.roles ?? [];

    const isAdministrative = isAdministrativeUser(permissions);

    if (isAdministrative) {
      return messages;
    }

    return this.filterMessagesByPermissions(messages, roles);
  }

  private filterMessagesByPermissions(
    messages: ChatMessage[],
    roles: Role[],
  ): ChatMessage[] {
    return messages.filter((message) =>
      canViewChatMessage(message as SendMessageDto, roles),
    );
  }

  async clearMessages(guildId: string) {
    const key = this.getChatMessagesKey(guildId);
    await this.redisService.del(key);
  }

  emitMessage(msg: ChatMessage) {
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

    const message = JSON.parse(elements[messageIndex]);
    if (message.senderId !== discordId) {
      throw new ForbiddenException("Not the owner of this message");
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

    const message = JSON.parse(targetElement);
    if (message.senderId !== discordId) {
      throw new ForbiddenException("Not the owner of this message");
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
}
