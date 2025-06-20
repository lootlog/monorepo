import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Permission } from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { GuildsService } from 'src/guilds/guilds.service';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { Error } from 'src/notifications/enum/error.enum';
import { RoutingKey } from 'src/notifications/enum/routing-key.enum';
import { omit } from 'lodash';
import { v4 as uuid } from 'uuid';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
  ) {}

  async sendNotification(discordId: string, data: CreateNotificationDto) {
    if (!data.message && !data.npc) {
      throw new BadRequestException(Error.MISSING_MESSAGE_OR_NPC);
    }

    if (data.message && data.npc) {
      throw new BadRequestException(Error.EITHER_MESSAGE_OR_NPC);
    }

    const userGuilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
        Permission.OWNER,
        Permission.ADMIN,
        Permission.LOOTLOG_MANAGE,
      ],
    );

    if (userGuilds.length === 0) {
      throw new ForbiddenException();
    }

    const guildIds = userGuilds.reduce((acc, guild) => {
      if (data.guildIds.includes(guild.id)) {
        acc.push(guild.id);
      }

      return acc;
    }, []);

    console.log('guildIds:', guildIds);

    if (data.message) {
      console.log('do something with message:', data.message);
      return;
    }

    const notificationId = uuid();

    guildIds.forEach((guildId) => {
      this.emitNotification(discordId, guildId, notificationId, data);
    });

    console.log('do something with npc:', data.npc);

    console.log('Sending notification...');
  }

  async emitNotification(
    discordId: string,
    guildId: string,
    notificationId: string,
    data: CreateNotificationDto,
  ) {
    const desiredData = omit(data, ['guildIds']);

    const payload = {
      ...desiredData,
      discordId,
      guildId,
      notificationId,
    };

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND,
      payload,
    );
  }
}
