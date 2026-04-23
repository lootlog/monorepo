import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  forwardRef,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { type Guild, Permission } from "src/generated/prisma/client";
import { PrismaService } from "src/db/prisma.service";
import { MembersService } from "src/members/members.service";
import { ErrorKey } from "src/guilds/enum/error-key.enum";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  getPermissionsCacheKey,
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
  PERMISSIONS_CACHE_TTL_SECONDS,
} from "src/shared/constants/cache.constant";
import { PerfDiagnosticsService } from "src/shared/diagnostics/perf-diagnostics.service";

type GuildLookupResult = {
  guild: Guild;
  cacheHit: boolean;
};

@Injectable()
export class MemberContextService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
    @Optional()
    private readonly perfDiagnosticsService?: PerfDiagnosticsService,
  ) {}

  async getMemberContext(options: {
    discordId: string;
    userId: string;
    guildId: string;
  }): Promise<{
    guild: Guild;
    member: unknown;
    roles: unknown[];
    permissions: Permission[];
  } | null> {
    const { discordId, userId, guildId } = options;
    const diagnosticsEnabled =
      this.perfDiagnosticsService?.isActiveForCurrentContext() ?? false;
    const startedAt = diagnosticsEnabled
      ? this.perfDiagnosticsService?.now()
      : undefined;
    const stages: Record<string, number> = {};
    const diagnostics: Record<string, unknown> = { guildId };

    try {
      const guildLookup = await this.timeStage(stages, "guildLookup", () =>
        this.getGuild(guildId),
      );
      const { guild } = guildLookup;
      diagnostics.guildCacheHit = guildLookup.cacheHit;

      return await this.getContextForGuild({
        diagnostics,
        discordId,
        guild,
        stages,
        startedAt,
        userId,
      });
    } catch (error) {
      this.logMemberContextDiagnostics(startedAt, stages, {
        ...diagnostics,
        errorName: (error as Error).name,
        outcome: "error",
      });

      throw error;
    }
  }

  private async getContextForGuild(options: {
    diagnostics: Record<string, unknown>;
    discordId: string;
    guild: Guild;
    stages: Record<string, number>;
    startedAt?: number;
    userId: string;
  }) {
    const { diagnostics, discordId, guild, stages, startedAt, userId } =
      options;
    const cacheKey = getPermissionsCacheKey(userId, guild.id);

    try {
      const cached = await this.timeStage(stages, "permissionsCacheRead", () =>
        this.redisService.get(cacheKey),
      );

      if (cached) {
        try {
          const context = JSON.parse(cached);
          this.logMemberContextDiagnostics(startedAt, stages, {
            ...diagnostics,
            outcome: "permissions_cache_hit",
            permissionsCacheHit: true,
          });

          return context;
        } catch (error) {
          diagnostics.permissionsCacheMalformed = true;
          this.logger.warn({
            message: `Failed to parse cached permissions data for key ${cacheKey}`,
            error,
          });
          await this.timeStage(stages, "permissionsCacheDelete", () =>
            this.redisService.del(cacheKey),
          );
        }
      }
    } catch (error) {
      diagnostics.permissionsCacheReadError = true;
      this.logger.warn({
        message: `Redis cache read failed for key ${cacheKey}, falling back to DB`,
        error,
      });
    }

    const member = await this.timeStage(stages, "memberLookup", () =>
      this.membersService.getGuildMemberById({
        userId,
        discordId,
        guildId: guild.id,
      }),
    );

    if (!member || !member.active) {
      this.logMemberContextDiagnostics(startedAt, stages, {
        ...diagnostics,
        memberActive: member?.active ?? false,
        outcome: "member_missing_or_inactive",
      });

      return null;
    }

    diagnostics.memberRefreshQueued = member.refreshQueued ?? false;
    diagnostics.memberStale = member.isStale ?? false;

    const isOwner = guild.ownerId === discordId;

    const permissions = isOwner
      ? Object.values(Permission)
      : member.roles.reduce((acc: Permission[], role) => {
          return acc.concat(role.permissions);
        }, []) || [];

    const uniquePermissions = Array.from(new Set(permissions));

    const context = {
      permissions: uniquePermissions,
      guild,
      member,
      roles: member.roles,
    };

    if (!member.isStale && !member.refreshQueued) {
      try {
        await this.timeStage(stages, "permissionsCacheWrite", () =>
          this.redisService.set(
            getPermissionsCacheKey(userId, guild.id),
            JSON.stringify(context),
            PERMISSIONS_CACHE_TTL_SECONDS,
          ),
        );
      } catch (error) {
        this.logger.warn({
          message: `Failed to cache permissions for key ${getPermissionsCacheKey(userId, guild.id)}`,
          error,
        });
      }
    }

    this.logMemberContextDiagnostics(startedAt, stages, {
      ...diagnostics,
      outcome: "member_lookup",
      permissionsCount: uniquePermissions.length,
      rolesCount: member.roles.length,
    });

    return context;
  }

  private async getGuild(idOrVanityURL: string): Promise<GuildLookupResult> {
    const cacheKey = getGuildCacheKey(idOrVanityURL);

    try {
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        try {
          return {
            guild: JSON.parse(cached),
            cacheHit: true,
          };
        } catch {
          await this.redisService.del(cacheKey);
        }
      }
    } catch (error) {
      this.logger.warn({
        message: `Redis cache read failed for guild key ${cacheKey}, falling back to DB`,
        error,
      });
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

    try {
      await Promise.all(cacheOperations);
    } catch (error) {
      this.logger.warn({
        message: `Failed to cache guild data for ${idOrVanityURL}`,
        error,
      });
    }

    return {
      guild,
      cacheHit: false,
    };
  }

  private async timeStage<T>(
    stages: Record<string, number>,
    stage: string,
    callback: () => Promise<T>,
  ): Promise<T> {
    if (!this.perfDiagnosticsService?.isActiveForCurrentContext()) {
      return callback();
    }

    const startedAt = this.perfDiagnosticsService.now();
    try {
      return await callback();
    } finally {
      stages[stage] = this.perfDiagnosticsService.now() - startedAt;
    }
  }

  private logMemberContextDiagnostics(
    startedAt: number | undefined,
    stages: Record<string, number>,
    metadata: Record<string, unknown>,
  ) {
    if (startedAt === undefined || !this.perfDiagnosticsService) {
      return;
    }

    this.perfDiagnosticsService.logSpan(
      "member_context.total",
      this.perfDiagnosticsService.now() - startedAt,
      {
        ...metadata,
        stagesMs: this.perfDiagnosticsService.roundStages(stages),
      },
    );
  }
}
