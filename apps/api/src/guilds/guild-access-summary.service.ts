import type { RedisService } from "#src/redis/redis.service";
import { Permission } from "@lootlog/schema/permissions";
import type { Logger } from "winston";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import type { MemberDiscordAccessService } from "#src/members/member-discord-access.service";
import type { MemberDiscordRefreshService } from "#src/members/member-discord-refresh.service";
import type { MembersRepository } from "#src/members/members.repository";
import type {
  CurrentUserGuildAccessSummary,
  GuildPermissionMember,
} from "./guilds.service.js";
import type {
  GuildRecord as Guild,
  GuildsRepository,
} from "./guilds.repository.js";

const CACHE_TTL_SECONDS = 30;

export class GuildAccessSummaryService {
  constructor(
    private readonly logger: Pick<Logger, "debug" | "warn">,
    private readonly guildsRepository: GuildsRepository,
    private readonly membersRepository: MembersRepository,
    private readonly memberAccess: Pick<
      MemberDiscordAccessService,
      "isMemberSoftStale"
    >,
    private readonly memberRefresh: Pick<
      MemberDiscordRefreshService,
      "queueMemberRefresh"
    >,
    private readonly redis: RedisService,
  ) {}

  async getCurrentUserAccessibleGuilds(
    discordId: string,
    userId: string,
  ): Promise<CurrentUserGuildAccessSummary[]> {
    const cacheKey = this.cacheKey(discordId, userId);
    const cached =
      await this.redis.getJson<CurrentUserGuildAccessSummary[]>(cacheKey);
    if (cached !== null) {
      this.logger.debug({
        message: "Cache hit for current user accessible guilds",
        cacheKey,
        discordId,
        userId,
      });
      this.queueCachedStaleRefreshes({ discordId, userId, guilds: cached });
      return cached;
    }

    this.logger.debug({
      message: "Cache miss for current user accessible guilds",
      cacheKey,
      discordId,
      userId,
    });
    const requiredPermissions = [Permission.LOOTLOG_ACCESS];
    const guilds = await this.guildsRepository.findForPermissions(
      discordId,
      requiredPermissions,
    );
    if (guilds.length === 0) return [];

    const members = await this.membersRepository.findMembersByUserGuildIds(
      discordId,
      guilds.map((guild) => guild.id),
    );
    this.queueStaleRefreshes({ discordId, userId, guilds, members });
    const result = await this.sortByUserPreferences(
      userId,
      this.buildSummaries({
        discordId,
        guilds,
        members,
        requiredPermissions,
      }).filter((guild) => guild.hasLootlogAccess),
    );
    await this.redis.setJson(cacheKey, result, CACHE_TTL_SECONDS);
    return result;
  }

  async getCurrentUserAccessibleGuildPlainEntries(
    discordId: string,
    userId: string,
  ) {
    const guilds = await this.getCurrentUserAccessibleGuilds(discordId, userId);
    return guilds.map(
      ({
        hasLootlogAccess: _hasLootlogAccess,
        isAccessDataStale: _isAccessDataStale,
        ...guild
      }) => guild,
    );
  }

  private buildSummaries(options: {
    discordId: string;
    guilds: Guild[];
    members: GuildPermissionMember[];
    requiredPermissions: Permission[];
  }): CurrentUserGuildAccessSummary[] {
    const memberByGuildId = new Map(
      options.members.map((member) => [member.guildId, member] as const),
    );
    return options.guilds.map((guild) => {
      const member = memberByGuildId.get(guild.id);
      const isOwner = guild.ownerId === options.discordId;
      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        vanityUrl: guild.vanityUrl,
        ownerId: guild.ownerId,
        publicStatsCardEnabled: guild.publicStatsCardEnabled,
        hasLootlogAccess:
          isOwner || this.hasPermissions(member, options.requiredPermissions),
        isAccessDataStale:
          !isOwner &&
          (member === undefined || this.memberAccess.isMemberSoftStale(member)),
      };
    });
  }

  private hasPermissions(
    member: GuildPermissionMember | undefined,
    requiredPermissions: Permission[],
  ): boolean {
    return Boolean(
      member?.active &&
      member.roles.some((role) =>
        role.permissions.some((permission) =>
          requiredPermissions.includes(permission),
        ),
      ),
    );
  }

  private async sortByUserPreferences<T extends { id: string }>(
    userId: string,
    entries: T[],
  ): Promise<T[]> {
    const guildsOrder = await this.guildsRepository.getGuildOrder(userId);
    if (!guildsOrder) return entries;
    const order = new Map(
      guildsOrder.map((guildId, index) => [guildId, index] as const),
    );
    return [...entries].sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
  }

  private queueCachedStaleRefreshes(options: {
    discordId: string;
    userId: string;
    guilds: CurrentUserGuildAccessSummary[];
  }): void {
    this.queueRefreshes(
      options.guilds
        .filter((guild) => guild.ownerId !== options.discordId)
        .filter((guild) => guild.isAccessDataStale)
        .map((guild) => guild.id),
      options,
      "guild-access-cache-background",
    );
  }

  private queueStaleRefreshes(options: {
    discordId: string;
    userId: string;
    guilds: Guild[];
    members: GuildPermissionMember[];
  }): void {
    const memberByGuildId = new Map(
      options.members.map((member) => [member.guildId, member] as const),
    );
    this.queueRefreshes(
      options.guilds
        .filter((guild) => guild.ownerId !== options.discordId)
        .filter((guild) => {
          const member = memberByGuildId.get(guild.id);
          return Boolean(
            member?.globalUserId && this.memberAccess.isMemberSoftStale(member),
          );
        })
        .map((guild) => guild.id),
      options,
      "guild-access-background",
    );
  }

  private queueRefreshes(
    guildIds: string[],
    identity: { discordId: string; userId: string },
    reason: string,
  ): void {
    if (guildIds.length === 0) return;
    void Promise.all(
      guildIds.map((guildId) =>
        this.memberRefresh.queueMemberRefresh({
          discordId: identity.discordId,
          userId: identity.userId,
          guildId,
          priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
          reason,
        }),
      ),
    ).catch((error) => {
      this.logger.warn({
        message: "Failed to queue stale accessible guild refreshes",
        ...identity,
        error,
      });
    });
  }

  private cacheKey(discordId: string, userId: string): string {
    return `user:${userId}:discord:${discordId}:accessible-guilds`;
  }
}
