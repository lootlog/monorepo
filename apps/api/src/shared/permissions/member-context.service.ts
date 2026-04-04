import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import { type Guild, Permission } from "prisma/generated/client";
import { PrismaService } from "src/db/prisma.service";
import { MembersService } from "src/members/members.service";
import { ErrorKey } from "src/guilds/enum/error-key.enum";
import { RedisService } from "@lootlog/nest-shared";
import {
  getPermissionsCacheKey,
  getGuildCacheKey,
  GUILD_CACHE_TTL_SECONDS,
  PERMISSIONS_CACHE_TTL_SECONDS,
} from "src/shared/constants/cache.constant";

@Injectable()
export class MemberContextService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => MembersService))
    private readonly membersService: MembersService,
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

    const guild = await this.getGuild(guildId);
    const cacheKey = getPermissionsCacheKey(userId, guild.id);

    try {
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        try {
          return JSON.parse(cached);
        } catch (error) {
          this.logger.warn({
            message: `Failed to parse cached permissions data for key ${cacheKey}`,
            error: error,
          });
          await this.redisService.del(cacheKey);
        }
      }
    } catch (error) {
      this.logger.warn({
        message: `Redis cache read failed for key ${cacheKey}, falling back to DB`,
        error: error,
      });
    }

    const member = await this.membersService.getGuildMemberById({
      userId,
      discordId,
      guildId: guild.id,
    });

    if (!member || !member.active) {
      return null;
    }

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
        await this.redisService.set(
          getPermissionsCacheKey(userId, guild.id),
          JSON.stringify(context),
          PERMISSIONS_CACHE_TTL_SECONDS,
        );
      } catch (error) {
        this.logger.warn({
          message: `Failed to cache permissions for key ${getPermissionsCacheKey(userId, guild.id)}`,
          error: error,
        });
      }
    }

    return context;
  }

  private async getGuild(idOrVanityURL: string): Promise<Guild> {
    const cacheKey = getGuildCacheKey(idOrVanityURL);

    try {
      const cached = await this.redisService.get(cacheKey);

      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          await this.redisService.del(cacheKey);
        }
      }
    } catch (error) {
      this.logger.warn({
        message: `Redis cache read failed for guild key ${cacheKey}, falling back to DB`,
        error: error,
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
        error: error,
      });
    }

    return guild;
  }
}
