import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Injectable } from '@nestjs/common';
import { SendMessageDto } from 'src/chat/dto/send-message.dto';
import { RoutingKey } from 'src/chat/enum/routing-key.enum';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RedisService } from 'src/lib/redis/redis.service';
import { v6 } from 'uuid';

const MAX_MESSAGES = 100; // Maximum number of messages to store per guild

@Injectable()
export class ChatService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
  ) {}

  async sendMessage(discordId: string, guildId: string, data: SendMessageDto) {
    const key = `guild:${guildId}:messages`;
    const msg = {
      id: v6(),
      message: data.message,
      senderId: discordId,
      timestamp: new Date().toISOString(),
      guildId,
    };
    const messages = await this.getMessages(guildId);
    if (Array.isArray(messages) && messages.length >= MAX_MESSAGES) {
      messages.shift();
    }
    messages.push(msg);

    await this.redisService.set(key, JSON.stringify(messages));
    await this.emitMessage(msg);

    return msg;
  }

  async getMessages(guildId: string) {
    const key = `guild:${guildId}:messages`;
    const messages = await this.redisService.get(key);

    try {
      if (!messages) {
        return [];
      }

      return JSON.parse(messages);
    } catch (error) {
      console.error(error);
      return [];
    }
  }

  async clearMessages(guildId: string) {
    const key = `guild:${guildId}:messages`;
    await this.redisService.del(key);

    return;
  }

  async emitMessage(msg) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_SEND_MESSAGE,
      msg,
    );

    return undefined;
  }
}
