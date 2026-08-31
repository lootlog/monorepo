import { db as prismaDb } from "#src/prisma/db";
import type { Contract } from "../prisma/contract.js";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import { getNpcTypeByWt } from "@lootlog/types";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { GuildsService } from "#src/guilds/guilds.service";
import type { CreateNotificationDto } from "#src/messaging/dto/create-notification.dto";
import type { CreateVolunteerDto } from "#src/messaging/dto/create-volunteer.dto";
import { Error } from "#src/messaging/enum/error.enum";
import { v4 as uuid } from "uuid";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { RedisService } from "@lootlog/nest-shared/redis";
import { ReadyRoomService } from "#src/messaging/ready-room/ready-room.service";
import { NotificationRateLimiterService } from "#src/messaging/notification-rate-limiter.service";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["NpcType"]["values"][number];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission =
  Contract["storage"]["namespaces"]["public"]["entries"]["valueSet"]["Permission"]["values"][number];

const NOTIFICATION_TTL_SECONDS = 1800; // 30 minutes

type NotificationMetadata = {
  discordId: string;
  guildIds: string[];
  createdAt: string;
};

@Injectable()
export class MessagingService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly amqpConnection: AmqpConnection,
    private readonly guildsService: GuildsService,
    private readonly redisService: RedisService,
    private readonly readyRoomService: ReadyRoomService,
    private readonly notificationRateLimiter: NotificationRateLimiterService,
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
        level: "error",
        message: `Failed to parse notification metadata for ${notificationId}`,
      });
      return null;
    }
  }

  async sendNotification(
    userId: string,
    discordId: string,
    data: CreateNotificationDto,
  ) {
    const rateLimit = await this.notificationRateLimiter.consume(userId);
    if (rateLimit.accepted === false) {
      throw new HttpException(
        {
          message: "NOTIFICATION_RATE_LIMITED",
          retryAfterMs: rateLimit.retryAfterMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

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
        level: "warn",
        message: `User ${discordId} has no permission to send notifications`,
      });
      throw new ForbiddenException();
    }
    const guildIds = userGuilds
      .map((g) => g.id)
      .filter((id) => data.guildIds.includes(id));
    if (!guildIds.length) {
      this.logger.log({
        level: "warn",
        message: `User ${discordId} tried to send notification to unauthorized guilds: ${data.guildIds}`,
      });
      throw new ForbiddenException();
    }
    const { guildIds: _guildIds, ...restData } = data;
    const basePayload = {
      ...restData,
      discordId,
      notificationId,
      createdAt,
    };
    if (data.isGatheringParty) {
      if (!data.character) {
        throw new BadRequestException(
          "Party gathering notifications require a character",
        );
      }
      await this.readyRoomService.create({
        notificationId,
        organizerDiscordId: discordId,
        organizerCharacter: data.character,
        guildIds,
        world: data.world,
      });
    }
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
    const npcType = getNpcTypeByWt(
      NpcType,
      data.npc.wt,
      data.npc.prof,
      data.npc.type,
    );
    guildIds.forEach((guildId) => {
      this.emitNotification({
        ...basePayload,
        guildId,
        npc: { ...data.npc, type: npcType },
      });
    });
    return { notificationId, guildIds };
  }

  emitNotification(payload: unknown) {
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
      throw new BadRequestException("Notification expired or not found");
    }

    if (data.targetDiscordId !== metadata.discordId) {
      this.logger.log({
        level: "warn",
        message: `User ${discordId} tried to volunteer to invalid target ${data.targetDiscordId} for notification ${notificationId}`,
      });
      throw new ForbiddenException("Invalid target");
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
        level: "warn",
        message: `User ${discordId} tried to volunteer to notification ${notificationId} but is not a member of notification guilds`,
      });
      throw new ForbiddenException("Not a member of notification guild");
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
}
