import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "#src/redis/redis.service";
import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
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
  DeleteMembersByGuildIdResult,
  MemberRemovalNotificationTarget,
  MemberWithRoles,
} from "./member.types.js";
import { MembersRepository } from "./members.repository.js";

@Injectable()
export class MemberRemovalService {
  constructor(
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
    private readonly repository: MembersRepository,
    private readonly discordService: DiscordService,
    private readonly amqpConnection: AmqpConnection,
    private readonly redisService: RedisService,
  ) {}

  async deactivateMember(options: {
    discordId: string;
    guildId: string;
  }): Promise<MemberWithRoles> {
    const { discordId, guildId } = options;

    const member = await this.repository.findMemberWithRoles(
      discordId,
      guildId,
    );

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    if (!member.active) {
      throw new BadRequestException(ErrorKey.MEMBER_ALREADY_DEACTIVATED);
    }

    const result = await this.repository.deactivateMember(
      discordId,
      guildId,
      new Date(),
      MEMBER_LAST_DISCORD_STATUS.MANUALLY_DEACTIVATED,
    );
    if (!result) throw new NotFoundException("Member not found");

    await this.notifyMemberRemoved({
      discordId,
      guildId,
      globalUserId: member.globalUserId,
    });

    return result.updated;
  }

  async deactivateMembersMissingFromDiscordGuilds(
    options: DeactivateMembersMissingFromDiscordGuildsOptions,
  ): Promise<number> {
    const { discordId, userId, activeDiscordGuildIds, status } = options;
    const missingMembers = await this.repository.findMissingActiveMembers(
      discordId,
      userId,
      activeDiscordGuildIds,
    );

    if (missingMembers.length === 0) {
      return 0;
    }

    const syncTimestamp = new Date();
    await this.repository.deactivateMembers(
      missingMembers,
      syncTimestamp,
      status,
      true,
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
    _options?: unknown,
  ): Promise<DeleteMembersByGuildIdResult> {
    try {
      const result = await this.repository.deactivateGuildMembers(
        guildId,
        new Date(),
        MEMBER_LAST_DISCORD_STATUS.GUILD_DEACTIVATED,
      );

      this.logger.log({
        level: "info",
        message: `Deactivated ${result.count} members from guild ${guildId}`,
      });
      return {
        count: result.count,
        affectedMembers: result.members.map((member) => ({
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
