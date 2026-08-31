import { and, not, or } from "@prisma/orm-family-sql/orm-client";
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
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { PrismaService } from "#src/db/prisma.service";
import { attachRolesToMembers, setMemberRoles } from "#src/db/many-to-many";
import { DiscordService } from "#src/discord/discord.service";
import { RoutingKey } from "#src/enum/routing-key.enum";
import {
  getMemberReadCachePattern,
  getPermissionsCacheKey,
  getUserLootlogConfigCachePattern,
} from "#src/shared/constants/cache.constant";
import { MEMBER_LAST_DISCORD_STATUS } from "./constants/member-discord-status.constant.js";
import { ErrorKey } from "./enum/error-key.enum.js";
import type {
  DeactivateMembersMissingFromDiscordGuildsOptions,
  DeleteMembersByGuildIdOptions,
  DeleteMembersByGuildIdResult,
  MemberRemovalNotificationTarget,
  MemberWithRoles,
} from "./member.types.js";

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

    const memberRow = await this.prisma.db.orm.public.Member.where((row) =>
      and(row.userId.eq(discordId), row.guildId.eq(guildId)),
    ).first();
    const member = memberRow
      ? (await attachRolesToMembers(this.prisma.db, [memberRow]))[0]
      : null;

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    if (!member.active) {
      throw new BadRequestException(ErrorKey.MEMBER_ALREADY_DEACTIVATED);
    }

    const deactivatedMember = await this.prisma.db.transaction(
      async (transaction) => {
        const updatedMember = await transaction.orm.public.Member.where((row) =>
          row.id.eq(member.id),
        ).update({
          active: false,
          lastDiscordAttemptAt: new Date(),
          lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.MANUALLY_DEACTIVATED,
          updatedAt: new Date(),
        });
        await setMemberRoles(transaction, member.id, []);
        return { ...updatedMember, roles: [] };
      },
    );

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
    const missingMembers = await this.prisma.db.orm.public.Member.where((row) =>
      and(
        row.userId.eq(discordId),
        row.globalUserId.eq(userId),
        row.active.eq(true),
        not(row.guildId.in(activeDiscordGuildIds)),
        row.guild.some((related) => related.active.eq(true)),
      ),
    )
      .select("userId", "guildId", "globalUserId")
      .all();

    if (missingMembers.length === 0) {
      return 0;
    }

    const syncTimestamp = new Date();
    await this.prisma.db.transaction(async (transaction) => {
      for (const member of missingMembers) {
        const updatedMember = await transaction.orm.public.Member.where((row) =>
          and(row.userId.eq(member.userId), row.guildId.eq(member.guildId)),
        ).update({
          active: false,
          lastDiscordAttemptAt: syncTimestamp,
          lastDiscordSyncAt: syncTimestamp,
          lastDiscordStatus: status,
          updatedAt: syncTimestamp,
        });
        await setMemberRoles(transaction, updatedMember.id, []);
      }
    });

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
    const client = options?.tx ?? this.prisma.db;

    try {
      const affectedMembers = await client.orm.public.Member.where((row) =>
        and(row.guildId.eq(guildId), row.active.eq(true)),
      )
        .select("userId", "guildId", "globalUserId")
        .all();

      const result = await client.orm.public.Member.where((row) =>
        and(row.guildId.eq(guildId), row.active.eq(true)),
      ).updateAndCount({
        active: false,
        lastDiscordAttemptAt: new Date(),
        lastDiscordStatus: MEMBER_LAST_DISCORD_STATUS.GUILD_DEACTIVATED,
        updatedAt: new Date(),
      });

      this.logger.log({
        level: "info",
        message: `Deactivated ${result} members from guild ${guildId}`,
      });
      return {
        count: result,
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
      this.redisService.deleteByPattern(
        getMemberReadCachePattern(member.guildId),
      ),
    ];

    if (member.globalUserId) {
      operations.push(
        this.discordService.clearGuildMemberDataCache({
          discordId: member.discordId,
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
