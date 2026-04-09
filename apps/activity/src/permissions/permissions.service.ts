import { HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { catchError, firstValueFrom, map } from "rxjs";
import { Permission, type UserGuildPermissionsDto } from "@lootlog/types";
import { ApiServiceConfig } from "src/config/api-service.config";
import { ConfigKey } from "src/config/config-key.enum";
import type { Cache } from "cache-manager";

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly apiServiceUrl: string;

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

      await this.cacheManager.set(cacheKey, response, 60000 * 5);

      this.logger.debug(`Cached user permissions: ${cacheKey}`);

      return response;
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
