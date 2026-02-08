import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import { Permission } from 'generated/client';
import { DEFAULT_EXCHANGE_NAME } from 'src/config/rabbitmq.config';
import { GuildsService } from 'src/guilds/guilds.service';
import type { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import type { CreatePartyGatheringDto } from 'src/notifications/dto/create-party-gathering.dto';
import type { CreateVolunteerDto } from 'src/notifications/dto/create-volunteer.dto';
import { Error } from 'src/notifications/enum/error.enum';
import { omit } from 'lodash';
import { v4 as uuid } from 'uuid';
import { RoutingKey } from 'src/enum/routing-key.enum';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { RedisService } from 'src/lib/redis/redis.service';

const NOTIFICATION_TTL_SECONDS = 1800; // 30 minutes

type NotificationMetadata = {
  discordId: string;
  guildIds: string[];
  createdAt: string;
};

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
    private readonly redisService: RedisService,
  ) {}

  private getNotificationKey(notificationId: string): string {
    return `notification:${notificationId}`;
  }

  private async storeNotificationMetadata(
    notificationId: string,
    discordId: string,
    guildIds: string[],
    createdAt: string,
  ): Promise<void> {
    const metadata: NotificationMetadata = { discordId, guildIds, createdAt };
    await this.redisService.set(
      this.getNotificationKey(notificationId),
      JSON.stringify(metadata),
      NOTIFICATION_TTL_SECONDS,
    );
  }

  private getPartyGatheringUserKey(discordId: string): string {
    return `party-gathering:user:${discordId}`;
  }

  private async getNotificationMetadata(
    notificationId: string,
  ): Promise<NotificationMetadata | null> {
    const data = await this.redisService.get(
      this.getNotificationKey(notificationId),
    );
    if (!data) return null;
    try {
      return JSON.parse(data) as NotificationMetadata;
    } catch {
      this.logger.log({
        level: 'error',
        message: `Failed to parse notification metadata for ${notificationId}`,
      });
      return null;
    }
  }

  async sendNotification(discordId: string, data: CreateNotificationDto) {
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
      [
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
        Permission.OWNER,
        Permission.ADMIN,
        Permission.LOOTLOG_MANAGE,
      ],
    );
    if (userGuilds.length === 0) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} has no permission to send notifications`,
      });
      throw new ForbiddenException();
    }
    const guildIds = userGuilds
      .map((g) => g.id)
      .filter((id) => data.guildIds.includes(id));
    if (!guildIds.length) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to send notification to unauthorized guilds: ${data.guildIds}`,
      });
      throw new ForbiddenException();
    }
    const basePayload = {
      ...omit(data, ['guildIds']),
      discordId,
      notificationId,
      createdAt,
    };
    await this.storeNotificationMetadata(
      notificationId,
      discordId,
      guildIds,
      createdAt,
    );

    if (data.message) {
      guildIds.forEach((guildId) => {
        this.emitNotification({ ...basePayload, guildId });
      });
      return { notificationId, guildIds };
    }
    const npcType = getNpcTypeByWt(data.npc.wt, data.npc.prof, data.npc.type);
    guildIds.forEach((guildId) => {
      this.emitNotification({
        ...basePayload,
        guildId,
        npc: { ...data.npc, type: npcType },
      });
    });
    return { notificationId, guildIds };
  }

  async emitNotification(payload: unknown) {
    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_NOTIFICATIONS_SEND,
      payload,
    );
  }

  async volunteer(
    discordId: string,
    notificationId: string,
    data: CreateVolunteerDto,
  ) {
    const metadata = await this.getNotificationMetadata(notificationId);
    if (!metadata) {
      throw new BadRequestException('Notification expired or not found');
    }

    if (data.targetDiscordId !== metadata.discordId) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to volunteer to invalid target ${data.targetDiscordId} for notification ${notificationId}`,
      });
      throw new ForbiddenException('Invalid target');
    }

    const volunteerGuilds =
      await this.guildsService.getGuildsForRequiredPermissions(discordId, [
        Permission.LOOTLOG_NOTIFICATIONS_SEND,
        Permission.OWNER,
        Permission.ADMIN,
        Permission.LOOTLOG_MANAGE,
      ]);

    const hasCommonGuild = volunteerGuilds.some((g) =>
      metadata.guildIds.includes(g.id),
    );
    if (!hasCommonGuild) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to volunteer to notification ${notificationId} but is not a member of notification guilds`,
      });
      throw new ForbiddenException('Not a member of notification guild');
    }

    this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.GUILDS_NOTIFICATIONS_VOLUNTEER,
      {
        notificationId,
        targetDiscordId: data.targetDiscordId,
        volunteerDiscordId: discordId,
        world: data.world,
        character: data.character,
      },
    );
  }

  async sendPartyGathering(discordId: string, data: CreatePartyGatheringDto) {
    const existingGathering = await this.redisService.get(
      this.getPartyGatheringUserKey(discordId),
    );
    if (existingGathering) {
      await this.cancelPartyGatheringByUser(discordId);
    }

    const notificationId = uuid();
    const createdAt = new Date().toISOString();

    if (
      data.minLvl !== undefined &&
      data.maxLvl !== undefined &&
      data.minLvl > data.maxLvl
    ) {
      throw new BadRequestException('minLvl cannot be greater than maxLvl');
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
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} has no permission to send party gathering`,
      });
      throw new ForbiddenException();
    }

    const guildIds = userGuilds
      .map((g) => g.id)
      .filter((id) => data.guildIds.includes(id));

    if (!guildIds.length) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to send party gathering to unauthorized guilds: ${data.guildIds}`,
      });
      throw new ForbiddenException();
    }

    await this.storeNotificationMetadata(
      notificationId,
      discordId,
      guildIds,
      createdAt,
    );

    await this.redisService.set(
      this.getPartyGatheringUserKey(discordId),
      notificationId,
      NOTIFICATION_TTL_SECONDS,
    );

    guildIds.forEach((guildId) => {
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_PARTY_GATHERING,
        {
          guildId,
          discordId,
          notificationId,
          createdAt,
          world: data.world,
          character: data.character,
          description: data.description,
          minLvl: data.minLvl,
          maxLvl: data.maxLvl,
        },
      );
    });

    return { notificationId, guildIds };
  }

  async cancelPartyGathering(discordId: string, notificationId: string) {
    const metadata = await this.getNotificationMetadata(notificationId);
    if (!metadata) {
      throw new BadRequestException('Notification not found or expired');
    }

    if (metadata.discordId !== discordId) {
      this.logger.log({
        level: 'warn',
        message: `User ${discordId} tried to cancel notification ${notificationId} owned by ${metadata.discordId}`,
      });
      throw new ForbiddenException('Not the owner of this notification');
    }

    await this.redisService.del(this.getNotificationKey(notificationId));
    await this.redisService.del(this.getPartyGatheringUserKey(discordId));

    metadata.guildIds.forEach((guildId) => {
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
        { guildId, notificationId },
      );
    });

    return { success: true, guildIds: metadata.guildIds };
  }

  async cancelPartyGatheringByUser(discordId: string) {
    const notificationId = await this.redisService.get(
      this.getPartyGatheringUserKey(discordId),
    );

    if (!notificationId) {
      return { success: true, guildIds: [] };
    }

    const metadata = await this.getNotificationMetadata(notificationId);

    await this.redisService.del(this.getNotificationKey(notificationId));
    await this.redisService.del(this.getPartyGatheringUserKey(discordId));

    const guildIds = metadata?.guildIds ?? [];

    guildIds.forEach((guildId) => {
      this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.GUILDS_PARTY_GATHERING_CANCEL,
        { guildId, notificationId },
      );
    });

    return { success: true, guildIds };
  }
}
