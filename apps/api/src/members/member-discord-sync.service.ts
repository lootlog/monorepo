import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "@lootlog/nest-shared/redis";
import type { APIGuildMember } from "discord-api-types/v10";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { DiscordRateLimiterService } from "src/discord/discord-rate-limiter.service";
import { DiscordService } from "src/discord/discord.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import {
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "src/shared/constants/cache.constant";
import {
  getTransientMemberSyncStatus,
  MEMBER_DISCORD_SYNC_STATUS,
} from "./member-discord-sync-status";
import { MemberRemovalService } from "./member-removal.service";
import type { MemberSyncResult, MemberWithRoles } from "./member.types";

@Injectable()
export class MemberDiscordSyncService {
  private readonly MEMBER_RATE_LIMIT_ENDPOINT = "guild-member";

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly rateLimiter: DiscordRateLimiterService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
    private readonly memberRemovalService: MemberRemovalService,
  ) {}

  async syncMemberFromDiscord(options: {
    discordId: string;
    guildId: string;
    userId: string;
    throwOnUnexpectedError?: boolean;
  }): Promise<MemberSyncResult> {
    const {
      discordId,
      guildId,
      userId,
      throwOnUnexpectedError = false,
    } = options;

    try {
      const discordMember = await this.discordService.getGuildMember({
        guildId,
        userId,
        discordId,
      });

      if (!discordMember) {
        await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.ERROR,
        });

        this.logger.log({
          level: "warn",
          message:
            "Discord API returned null while refreshing member, keeping cached state",
          guildId,
          userId: discordId,
        });

        return {
          member: null,
          status: MEMBER_DISCORD_SYNC_STATUS.ERROR,
          nextRefreshAt: null,
        };
      }

      const member = await this.createOrUpdateMember({
        ...discordMember,
        guildId,
        globalUserId: userId,
      });

      return {
        member,
        status: MEMBER_DISCORD_SYNC_STATUS.SUCCESS,
        nextRefreshAt: null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        const member = await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.NOT_FOUND,
          deactivate: true,
          markSynced: true,
        });
        return {
          member,
          status: MEMBER_DISCORD_SYNC_STATUS.NOT_FOUND,
          error,
          nextRefreshAt: null,
        };
      }

      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.UNAUTHORIZED
      ) {
        this.logger.log({
          level: "warn",
          message:
            "User authentication failed (token expired/invalid), deactivating member",
          guildId,
          userId: discordId,
        });

        const member = await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED,
          deactivate: true,
        });
        return {
          member,
          status: MEMBER_DISCORD_SYNC_STATUS.UNAUTHORIZED,
          error,
          nextRefreshAt: null,
        };
      }

      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
      ) {
        const nextRefreshAt = await this.rateLimiter.getNextAvailableAtForUser(
          userId,
          this.MEMBER_RATE_LIMIT_ENDPOINT,
        );

        await this.markMemberSyncAttempt({
          discordId,
          guildId,
          status: MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED,
        });

        this.logger.log({
          level: "warn",
          message: "Discord rate limited member refresh, keeping cached state",
          guildId,
          userId,
          nextRefreshAt,
        });

        return {
          member: null,
          status: MEMBER_DISCORD_SYNC_STATUS.RATE_LIMITED,
          error,
          nextRefreshAt,
        };
      }

      const transientStatus = getTransientMemberSyncStatus(error);
      if (
        transientStatus === MEMBER_DISCORD_SYNC_STATUS.AUTH_SERVICE_UNAVAILABLE
      ) {
        this.logger.log({
          level: "warn",
          message: "Auth service unavailable, keeping cached member state",
          guildId,
          userId,
        });
      } else {
        this.logger.log({
          level: "error",
          message: "Failed to fetch member from Discord",
          guildId,
          userId: discordId,
          status: transientStatus,
          stack: (error as Error).stack,
        });
      }

      await this.markMemberSyncAttempt({
        discordId,
        guildId,
        status: transientStatus,
      });

      if (throwOnUnexpectedError) {
        throw error;
      }

      return {
        member: null,
        status: transientStatus,
        error,
        nextRefreshAt: null,
      };
    }
  }

  async createOrUpdateMember({
    guildId,
    avatar,
    nick,
    banner,
    roles: roleIds,
    user,
    globalUserId,
  }: APIGuildMember & {
    guildId: string;
    globalUserId: string;
  }): Promise<MemberWithRoles> {
    const { id } = user;
    const syncTimestamp = new Date();

    try {
      const existingRoleIds =
        roleIds.length > 0
          ? (
              await this.prisma.role.findMany({
                where: { id: { in: roleIds } },
                select: { id: true },
              })
            ).map((role) => role.id)
          : [];

      const memberName = nick ?? user.global_name ?? user.username;
      const memberAvatar = avatar ?? user.avatar;

      const member = await this.prisma.member.upsert({
        where: { memberId: { userId: id, guildId } },
        update: {
          avatar: memberAvatar,
          banner,
          name: memberName,
          active: true,
          globalUserId,
          lastDiscordAttemptAt: syncTimestamp,
          lastDiscordSyncAt: syncTimestamp,
          lastDiscordStatus: MEMBER_DISCORD_SYNC_STATUS.SUCCESS,
          roles: { set: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        create: {
          userId: id,
          guild: { connect: { id: guildId } },
          avatar: memberAvatar,
          active: true,
          name: memberName,
          globalUserId,
          banner,
          lastDiscordAttemptAt: syncTimestamp,
          lastDiscordSyncAt: syncTimestamp,
          lastDiscordStatus: MEMBER_DISCORD_SYNC_STATUS.SUCCESS,
          roles: { connect: existingRoleIds.map((roleId) => ({ id: roleId })) },
        },
        include: { roles: true },
      });

      await Promise.all([
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_MEMBERS_UPDATE,
          {
            id: id,
            discordId: id,
            userId: globalUserId,
            guildId,
          },
        ),
        this.redisService.del(getPermissionsCacheKey(globalUserId, guildId)),
        this.redisService.deleteByPattern(getUserLootlogConfigCachePattern(id)),
      ]);

      return member;
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to create/update member ${id}`,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  private async markMemberSyncAttempt(options: {
    discordId: string;
    guildId: string;
    status: string;
    deactivate?: boolean;
    markSynced?: boolean;
  }): Promise<MemberWithRoles | null> {
    const {
      discordId,
      guildId,
      status,
      deactivate = false,
      markSynced = false,
    } = options;
    const existingMember = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId },
      },
    });

    if (!existingMember) {
      return null;
    }

    const attemptTimestamp = new Date();
    const member = await this.prisma.member.update({
      where: {
        memberId: { userId: discordId, guildId },
      },
      data: {
        lastDiscordAttemptAt: attemptTimestamp,
        lastDiscordStatus: status,
        ...(markSynced ? { lastDiscordSyncAt: attemptTimestamp } : {}),
        ...(deactivate
          ? {
              active: false,
              roles: { set: [] },
            }
          : {}),
      },
      include: { roles: true },
    });

    if (deactivate && existingMember.active) {
      await this.memberRemovalService.notifyMemberRemoved({
        discordId,
        guildId,
        globalUserId: existingMember.globalUserId,
      });
    }

    return member;
  }
}
