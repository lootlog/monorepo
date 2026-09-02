import {
  Inject,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { DiscordGuildSyncStatus } from "@lootlog/schema/notifications";
import { Permission } from "@lootlog/schema/permissions";

import { APPLICATION_LOGGER } from "#src/shared/logging/logger-token";
import type { Logger } from "winston";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { ChannelsService } from "#src/channels/channels.service";
import { discordBotConfig } from "#src/config/discord-bot.config";
import type { CreateGuildDto } from "#src/guilds/dto/create-guild.dto";
import type { DeleteGuildDto } from "#src/guilds/dto/delete-guild.dto";
import type { UpdateGuildDto } from "#src/guilds/dto/update-guild.dto";
import type { UpdateGuildConfigDto } from "#src/guilds/dto/update-guild-config.dto";
import type { UserGuildPermissionsDto } from "#src/guilds/dto/user-guild-permissions.dto";
import { MembersService } from "#src/members/members.service";
import { RolesService } from "#src/roles/roles.service";
import { DiscordService } from "#src/discord/discord.service";
import { RedisService } from "#src/redis/redis.service";
import { isDiscordAdministrator } from "#src/discord/is-discord-administrator";
import {
  getPermissionsCachePattern,
  getGuildCacheKey,
} from "#src/shared/constants/cache.constant";
import { MEMBER_REFRESH_PRIORITY } from "#src/members/constants/member-refresh-queue.constant";
import {
  UserGuildAccessResolver,
  type GuildRefreshCandidate,
} from "./user-guild-access-resolver.service.js";
import {
  GuildsRepository,
  type GuildRecord as Guild,
} from "./guilds.repository.js";
import { MembersRepository } from "#src/members/members.repository";
import { GuildConfigurationService } from "./guild-configuration.service.js";
import { GuildListMemberRefreshService } from "./guild-list-member-refresh.service.js";
import { GuildAccessSummaryService } from "./guild-access-summary.service.js";

export type CurrentUserGuildAccessSummary = Pick<
  Guild,
  "id" | "name" | "icon" | "vanityUrl" | "ownerId" | "publicStatsCardEnabled"
> & {
  hasLootlogAccess: boolean;
  isAccessDataStale: boolean;
};

type GetGuildDiscordSyncStateOptions = {
  forceRefresh?: boolean;
  refreshIfStale?: boolean;
};

export type GuildPermissionMember = {
  guildId: string;
  active: boolean;
  globalUserId: string | null;
  lastDiscordSyncAt: Date | null;
  updatedAt: Date;
  roles: Array<{
    id: string;
    lvlRangeFrom: number | null;
    lvlRangeTo: number | null;
    permissions: Permission[];
  }>;
};

const USER_GUILD_PERMISSIONS_CACHE_TTL_SECONDS = 60;
@Injectable()
export class GuildsService {
  private readonly staleAfterMs: number;
  private readonly guildConfiguration: GuildConfigurationService;
  private readonly guildListMemberRefresh: GuildListMemberRefreshService;
  private readonly guildAccessSummary: GuildAccessSummaryService;

  constructor(
    @Inject(APPLICATION_LOGGER) private readonly logger: Logger,
    private readonly membersService: MembersService,
    private readonly channelsService: ChannelsService,
    private readonly rolesService: RolesService,
    private readonly guildsRepository: GuildsRepository,
    private readonly membersRepository: MembersRepository,
    private readonly discordService: DiscordService,
    private readonly redisService: RedisService,
    private readonly amqpConnection: AmqpConnection,
    private readonly userGuildAccessResolver: UserGuildAccessResolver,
  ) {
    this.staleAfterMs = discordBotConfig.channelSnapshotStaleSeconds * 1000;
    this.guildConfiguration = new GuildConfigurationService(
      this.guildsRepository,
      this.redisService,
      this.logger,
    );
    this.guildListMemberRefresh = new GuildListMemberRefreshService(
      this.logger,
      this.membersRepository,
      this.membersService,
      this.redisService,
    );
    this.guildAccessSummary = new GuildAccessSummaryService(
      this.logger,
      this.guildsRepository,
      this.membersRepository,
      this.membersService,
      this.membersService,
      this.redisService,
    );
  }

  async getUserGuilds(discordId: string, userId: string, source?: string) {
    if (source === "game") {
      const result = await this.getCurrentUserAccessibleGuildPlainEntries(
        discordId,
        userId,
      );
      this.queueGuildListRefresh(discordId, userId, result);
      return result;
    }

    const guildCandidates =
      await this.userGuildAccessResolver.getCandidateGuildsForUser(
        discordId,
        userId,
      );
    const result = await this.sortGuildEntriesByUserPreferences(
      userId,
      guildCandidates.map(({ guild }) => guild),
    );
    this.queueGuildListRefresh(discordId, userId, result);
    return result;
  }

  private queueGuildListRefresh(
    discordId: string,
    userId: string,
    guilds: ReadonlyArray<{ id: string }>,
  ) {
    void this.guildListMemberRefresh
      .queue(discordId, userId, guilds)
      .catch((error) =>
        this.logger.log({
          level: "error",
          message: "Error queuing stale member refreshes",
          stack: error instanceof Error ? error.stack : String(error),
        }),
      );
  }

  async getCurrentUserGuildAccessSummaries(
    discordId: string,
    userId: string,
  ): Promise<CurrentUserGuildAccessSummary[]> {
    const requiredPermissions = [Permission.LOOTLOG_ACCESS];
    let guildCandidates: GuildRefreshCandidate[];

    try {
      guildCandidates =
        await this.userGuildAccessResolver.getCandidateGuildsForUser(
          discordId,
          userId,
        );
    } catch (error) {
      if (this.userGuildAccessResolver.isDiscordGuildListFallbackError(error)) {
        return this.getCurrentUserGuildAccessSummariesFromLocalFallback({
          discordId,
          userId,
          requiredPermissions,
          error,
        });
      }

      throw error;
    }

    if (guildCandidates.length === 0) {
      return [];
    }

    const members = await this.refreshGuildCandidatesWithinBudget({
      discordId,
      userId,
      guildCandidates,
      members: await this.getGuildMembersForPermissions(
        discordId,
        guildCandidates.map((candidate) => candidate.guild.id),
      ),
      requiredPermissions,
      maxImmediateRefreshes: 2,
    });
    return this.sortGuildEntriesByUserPreferences(
      userId,
      this.buildCurrentUserGuildAccessSummaries({
        discordId,
        guilds: guildCandidates.map((candidate) => candidate.guild),
        members,
        requiredPermissions,
      }),
    );
  }

  private async getCurrentUserGuildAccessSummariesFromLocalFallback(options: {
    discordId: string;
    userId: string;
    requiredPermissions: Permission[];
    error: unknown;
  }): Promise<CurrentUserGuildAccessSummary[]> {
    const { discordId, userId, requiredPermissions, error } = options;
    this.logger.warn({
      message:
        "Discord guild list unavailable, returning stale local guild access summaries",
      discordId,
      userId,
      error,
    });

    const guilds = await this.getGuildsForRequiredPermissions(
      discordId,
      requiredPermissions,
    );

    if (guilds.length === 0) {
      return [];
    }

    const members = await this.getGuildMembersForPermissions(
      discordId,
      guilds.map((guild) => guild.id),
    );
    const summaries = this.buildCurrentUserGuildAccessSummaries({
      discordId,
      guilds,
      members,
      requiredPermissions,
    })
      .filter((guild) => guild.hasLootlogAccess)
      .map((guild) => ({
        ...guild,
        isAccessDataStale: true,
      }));

    return this.sortGuildEntriesByUserPreferences(userId, summaries);
  }

  async getCurrentUserAccessibleGuilds(
    discordId: string,
    userId: string,
  ): Promise<CurrentUserGuildAccessSummary[]> {
    return this.guildAccessSummary.getCurrentUserAccessibleGuilds(
      discordId,
      userId,
    );
  }

  async getManageableUserGuilds(discordId: string, userId: string) {
    try {
      const discordGuilds = await this.discordService.getUserGuilds(
        userId,
        discordId,
      );

      if (!discordGuilds || discordGuilds.length === 0) {
        this.logger.log({
          level: "warn",
          message: `No guilds found for user ${userId} with Discord ID ${discordId}`,
        });
        return [];
      }

      return discordGuilds
        .filter((guild) => {
          return isDiscordAdministrator(BigInt(guild.permissions));
        })
        .map((guild) => {
          return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            ownerId: guild.owner_id,
          };
        });
    } catch (error) {
      if (
        error instanceof HttpException &&
        error.getStatus() === HttpStatus.UNAUTHORIZED
      ) {
        this.logger.log({
          level: "warn",
          message: `User authentication failed for userId: ${userId}, returning empty guilds`,
        });
        return [];
      }
      throw error;
    }
  }

  async getGuildById(idOrVanityURL: string) {
    return this.guildConfiguration.getGuildById(idOrVanityURL);
  }

  async getGuildDiscordSyncStatus(
    guildId: string,
    options: GetGuildDiscordSyncStateOptions = {},
  ) {
    const { forceRefresh = false, refreshIfStale = false } = options;
    const cachedSyncState = await this.loadGuildDiscordSyncState(guildId);

    if (!cachedSyncState) {
      return this.refreshGuildDiscordSync(guildId);
    }

    const isStale = this.shouldRefreshGuildDiscordSync(cachedSyncState, true);

    if (forceRefresh || (refreshIfStale && isStale)) {
      try {
        return await this.refreshGuildDiscordSync(guildId);
      } catch (error) {
        const latestSyncState = await this.loadGuildDiscordSyncState(guildId);

        if (latestSyncState) {
          return latestSyncState;
        }

        if (cachedSyncState) {
          return this.createStaleGuildDiscordSyncState(
            cachedSyncState,
            this.getDiscordSyncErrorMessage(error),
          );
        }

        throw error;
      }
    }

    if (isStale) {
      return this.createStaleGuildDiscordSyncState(cachedSyncState);
    }

    return cachedSyncState;
  }

  private static readonly REFRESH_COOLDOWN_MS = 5 * 60 * 1000;

  async refreshGuildDiscordSync(guildId: string) {
    const existingSyncState = await this.loadGuildDiscordSyncState(guildId);

    if (existingSyncState) {
      const elapsed = Date.now() - existingSyncState.updatedAt.getTime();

      if (elapsed < GuildsService.REFRESH_COOLDOWN_MS) {
        throw new HttpException(
          "Discord sync can only be refreshed once every 5 minutes",
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    const { syncState } =
      await this.channelsService.refreshGuildDiscordChannels(guildId);

    if (!syncState) {
      throw new NotFoundException("Discord sync state not found");
    }

    return syncState;
  }

  async hasRequiredGuildPermissions(guildId: string) {
    try {
      const syncState = await this.getGuildDiscordSyncStatus(guildId, {
        refreshIfStale: false,
      });

      return syncState.hasRequiredPermissions;
    } catch (error) {
      if (error instanceof NotFoundException) {
        return false;
      }

      throw error;
    }
  }

  getGuildsForRequiredPermissions(
    discordId: string,
    requiredPermissions: Permission[],
  ) {
    return this.guildsRepository.findForPermissions(
      discordId,
      requiredPermissions,
    );
  }

  async getMultipleGuildsPermissions(discordId: string, guildIds: string[]) {
    const [guilds, members] = await Promise.all([
      this.guildsRepository.findByIds(guildIds, true),
      this.membersRepository.findMembersByUserGuildIds(
        discordId,
        guildIds,
        true,
      ),
    ]);

    const memberMap = new Map(members.map((m) => [m.guildId, m]));
    const allPermissions = Object.values(Permission);

    const result = guilds.map((guild) => {
      const member = memberMap.get(guild.id);

      if (!member) {
        return { guild, permissions: [], roles: [] };
      }

      const isOwner = discordId === guild.ownerId;
      const permissions = isOwner
        ? allPermissions
        : (member?.roles.reduce((acc: Permission[], role) => {
            return acc.concat(role.permissions);
          }, []) ?? []);

      return { guild, permissions, roles: member?.roles ?? [] };
    });

    return result;
  }

  async getUserGuildsWithPermissions(discordId: string, userId?: string) {
    const requiredPermissions = [Permission.LOOTLOG_ACCESS];
    const cacheKey = userId
      ? `user:${userId}:discord:${discordId}:guild-permissions`
      : null;

    if (cacheKey) {
      const cached =
        await this.redisService.getJson<UserGuildPermissionsDto[]>(cacheKey);

      if (cached !== null) {
        this.logger.debug({
          message: "Cache hit for user guild permissions",
          cacheKey,
          discordId,
          userId,
        });
        return cached;
      }

      this.logger.debug({
        message: "Cache miss for user guild permissions",
        cacheKey,
        discordId,
        userId,
      });
    }

    const guildCandidates = this.toGuildRefreshCandidates(
      await this.getGuildsForRequiredPermissions(
        discordId,
        requiredPermissions,
      ),
    );
    const guilds = guildCandidates.map((candidate) => candidate.guild);

    if (guilds.length === 0) {
      return [];
    }

    const members = await this.getGuildMembersForPermissions(
      discordId,
      guilds.map((guild) => guild.id),
    );

    const result = this.buildGuildPermissionsResult(
      discordId,
      guilds,
      members,
      requiredPermissions,
    );

    if (cacheKey) {
      await this.redisService.setJson(
        cacheKey,
        result,
        USER_GUILD_PERMISSIONS_CACHE_TTL_SECONDS,
      );
    }

    return result;
  }

  private getGuildMembersForPermissions(
    discordId: string,
    guildIds: string[],
  ): Promise<GuildPermissionMember[]> {
    if (guildIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.membersRepository.findMembersByUserGuildIds(
      discordId,
      guildIds,
    );
  }

  private async refreshGuildCandidatesWithinBudget(options: {
    discordId: string;
    userId: string;
    guildCandidates: GuildRefreshCandidate[];
    members: GuildPermissionMember[];
    requiredPermissions: Permission[];
    maxImmediateRefreshes: number;
  }) {
    const {
      discordId,
      userId,
      guildCandidates,
      members,
      requiredPermissions,
      maxImmediateRefreshes,
    } = options;

    const guilds = guildCandidates.map((candidate) => candidate.guild);
    const memberMap = new Map(
      members.map((member) => [member.guildId, member]),
    );
    const candidates = guildCandidates
      .map((candidate) => {
        const member = memberMap.get(candidate.guild.id);
        const hasPermissions = this.memberHasRequiredPermissions(
          member,
          requiredPermissions,
        );
        const softStale =
          !member ||
          !member.active ||
          this.membersService.isMemberSoftStale(member);

        if (!softStale) {
          return null;
        }

        return {
          guildId: candidate.guild.id,
          priorityRank: this.getGuildRefreshPriorityRank({
            candidate,
            member,
            hasPermissions,
          }),
        };
      })
      .filter((candidate) => candidate !== null)
      .sort(
        (a, b) =>
          a.priorityRank - b.priorityRank || a.guildId.localeCompare(b.guildId),
      );

    if (candidates.length === 0) {
      return members;
    }

    let immediateAttempts = 0;

    for (const candidate of candidates) {
      if (immediateAttempts < maxImmediateRefreshes) {
        const refreshResult =
          // eslint-disable-next-line no-await-in-loop -- refresh attempts are intentionally sequential
          await this.membersService.refreshGuildMemberWithinBudget({
            discordId,
            guildId: candidate.guildId,
            userId,
            priority: MEMBER_REFRESH_PRIORITY.CONNECT,
            reason: "guild-connect",
          });

        if (!refreshResult.refreshQueued) {
          immediateAttempts += 1;
        }
        continue;
      }

      // eslint-disable-next-line no-await-in-loop -- queueing stays sequential to preserve ordering
      await this.membersService.queueMemberRefresh({
        discordId,
        guildId: candidate.guildId,
        userId,
        priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: "guild-connect-background",
      });
    }

    return this.getGuildMembersForPermissions(
      discordId,
      guilds.map((guild) => guild.id),
    );
  }

  private getGuildRefreshPriorityRank(options: {
    candidate: GuildRefreshCandidate;
    member: GuildPermissionMember | undefined;
    hasPermissions: boolean;
  }): number {
    const { candidate, member, hasPermissions } = options;

    if (!member) {
      return 0;
    }

    if (!hasPermissions) {
      return 1;
    }

    if (candidate.isDiscordOwner || candidate.hasDiscordAdmin) {
      return 2;
    }

    return 3;
  }

  private buildGuildPermissionsResult(
    discordId: string,
    guilds: Guild[],
    members: Array<{
      guildId: string;
      active: boolean;
      roles: Array<{
        id: string;
        lvlRangeFrom: number | null;
        lvlRangeTo: number | null;
        permissions: Permission[];
      }>;
    }>,
    requiredPermissions: Permission[],
  ) {
    const memberMap = new Map(
      members.map((member) => [member.guildId, member]),
    );
    const allPermissions = Object.values(Permission);

    return guilds
      .map((guild) => {
        const member = memberMap.get(guild.id);
        const isOwner = guild.ownerId === discordId;

        if (isOwner) {
          return {
            guild: { id: guild.id, ownerId: guild.ownerId },
            roles: [
              {
                id: "owner",
                lvlRangeFrom: 0,
                lvlRangeTo: 999,
                permissions: allPermissions,
              },
            ],
          };
        }

        if (!this.memberHasRequiredPermissions(member, requiredPermissions)) {
          return null;
        }

        return {
          guild: { id: guild.id, ownerId: guild.ownerId },
          roles: member?.roles
            .map((role) => ({
              id: role.id,
              lvlRangeFrom: role.lvlRangeFrom,
              lvlRangeTo: role.lvlRangeTo,
              permissions: role.permissions,
            }))
            .filter((role) => role.permissions.length > 0),
        };
      })
      .filter((item) => item !== null);
  }

  private memberHasRequiredPermissions(
    member:
      | {
          active: boolean;
          roles: Array<{ permissions: Permission[] }>;
        }
      | undefined,
    requiredPermissions: Permission[],
  ): boolean {
    if (!member?.active) {
      return false;
    }

    return member.roles.some((role) =>
      role.permissions.some((permission) =>
        requiredPermissions.includes(permission),
      ),
    );
  }

  private async sortGuildEntriesByUserPreferences<T extends { id: string }>(
    userId: string,
    entries: T[],
  ): Promise<T[]> {
    const guildsOrder = await this.guildsRepository.getGuildOrder(userId);

    if (!guildsOrder) {
      return entries;
    }

    const guildOrderMap = new Map<string, number>(
      guildsOrder.map(
        (guildId: string, index: number) => [guildId, index] as const,
      ),
    );

    return [...entries].sort((leftEntry, rightEntry) => {
      const leftIndex =
        guildOrderMap.get(leftEntry.id) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex =
        guildOrderMap.get(rightEntry.id) ?? Number.MAX_SAFE_INTEGER;

      return leftIndex - rightIndex;
    });
  }

  private buildCurrentUserGuildAccessSummaries(options: {
    discordId: string;
    guilds: Guild[];
    members: GuildPermissionMember[];
    requiredPermissions: Permission[];
  }): CurrentUserGuildAccessSummary[] {
    const { discordId, guilds, members, requiredPermissions } = options;
    const memberByGuildId = new Map(
      members.map((member) => [member.guildId, member] as const),
    );

    return guilds.map((guild) => {
      const member = memberByGuildId.get(guild.id);
      const isOwner = guild.ownerId === discordId;
      const hasLootlogAccess =
        isOwner ||
        this.memberHasRequiredPermissions(member, requiredPermissions);

      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        vanityUrl: guild.vanityUrl,
        ownerId: guild.ownerId,
        publicStatsCardEnabled: guild.publicStatsCardEnabled,
        hasLootlogAccess,
        isAccessDataStale:
          !isOwner &&
          (member === undefined ||
            this.membersService.isMemberSoftStale(member)),
      };
    });
  }

  private async getCurrentUserAccessibleGuildPlainEntries(
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

  private toGuildRefreshCandidates(guilds: Guild[]): GuildRefreshCandidate[] {
    return guilds.map((guild) => ({
      guild,
      isDiscordOwner: false,
      hasDiscordAdmin: false,
    }));
  }

  async updateGuildConfig(guildId: string, data: UpdateGuildConfigDto) {
    return this.guildConfiguration.updateGuildConfig(guildId, data);
  }

  async getWorldsByGuildId(guildId: string) {
    return this.guildConfiguration.getWorldsByGuildId(guildId);
  }

  getMultipleGuildsByIds(ids: string[]) {
    return this.guildsRepository.findByIds(ids);
  }

  async createGuild(data: CreateGuildDto) {
    this.logger.log({
      level: "info",
      message: `createGuild called`,
      input: JSON.stringify({
        guildId: data.guildId,
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
        rolesCount: data.roles?.length,
      }),
    });

    let guild;

    try {
      guild = await this.guildsRepository.upsert({
        id: data.guildId,
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
      });

      this.logger.log({
        level: "info",
        message: `Guild upsert result`,
        guildId: data.guildId,
        result: JSON.stringify(guild),
      });
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to upsert guild ${data.guildId}`,
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }

    const existingGuild = await this.guildsRepository.findById(data.guildId);

    this.logger.log({
      level: "info",
      message: `Post-upsert verification for guild ${data.guildId}`,
      found: !!existingGuild,
      active: existingGuild?.active,
      result: JSON.stringify(existingGuild),
    });

    try {
      const [rolesResult, lootlogResult] = await Promise.all([
        this.rolesService.bulkCreateRoles(data.guildId, data.roles),
        this.guildsRepository.ensureDefaultLootlogConfig(data.guildId),
      ]);

      this.logger.log({
        level: "info",
        message: `Roles and lootlog config created for guild ${data.guildId}`,
        rolesResult: JSON.stringify(rolesResult),
        lootlogResult: JSON.stringify(lootlogResult),
      });
    } catch (error) {
      this.logger.log({
        level: "error",
        message: `Failed to create roles or lootlog config for guild ${data.guildId}`,
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }

    await this.channelsService.markGuildSyncStale(data.guildId);

    this.logger.log({
      level: "info",
      message: `createGuild completed for ${data.guildId}`,
    });

    return guild;
  }

  async updateGuild(data: UpdateGuildDto) {
    try {
      const oldGuild = await this.guildsRepository.findById(data.guildId);

      await this.guildsRepository.update(data.guildId, {
        name: data.name,
        icon: data.icon,
        ownerId: data.ownerId,
      });

      await Promise.all([
        this.redisService.deleteByPattern(
          getPermissionsCachePattern(data.guildId),
        ),
        this.redisService.del(getGuildCacheKey(data.guildId)),
        oldGuild?.vanityUrl
          ? this.redisService.del(getGuildCacheKey(oldGuild.vanityUrl))
          : Promise.resolve(),
      ]);
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to update guild",
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }
  }

  async deleteGuild({ guildId }: DeleteGuildDto) {
    try {
      const deletion = await this.guildsRepository.deleteOrganization(guildId);

      await Promise.all([
        this.membersService.notifyMembersRemoved(deletion.affectedMembers),
        this.redisService.deleteByPattern(getPermissionsCachePattern(guildId)),
        this.redisService.del(getGuildCacheKey(guildId)),
        deletion.vanityUrl
          ? this.redisService.del(getGuildCacheKey(deletion.vanityUrl))
          : Promise.resolve(),
      ]);
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Failed to delete guild",
        error: error instanceof Error ? error.stack : error,
      });
      throw error;
    }
  }

  private loadGuildDiscordSyncState(guildId: string) {
    return this.guildsRepository.findSyncState(guildId);
  }

  private shouldRefreshGuildDiscordSync(
    syncState: { updatedAt: Date; status: string } | null,
    refreshIfStale: boolean,
  ) {
    if (!refreshIfStale) {
      return false;
    }

    if (!syncState) {
      return true;
    }

    if (syncState.status === DiscordGuildSyncStatus.SYNCING) {
      return false;
    }

    if (syncState.status === DiscordGuildSyncStatus.STALE) {
      return true;
    }

    return Date.now() - syncState.updatedAt.getTime() > this.staleAfterMs;
  }

  private getDiscordSyncErrorMessage(error: unknown) {
    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown Discord sync error";
  }

  private createStaleGuildDiscordSyncState(
    syncState: {
      guildId: string;
      status: string;
      hasRequiredPermissions: boolean;
      requiredPermissions: string[];
      grantedPermissions: string[];
      missingPermissions: string[];
      channelCount: number;
      selectableChannelCount: number;
      lastAttemptAt: Date | null;
      lastSuccessAt: Date | null;
      lastError: string | null;
      createdAt: Date;
      updatedAt: Date;
    },
    lastError?: string,
  ) {
    if (
      syncState.status === DiscordGuildSyncStatus.NOT_FOUND ||
      syncState.status === DiscordGuildSyncStatus.FAILED
    ) {
      return syncState;
    }

    return {
      ...syncState,
      status: DiscordGuildSyncStatus.STALE,
      lastError:
        lastError ?? syncState.lastError ?? "Discord sync status is stale",
    };
  }
}
