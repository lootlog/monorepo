import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { APIGuild } from "discord-api-types/v10";
import { DiscordGuildSyncStatus } from "@lootlog/types";

import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { ChannelsService } from "src/channels/channels.service";
import { discordBotConfig } from "src/config/discord-bot.config";
import {
  type Guild,
  ItemRarity,
  NpcType,
  Permission,
} from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import type { CreateGuildDto } from "src/guilds/dto/create-guild.dto";
import type { DeleteGuildDto } from "src/guilds/dto/delete-guild.dto";
import type { UpdateGuildDto } from "src/guilds/dto/update-guild.dto";
import type { UpdateGuildConfigDto } from "src/guilds/dto/update-guild-config.dto";
import type { UserGuildPermissionsDto } from "src/guilds/dto/user-guild-permissions.dto";
import { ErrorKey } from "src/guilds/enum/error-key.enum";
import { MembersService } from "src/members/members.service";
import { RolesService } from "src/roles/roles.service";
import { generateSlug } from "src/shared/utils/generate-slug";
import { RESTRICTED_VANITY_URLS } from "src/guilds/constants/restricted-vanity-urls";
import { DiscordService } from "src/discord/discord.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { isDiscordAdministrator } from "@lootlog/nest-shared/utils";
import {
  getPermissionsCachePattern,
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
} from "src/shared/constants/cache.constant";
import { MEMBER_REFRESH_PRIORITY } from "src/members/constants/member-refresh-queue.constant";
import { PerfDiagnosticsService } from "src/shared/diagnostics/perf-diagnostics.service";

interface GuildRefreshCandidate {
  guild: Guild;
  isDiscordOwner: boolean;
  hasDiscordAdmin: boolean;
}

export type CurrentUserGuildAccessSummary = Pick<
  Guild,
  "id" | "name" | "icon" | "vanityUrl" | "ownerId"
> & {
  hasLootlogAccess: boolean;
  isAccessDataStale: boolean;
};

type GetGuildDiscordSyncStateOptions = {
  forceRefresh?: boolean;
  refreshIfStale?: boolean;
};

type GuildPermissionMember = {
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

  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly membersService: MembersService,
    private readonly channelsService: ChannelsService,
    private readonly rolesService: RolesService,
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly redisService: RedisService,
    private readonly amqpConnection: AmqpConnection,
    private readonly perfDiagnosticsService: PerfDiagnosticsService,
  ) {
    this.staleAfterMs = discordBotConfig.channelSnapshotStaleSeconds * 1000;
  }

  async getUserGuilds(discordId: string, userId: string, source?: string) {
    if (source === "game") {
      return this.getCurrentUserAccessibleGuildPlainEntries(discordId, userId);
    }

    const guildCandidates = await this.getDiscordLootlogGuildCandidates(
      discordId,
      userId,
    );
    const guilds =
      guildCandidates.length > 0
        ? guildCandidates.map(({ guild }) => guild)
        : await this.getCurrentUserAccessibleGuildPlainEntries(
            discordId,
            userId,
          );

    return this.sortGuildEntriesByUserPreferences(userId, guilds);
  }

  async getCurrentUserGuildAccessSummaries(
    discordId: string,
    userId: string,
  ): Promise<CurrentUserGuildAccessSummary[]> {
    const requiredPermissions = [Permission.LOOTLOG_ACCESS];
    const guildCandidates = await this.getCandidateGuildsForUser(
      discordId,
      userId,
    );

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

  async getCurrentUserAccessibleGuilds(
    discordId: string,
    userId: string,
  ): Promise<CurrentUserGuildAccessSummary[]> {
    const requiredPermissions = [Permission.LOOTLOG_ACCESS];
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
    this.queueStaleAccessibleGuildRefreshes({
      discordId,
      userId,
      guilds,
      members,
    });

    return this.sortGuildEntriesByUserPreferences(
      userId,
      this.buildCurrentUserGuildAccessSummaries({
        discordId,
        guilds,
        members,
        requiredPermissions,
      }).filter((guild) => guild.hasLootlogAccess),
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
    const cacheKey = getGuildCacheKey(idOrVanityURL);
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (error) {
        this.logger.warn({
          message: `Failed to parse cached guild data for key ${cacheKey}`,
          error,
        });
        await this.redisService.del(cacheKey);
      }
    }

    const guild = await this.prisma.guild.findFirst({
      where: {
        active: true,
        OR: [{ id: idOrVanityURL }, { vanityUrl: idOrVanityURL }],
      },
    });

    if (!guild) {
      throw new NotFoundException({ message: ErrorKey.GUILD_NOT_FOUND });
    }

    const guildData = JSON.stringify(guild);
    const cacheOperations = [
      this.redisService.set(
        getGuildCacheKey(guild.id),
        guildData,
        GUILD_CACHE_TTL_SECONDS,
      ),
    ];

    if (guild.vanityUrl) {
      cacheOperations.push(
        this.redisService.set(
          getGuildCacheKey(guild.vanityUrl),
          guildData,
          GUILD_CACHE_TTL_SECONDS,
        ),
      );
    }

    await Promise.all(cacheOperations);

    return guild;
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

  async getGuildsForRequiredPermissions(
    discordId: string,
    requiredPermissions: Permission[],
  ) {
    const guilds = await this.prisma.guild.findMany({
      where: {
        active: true,
        OR: [
          {
            ownerId: discordId,
          },
          {
            members: {
              some: {
                userId: discordId,
                active: true,
                globalUserId: { not: null },
                roles: {
                  some: {
                    permissions: {
                      hasSome: requiredPermissions,
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });

    return guilds;
  }

  async getMultipleGuildsPermissions(discordId: string, guildIds: string[]) {
    const [guilds, members] = await Promise.all([
      this.prisma.guild.findMany({
        where: { id: { in: guildIds }, active: true },
      }),
      this.prisma.member.findMany({
        where: {
          userId: discordId,
          active: true,
          guildId: { in: guildIds },
        },
        include: { roles: true, guild: true },
      }),
    ]);

    const memberMap = new Map(members.map((m) => [m.guildId, m]));
    const allPermissions = Object.values(Permission);

    const result = guilds.map((guild) => {
      const member = memberMap.get(guild.id);

      if (!member) {
        return { guild, permissions: [], roles: [] };
      }

      const permissions =
        discordId === guild.ownerId
          ? allPermissions
          : member.roles.reduce((acc: Permission[], role) => {
              return acc.concat(role.permissions);
            }, []);

      return { guild, permissions, roles: member.roles };
    });

    return result;
  }

  async getUserGuildsWithPermissions(discordId: string, userId?: string) {
    const startedAt = this.perfDiagnosticsService.now();
    const stages: Record<string, number> = {};
    const requiredPermissions = [Permission.LOOTLOG_ACCESS];
    const cacheKey = userId
      ? `user:${userId}:discord:${discordId}:guild-permissions`
      : null;
    let guildCount = 0;
    let memberCount = 0;
    let resultCount = 0;
    const refreshed = false;
    let cacheHit = false;

    try {
      if (cacheKey) {
        const cacheStartedAt = this.perfDiagnosticsService.now();
        const cached = await this.redisService.get(cacheKey);
        stages.cacheRead = this.perfDiagnosticsService.now() - cacheStartedAt;

        if (cached) {
          try {
            const result = JSON.parse(cached) as UserGuildPermissionsDto[];
            cacheHit = true;
            resultCount = result.length;
            return result;
          } catch {
            await this.redisService.del(cacheKey);
          }
        }
      }

      const candidatesStartedAt = this.perfDiagnosticsService.now();
      const guildCandidates = this.toGuildRefreshCandidates(
        await this.getGuildsForRequiredPermissions(
          discordId,
          requiredPermissions,
        ),
      );
      stages.candidateGuilds =
        this.perfDiagnosticsService.now() - candidatesStartedAt;

      const guilds = guildCandidates.map((candidate) => candidate.guild);
      guildCount = guilds.length;

      if (guilds.length === 0) {
        return [];
      }

      const membersStartedAt = this.perfDiagnosticsService.now();
      const members = await this.getGuildMembersForPermissions(
        discordId,
        guilds.map((guild) => guild.id),
      );
      stages.members = this.perfDiagnosticsService.now() - membersStartedAt;
      memberCount = members.length;

      const buildResultStartedAt = this.perfDiagnosticsService.now();
      const result = this.buildGuildPermissionsResult(
        discordId,
        guilds,
        members,
        requiredPermissions,
      );
      stages.buildResult =
        this.perfDiagnosticsService.now() - buildResultStartedAt;
      resultCount = result.length;

      if (cacheKey) {
        const cacheWriteStartedAt = this.perfDiagnosticsService.now();
        await this.redisService.set(
          cacheKey,
          JSON.stringify(result),
          USER_GUILD_PERMISSIONS_CACHE_TTL_SECONDS,
        );
        stages.cacheWrite =
          this.perfDiagnosticsService.now() - cacheWriteStartedAt;
      }

      return result;
    } finally {
      this.perfDiagnosticsService.logSpan(
        "guilds.user_permissions.total",
        this.perfDiagnosticsService.now() - startedAt,
        {
          hasUserId: Boolean(userId),
          guildCount,
          memberCount,
          resultCount,
          refreshed,
          cacheHit,
          stagesMs: this.perfDiagnosticsService.roundStages(stages),
        },
      );
    }
  }

  private async getCandidateGuildsForUser(
    discordId: string,
    userId: string,
  ): Promise<GuildRefreshCandidate[]> {
    try {
      const discordStartedAt = this.perfDiagnosticsService.now();
      const discordGuilds = await this.discordService.getUserGuilds(
        userId,
        discordId,
      );
      this.perfDiagnosticsService.logSpan(
        "guilds.candidate_guilds.discord",
        this.perfDiagnosticsService.now() - discordStartedAt,
        { discordGuildCount: discordGuilds?.length ?? 0 },
      );

      if (!discordGuilds || discordGuilds.length === 0) {
        const fallbackStartedAt = this.perfDiagnosticsService.now();
        const fallbackGuilds = await this.getGuildsForRequiredPermissions(
          discordId,
          [Permission.LOOTLOG_ACCESS],
        );
        this.perfDiagnosticsService.logSpan(
          "guilds.candidate_guilds.fallback_db",
          this.perfDiagnosticsService.now() - fallbackStartedAt,
          { guildCount: fallbackGuilds.length },
        );

        return this.toGuildRefreshCandidates(fallbackGuilds);
      }

      const discordGuildIds = discordGuilds.map((guild) => guild.id);
      const discordGuildMap = new Map(
        discordGuilds.map((guild) => [guild.id, guild] as const),
      );
      const guildStartedAt = this.perfDiagnosticsService.now();
      const guilds = await this.prisma.guild.findMany({
        where: {
          id: { in: discordGuildIds },
          active: true,
        },
      });
      this.perfDiagnosticsService.logSpan(
        "guilds.candidate_guilds.db",
        this.perfDiagnosticsService.now() - guildStartedAt,
        { discordGuildCount: discordGuilds.length, guildCount: guilds.length },
      );

      return guilds.map((guild) => {
        const discordGuild = discordGuildMap.get(guild.id);

        return {
          guild,
          isDiscordOwner: discordGuild
            ? this.isDiscordOwnerGuild(discordGuild, discordId)
            : false,
          hasDiscordAdmin: discordGuild
            ? this.hasDiscordAdministratorAccess(discordGuild)
            : false,
        };
      });
    } catch (error) {
      this.logger.log({
        level: "warn",
        message:
          "Failed to load Discord guild candidates, falling back to cached member permissions",
        discordId,
        userId,
        error,
      });

      const fallbackStartedAt = this.perfDiagnosticsService.now();
      const fallbackGuilds = await this.getGuildsForRequiredPermissions(
        discordId,
        [Permission.LOOTLOG_ACCESS],
      );
      this.perfDiagnosticsService.logSpan(
        "guilds.candidate_guilds.error_fallback_db",
        this.perfDiagnosticsService.now() - fallbackStartedAt,
        { guildCount: fallbackGuilds.length },
      );

      return this.toGuildRefreshCandidates(fallbackGuilds);
    }
  }

  private async getDiscordLootlogGuildCandidates(
    discordId: string,
    userId: string,
  ): Promise<GuildRefreshCandidate[]> {
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

      const discordGuildIds = discordGuilds.map((guild) => guild.id);
      const discordGuildMap = new Map(
        discordGuilds.map((guild) => [guild.id, guild] as const),
      );
      const guilds = await this.prisma.guild.findMany({
        where: {
          id: { in: discordGuildIds },
          active: true,
        },
      });

      return guilds.map((guild) => {
        const discordGuild = discordGuildMap.get(guild.id);

        return {
          guild,
          isDiscordOwner: discordGuild
            ? this.isDiscordOwnerGuild(discordGuild, discordId)
            : false,
          hasDiscordAdmin: discordGuild
            ? this.hasDiscordAdministratorAccess(discordGuild)
            : false,
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

  private async getGuildMembersForPermissions(
    discordId: string,
    guildIds: string[],
  ): Promise<GuildPermissionMember[]> {
    if (guildIds.length === 0) {
      return [];
    }

    return this.prisma.member.findMany({
      where: {
        userId: discordId,
        guildId: { in: guildIds },
      },
      select: {
        guildId: true,
        active: true,
        globalUserId: true,
        lastDiscordSyncAt: true,
        updatedAt: true,
        roles: {
          select: {
            id: true,
            lvlRangeFrom: true,
            lvlRangeTo: true,
            permissions: true,
          },
        },
      },
    });
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
          priorityRank:
            member === undefined
              ? 0
              : !hasPermissions
                ? 1
                : candidate.isDiscordOwner || candidate.hasDiscordAdmin
                  ? 2
                  : 3,
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

    const processCandidate = async (
      candidateIndex: number,
      immediateAttempts: number,
    ): Promise<void> => {
      if (candidateIndex >= candidates.length) {
        return;
      }

      const candidate = candidates[candidateIndex];

      if (immediateAttempts < maxImmediateRefreshes) {
        const refreshResult =
          await this.membersService.refreshGuildMemberWithinBudget({
            discordId,
            guildId: candidate.guildId,
            userId,
            priority: MEMBER_REFRESH_PRIORITY.CONNECT,
            reason: "guild-connect",
          });

        await processCandidate(
          candidateIndex + 1,
          refreshResult.refreshQueued
            ? immediateAttempts
            : immediateAttempts + 1,
        );
        return;
      }

      await this.membersService.queueMemberRefresh({
        discordId,
        guildId: candidate.guildId,
        userId,
        priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
        reason: "guild-connect-background",
      });

      await processCandidate(candidateIndex + 1, immediateAttempts);
    };

    await processCandidate(0, 0);

    return this.getGuildMembersForPermissions(
      discordId,
      guilds.map((guild) => guild.id),
    );
  }

  private filterGuildsByPermissions(
    discordId: string,
    guilds: Guild[],
    members: Array<{
      guildId: string;
      active: boolean;
      roles: Array<{ permissions: Permission[] }>;
    }>,
    requiredPermissions: Permission[],
  ): Guild[] {
    const memberMap = new Map(
      members.map((member) => [member.guildId, member]),
    );

    return guilds.filter((guild) => {
      if (guild.ownerId === discordId) {
        return true;
      }

      return this.memberHasRequiredPermissions(
        memberMap.get(guild.id),
        requiredPermissions,
      );
    });
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
    const userPreferences = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: { guildsOrder: true },
    });

    if (!userPreferences?.guildsOrder) {
      return entries;
    }

    const guildOrderMap = new Map<string, number>(
      userPreferences.guildsOrder.map(
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

      return {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        vanityUrl: guild.vanityUrl,
        ownerId: guild.ownerId,
        hasLootlogAccess:
          isOwner ||
          this.memberHasRequiredPermissions(member, requiredPermissions),
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

  private queueStaleAccessibleGuildRefreshes(options: {
    discordId: string;
    userId: string;
    guilds: Guild[];
    members: GuildPermissionMember[];
  }): void {
    const { discordId, userId, guilds, members } = options;
    const memberByGuildId = new Map(
      members.map((member) => [member.guildId, member] as const),
    );
    const staleGuildIds = guilds
      .filter((guild) => guild.ownerId !== discordId)
      .filter((guild) => {
        const member = memberByGuildId.get(guild.id);
        return Boolean(
          member?.globalUserId && this.membersService.isMemberSoftStale(member),
        );
      })
      .map((guild) => guild.id);

    if (staleGuildIds.length === 0) {
      return;
    }

    void Promise.all(
      staleGuildIds.map((guildId) =>
        this.membersService.queueMemberRefresh({
          discordId,
          guildId,
          userId,
          priority: MEMBER_REFRESH_PRIORITY.BACKGROUND,
          reason: "guild-access-background",
        }),
      ),
    ).catch((error) => {
      this.logger.warn({
        message: "Failed to queue stale accessible guild refreshes",
        discordId,
        userId,
        error,
      });
    });
  }

  private toGuildRefreshCandidates(guilds: Guild[]): GuildRefreshCandidate[] {
    return guilds.map((guild) => ({
      guild,
      isDiscordOwner: false,
      hasDiscordAdmin: false,
    }));
  }

  private isDiscordOwnerGuild(
    discordGuild: APIGuild,
    discordId: string,
  ): boolean {
    const guildData = discordGuild as APIGuild & {
      owner?: boolean;
      owner_id?: string;
    };

    return Boolean(guildData.owner || guildData.owner_id === discordId);
  }

  private hasDiscordAdministratorAccess(discordGuild: APIGuild): boolean {
    try {
      return isDiscordAdministrator(BigInt(discordGuild.permissions));
    } catch {
      return false;
    }
  }

  async updateGuildConfig(guildId: string, data: UpdateGuildConfigDto) {
    if (RESTRICTED_VANITY_URLS.includes(data.vanityUrl)) {
      throw new BadRequestException({
        message: ErrorKey.GUILDS_VANITY_URL_RESTRICTED,
      });
    }

    const oldGuild = await this.prisma.guild.findUnique({
      where: { id: guildId },
      select: { vanityUrl: true },
    });

    const guild = await this.prisma.guild.update({
      where: { id: guildId },
      data: {
        vanityUrl: generateSlug(data.vanityUrl),
      },
    });

    const cacheInvalidations = [
      this.redisService.del(getGuildCacheKey(guildId)),
    ];

    if (oldGuild?.vanityUrl && oldGuild.vanityUrl !== guild.vanityUrl) {
      cacheInvalidations.push(
        this.redisService.del(getGuildCacheKey(oldGuild.vanityUrl)),
      );
    }

    await Promise.all(cacheInvalidations);

    return guild;
  }

  async getWorldsByGuildId(guildId: string) {
    const worlds = await this.prisma.timer.findMany({
      where: { guildId },
      select: { world: true },
      distinct: ["world"],
    });

    return worlds.map((world) => world.world);
  }

  getMultipleGuildsByIds(ids: string[]) {
    return this.prisma.guild.findMany({
      where: { id: { in: ids } },
    });
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
      guild = await this.prisma.guild.upsert({
        where: { id: data.guildId },
        update: {
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
          active: true,
        },
        create: {
          id: data.guildId,
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
          active: true,
        },
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

    const existingGuild = await this.prisma.guild.findUnique({
      where: { id: data.guildId },
    });

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
        this.createDefaultLootlogConfig(data.guildId),
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
      const oldGuild = await this.prisma.guild.findUnique({
        where: { id: data.guildId },
        select: { vanityUrl: true },
      });

      await this.prisma.guild.update({
        where: { id: data.guildId },
        data: {
          name: data.name,
          icon: data.icon,
          ownerId: data.ownerId,
        },
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
      const guild = await this.prisma.guild.findUnique({
        where: { id: guildId },
        select: { vanityUrl: true },
      });
      let deletedMembers = {
        count: 0,
        affectedMembers: [] as Awaited<
          ReturnType<MembersService["deleteMembersByGuildId"]>
        >["affectedMembers"],
      };

      await this.prisma.$transaction(async (tx) => {
        await tx.lootlogConfigNpc.deleteMany({
          where: { lootlogConfigId: guildId },
        });

        await tx.lootlogConfig.deleteMany({ where: { id: guildId } });

        deletedMembers = await this.membersService.deleteMembersByGuildId(
          guildId,
          { tx },
        );
        await this.rolesService.deleteRolesByGuildId(guildId);

        await tx.guild.update({
          where: { id: guildId },
          data: { active: false },
        });
      });

      await Promise.all([
        this.membersService.notifyMembersRemoved(
          deletedMembers.affectedMembers,
        ),
        this.redisService.deleteByPattern(getPermissionsCachePattern(guildId)),
        this.redisService.del(getGuildCacheKey(guildId)),
        guild?.vanityUrl
          ? this.redisService.del(getGuildCacheKey(guild.vanityUrl))
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
    return this.prisma.discordGuildSyncState.findUnique({
      where: { guildId },
    });
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

  private createDefaultLootlogConfig(guildId: string) {
    return this.prisma.lootlogConfig.upsert({
      where: { id: guildId },
      update: {},
      create: {
        id: guildId,
        npcs: {
          createMany: {
            data: Object.values(NpcType).map((npcType) => ({
              npcType,
              allowedRarities: Object.values(ItemRarity),
            })),
            skipDuplicates: true,
          },
        },
      },
      include: { npcs: true },
    });
  }
}
