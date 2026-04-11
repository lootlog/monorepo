import { HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { catchError, firstValueFrom, map } from "rxjs";
import { Permission, type UserGuildPermissionsDto } from "@lootlog/types";
import { ApiServiceConfig } from "src/config/api-service.config";
import { ConfigKey } from "src/config/config-key.enum";
import type { Cache } from "cache-manager";

type ResolvedGuildDto = {
  id: string;
};

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly apiServiceUrl: string;
  private readonly permissionsCacheTtlMs = 60000 * 5;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    const apiServiceConfig = this.configService.get<ApiServiceConfig>(
      ConfigKey.API_SERVICE,
    );
    this.apiServiceUrl = apiServiceConfig.url;
  }

  async resolveGuildId(idOrVanityUrl: string): Promise<string | null> {
    const cacheKey = `guild-id:${idOrVanityUrl}`;
    const cachedGuildId = await this.cacheManager.get<string>(cacheKey);

    if (cachedGuildId) {
      this.logger.debug(`Cache hit for guild resolution: ${cacheKey}`);
      return cachedGuildId;
    }

    const url = `${this.apiServiceUrl}/internal/guilds/${encodeURIComponent(idOrVanityUrl)}`;

    try {
      const guild = await firstValueFrom(
        this.httpService
          .get<ResolvedGuildDto>(url)
          .pipe(map((res) => res.data)),
      );

      await this.cacheManager.set(
        cacheKey,
        guild.id,
        this.permissionsCacheTtlMs,
      );

      this.logger.debug(`Cached guild resolution: ${cacheKey}`);

      return guild.id;
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof error.response === "object" &&
        error.response !== null &&
        "status" in error.response &&
        error.response.status === 404
      ) {
        this.logger.warn(`Guild not found for identifier: ${idOrVanityUrl}`);
        return null;
      }

      this.logger.log({
        level: "error",
        message: "Error resolving guild ID",
        error: error instanceof Error ? error.message : "Unknown error",
        idOrVanityUrl,
      });

      throw error;
    }
  }

  async getUserPermissions(
    discordId: string,
    userId: string,
  ): Promise<UserGuildPermissionsDto[]> {
    const cacheKey = `permissions:${userId}:${discordId}`;

    const cachedPermissions =
      await this.cacheManager.get<UserGuildPermissionsDto[]>(cacheKey);

    if (cachedPermissions) {
      this.logger.debug(`Cache hit for user permissions: ${cacheKey}`);
      return cachedPermissions;
    }

    const url = `${this.apiServiceUrl}/internal/guilds/user-permissions`;

    try {
      const response = await firstValueFrom(
        this.httpService
          .get<UserGuildPermissionsDto[]>(url, {
            params: { discordId, userId },
          })
          .pipe(
            map((res) => res.data),
            catchError((error) => {
              this.logger.log({
                level: "error",
                message: "Failed to fetch user permissions from API service",
                error: error.message,
                stack: error.stack,
                discordId,
                userId,
              });
              throw error;
            }),
          ),
      );

      const normalizedResponse = response ?? [];

      await this.cacheManager.set(
        cacheKey,
        normalizedResponse,
        this.permissionsCacheTtlMs,
      );

      this.logger.debug(`Cached user permissions: ${cacheKey}`);

      return normalizedResponse;
    } catch (error) {
      this.logger.log({
        level: "error",
        message: "Error fetching user permissions",
        error: error instanceof Error ? error.message : "Unknown error",
        discordId,
        userId,
      });
      return [];
    }
  }

  async getUserGuildPermissions(
    discordId: string,
    userId: string,
    guildId: string,
  ): Promise<Permission[]> {
    const userPermissions = await this.getUserPermissions(discordId, userId);

    const guildPermissions = userPermissions.find(
      (p) => p.guild.id === guildId,
    );

    if (!guildPermissions) {
      return [];
    }

    const isOwner = guildPermissions.guild.ownerId === discordId;

    if (isOwner) {
      return Object.values(Permission);
    }

    const allPermissions = guildPermissions.roles.flatMap(
      (role) => role.permissions,
    );

    return Array.from(new Set(allPermissions));
  }

  async invalidateUserPermissions(userId: string, discordId: string) {
    const cacheKey = `permissions:${userId}:${discordId}`;
    await this.cacheManager.del(cacheKey);
    this.logger.debug(`Invalidated cache for user permissions: ${cacheKey}`);
  }
}
