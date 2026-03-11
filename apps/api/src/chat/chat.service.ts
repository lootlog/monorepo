import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import type { SendMessageDto } from "src/chat/dto/send-message.dto";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import { RedisService } from "src/lib/redis/redis.service";
import { v6 } from "uuid";
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";
import { GuildsService } from "src/guilds/guilds.service";
import { Permission, Role } from "generated/client";
import { canViewChatMessage } from "src/shared/utils/can-view-chat-message";
import { getNpcTypeByWt } from "src/shared/utils/get-npc-type-by-wt";

const MAX_MESSAGES = 100;

@Injectable()
export class ChatService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
    private readonly guildsService: GuildsService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async sendMessage(discordId: string, guildId: string, data: SendMessageDto) {
    const key = `guild:${guildId}:messages`;
    const npcType = data.npc
      ? getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type)
      : undefined;
    const msg = {
      id: v6(),
      message: data.message,
      senderId: discordId,
      timestamp: new Date().toISOString(),
      guildId,
      type: data.type,
      npc: data.npc ? { ...data.npc, type: npcType } : undefined,
      characterData: data.characterData,
      partyGathering: data.partyGathering,
    };
    const messages = await this.getRawMessages(guildId);
    if (Array.isArray(messages) && messages.length >= MAX_MESSAGES) {
      messages.shift();
    }
    messages.push(msg);

    await this.redisService.set(key, JSON.stringify(messages));
    await this.emitMessage(msg);

    return msg;
  }

  private async getRawMessages(guildId: string): Promise<any[]> {
    const key = `guild:${guildId}:messages`;
    const messages = await this.redisService.get(key);

    if (!messages) {
      return [];
    }

    try {
      return JSON.parse(messages);
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to parse chat messages from Redis",
        guildId,
        error: error instanceof Error ? error.stack : error,
      });
      return [];
    }
  }

  async getMessages(discordId: string, guildId: string) {
    const key = `guild:${guildId}:messages`;
    const messages = await this.redisService.get(key);

    if (!messages) {
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

    const permissions = guild?.permissions ?? [];
    const roles = guild?.roles ?? [];

    const isAdministrative = isAdministrativeUser(permissions);

    try {
      const parsedMessages = JSON.parse(messages);

      if (isAdministrative) {
        return parsedMessages;
      }

      return this.filterMessagesByPermissions(
        parsedMessages,
        isAdministrative,
        roles,
      );
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to parse chat messages from Redis",
        guildId,
        error: error instanceof Error ? error.stack : error,
      });
      return [];
    }
  }

  private filterMessagesByPermissions(
    messages: any[],
    administrativeUser: boolean,
    roles: Role[],
  ): any[] {
    if (administrativeUser) return messages;
    return messages.filter((xmessage) => {
      const canView = canViewChatMessage(xmessage, roles);
      return canView;
    });
  }

  async clearMessages(guildId: string) {
    const key = `guild:${guildId}:messages`;
    await this.redisService.del(key);

    return;
  }

  async emitMessage(msg: any) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_SEND_MESSAGE,
      msg,
    );

    return undefined;
  }

  async updateMessage(
    discordId: string,
    guildId: string,
    messageId: string,
    newMessage: string,
  ) {
    const messages = await this.getRawMessages(guildId);

    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      throw new NotFoundException("Message not found");
    }

    const message = messages[messageIndex];
    if (message.senderId !== discordId) {
      throw new ForbiddenException("Not the owner of this message");
    }

    messages[messageIndex] = {
      ...message,
      message: newMessage,
      partyGathering: undefined,
    };

    const key = `guild:${guildId}:messages`;
    await this.redisService.set(key, JSON.stringify(messages));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_UPDATE_MESSAGE,
      {
        guildId,
        messageId,
        message: newMessage,
      },
    );

    return { success: true };
  }

  async deleteMessage(discordId: string, guildId: string, messageId: string) {
    const messages = await this.getRawMessages(guildId);

    const messageIndex = messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      throw new NotFoundException("Message not found");
    }

    const message = messages[messageIndex];
    if (message.senderId !== discordId) {
      throw new ForbiddenException("Not the owner of this message");
    }

    const filteredMessages = messages.filter((m) => m.id !== messageId);
    const key = `guild:${guildId}:messages`;
    await this.redisService.set(key, JSON.stringify(filteredMessages));

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_DELETE_MESSAGE,
      { guildId, messageId },
    );

    return { success: true };
  }
}
