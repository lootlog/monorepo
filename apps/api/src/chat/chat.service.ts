import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { SendMessageDto } from 'src/chat/dto/send-message.dto';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { RedisService } from 'src/lib/redis/redis.service';
import { v6 } from 'uuid';

const MAX_MESSAGES = 100;

@Injectable()
export class ChatService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
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
      this.logger.log({
        level: 'error',
        message: 'Failed to parse chat messages from Redis',
        guildId,
        error: error instanceof Error ? error.stack : error,
      });
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
