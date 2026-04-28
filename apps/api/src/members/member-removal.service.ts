import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "@lootlog/nest-shared/redis";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { PrismaService } from "src/db/prisma.service";
import { DiscordService } from "src/discord/discord.service";
import { RoutingKey } from "src/enum/routing-key.enum";
import {
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "src/shared/constants/cache.constant";
import { MEMBER_LAST_DISCORD_STATUS } from "./constants/member-discord-status.constant";
import { ErrorKey } from "./enum/error-key.enum";
import type {
  DeactivateMembersMissingFromDiscordGuildsOptions,
  DeleteMembersByGuildIdOptions,
  DeleteMembersByGuildIdResult,
  MemberRemovalNotificationTarget,
  MemberWithRoles,
} from "./member.types";

@Injectable()
export class MemberRemovalService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
  ) {}

  async deactivateMember(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberWithRoles> {
    const { discordId, guildId } = options;

    const member = await this.prisma.member.findUnique({
      where: { memberId: { userId: discordId, guildId } },
      include: { roles: true },
    });

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    if (!member.active) {
      throw new BadRequestException(ErrorKey.MEMBER_ALREADY_DEACTIVATED);
    }

    const deactivatedMember = await this.prisma.member.update({
      where: { memberId: { userId: discordId, guildId } },
      data: {
        active: false,
        lastDiscordAttemptAt: new Date(),
        lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.MANUALLY_DEACTIVATED,
        roles: { set: [] },
      },
      include: { roles: true },
    });

    await this.notifyMemberRemoved({
      discordId,
      guildId,
      globalUserId: member.globalUserId,
    });

    return deactivatedMember;
  }

  async deactivateMembersMissingFromDiscordGuilds(
    options: DeactivateMembersMissingFromDiscordGuildsOptions,
  ): Promise<number> {
    const { discordId, userId, activeDiscordGuildIds, status } = options;
    const missingMembers = await this.prisma.member.findMany({
      where: {
        userId: discordId,
        globalUserId: userId,
        active: true,
        guildId: { notIn: activeDiscordGuildIds },
        guild: { active: true },
      },
      select: {
        userId: true,
        guildId: true,
        globalUserId: true,
      },
    });

    if (missingMembers.length === 0) {
      return 0;
    }

    const syncTimestamp = new Date();
    await Promise.all(
      missingMembers.map((member) =>
        this.prisma.member.update({
          where: {
            memberId: { userId: member.userId, guildId: member.guildId },
          },
          data: {
            active: false,
            lastDiscordAttemptAt: syncTimestamp,
            lastDiscordSyncAt: syncTimestamp,
            lastDiscordStatus: status,
            roles: { set: [] },
          },
        }),
      ),
    );

    await this.notifyMembersRemoved(
      missingMembers.map((member) => ({
        discordId: member.userId,
        guildId: member.guildId,
        globalUserId: member.globalUserId,
      })),
    );

    return missingMembers.length;
  }

  async deleteMembersByGuildId(
    guildId: string,
    options?: DeleteMembersByGuildIdOptions,
  ): Promise<DeleteMembersByGuildIdResult> {
    const client = options?.tx ?? this.prisma;

    try {
      const affectedMembers = await client.member.findMany({
        where: {
          guildId,
          active: true,
        },
        select: {
          userId: true,
          guildId: true,
          globalUserId: true,
        },
      });

      const result = await client.member.updateMany({
        where: {
          guildId,
          active: true,
        },
        data: {
          active: false,
          lastDiscordAttemptAt: new Date(),
          lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.GUILD_DEACTIVATED,
        },
      });

      this.logger.log({
        level: "info",
        message: `Deactivated ${result.count} members from guild ${guildId}`,
      });
      return {
        count: result.count,
        affectedMembers: affectedMembers.map((member) => ({
          discordId: member.userId,
          guildId: member.guildId,
          globalUserId: member.globalUserId,
        })),
      };
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to deactivate members for guild ${guildId}`,
        stack: (error as Error).stack,
      });
      throw error;
    }
  }

  async notifyMembersRemoved(
    members: MemberRemovalNotificationTarget[],
    batchSize = 25,
  ): Promise<void> {
    for (let index = 0; index < members.length; index += batchSize) {
      const batch = members.slice(index, index + batchSize);
      // eslint-disable-next-line no-await-in-loop -- batches are intentionally sequential to cap fan-out
      await Promise.all(
        batch.map((member) => this.notifyMemberRemoved(member)),
      );
    }
  }

  async notifyMemberRemoved(
    member: MemberRemovalNotificationTarget,
  ): Promise<void> {
    const operations: Promise<unknown>[] = [
      this.redisService.deleteByPattern(
        getUserLootlogConfigCachePattern(member.discordId),
      ),
    ];

    if (member.globalUserId) {
      operations.push(
        this.discordService.clearGuildMemberDataCache({
          guildId: member.guildId,
          userId: member.globalUserId,
        }),
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_MEMBERS_REMOVE,
          {
            id: member.discordId,
            discordId: member.discordId,
            userId: member.globalUserId,
            guildId: member.guildId,
          },
        ),
        this.redisService.del(
          getPermissionsCacheKey(member.globalUserId, member.guildId),
        ),
      );
    }

    await Promise.all(operations);
  }
}
