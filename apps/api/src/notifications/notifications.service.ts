import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Permission } from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { GuildsService } from 'src/guilds/guilds.service';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { Error } from 'src/notifications/enum/error.enum';
import { omit } from 'lodash';
import { v4 as uuid } from 'uuid';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
  ) {}

  async sendNotification(
    discordId: string,
    userId: string,
    data: CreateNotificationDto,
  ) {
    if (!data.message && !data.npc) {
      throw new BadRequestException(Error.MISSING_MESSAGE_OR_NPC);
    }
    if (data.message && data.npc) {
      throw new BadRequestException(Error.EITHER_MESSAGE_OR_NPC);
    }
    const notificationId = uuid();
    const createdAt = new Date().toISOString();
    const userGuilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      userId,
      [
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
        Permission.OWNER,
        Permission.ADMIN,
        Permission.LOOTLOG_MANAGE,
      ],
    );
    if (userGuilds.length === 0) {
      this.logger.warn(
        `User ${discordId} has no permission to send notifications`,
      );
      throw new ForbiddenException();
    }
    const guildIds = userGuilds
      .map((g) => g.id)
      .filter((id) => data.guildIds.includes(id));
    if (!guildIds.length) {
      this.logger.warn(
        `User ${discordId} tried to send notification to unauthorized guilds: ${data.guildIds}`,
      );
      throw new ForbiddenException();
    }
    const basePayload = {
      ...omit(data, ['guildIds']),
      discordId,
      notificationId,
      createdAt,
    };
    if (data.message) {
      guildIds.forEach((guildId) => {
        this.emitNotification({ ...basePayload, guildId });
      });
      return;
    }
    const npcType = getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type);
    guildIds.forEach((guildId) => {
      this.emitNotification({
        ...basePayload,
        guildId,
        npc: { ...data.npc, type: npcType },
      });
    });
  }

  async emitNotification(payload: any) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND,
      payload,
    );
  }
}
