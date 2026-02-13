import { HttpService } from "@nestjs/axios";
import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import { Permission, type UserGuildPermissionsDto } from "@lootlog/types";
import { type ApiServiceConfig } from "src/config/api-service.config";
import { ConfigKey } from "src/config/config-key.enum";

const CACHE_TTL_MS = 60_000;

type CachedPermissions = {
  expiresAt: number;
  data: UserGuildPermissionsDto[];
};

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name);
  private readonly apiServiceUrl: string;
  private readonly permissionCache = new Map<string, CachedPermissions>();

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const apiServiceConfig = this.configService.get<ApiServiceConfig>(
      ConfigKey.API_SERVICE,
    );

    if (!apiServiceConfig) {
      throw new Error("Missing API service configuration");
    }

    this.apiServiceUrl = apiServiceConfig.url;
  }

  async ensureAdminOrOwner(
    discordId: string,
    userId: string,
    guildId: string,
  ): Promise<void> {
    const permissions = await this.getGuildPermissions(
      discordId,
      userId,
      guildId,
    );

    const hasAccess =
      permissions.includes(Permission.OWNER) ||
      permissions.includes(Permission.ADMIN);

    if (!hasAccess) {
      throw new ForbiddenException();
    }
  }

  async getGuildPermissions(
    discordId: string,
    userId: string,
    guildId: string,
  ): Promise<Permission[]> {
    const data = await this.getUserPermissions(discordId, userId);
    const guildData = data.find((entry) => entry.guild.id === guildId);

    if (!guildData) {
      return [];
    }

    if (guildData.guild.ownerId === discordId) {
      return [Permission.OWNER, ...Object.values(Permission)];
    }

    const set = new Set<Permission>();
    guildData.roles.forEach((role) => {
      role.permissions.forEach((permission) => set.add(permission));
    });

    return Array.from(set);
  }

  private async getUserPermissions(
    discordId: string,
    userId: string,
  ): Promise<UserGuildPermissionsDto[]> {
    const cacheKey = `${discordId}:${userId}`;
    const now = Date.now();
    const cached = this.permissionCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return cached.data;
    }

    const url = `${this.apiServiceUrl}/internal/guilds/user-permissions`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<UserGuildPermissionsDto[]>(url, {
          params: { discordId, userId },
          timeout: 6000,
        }),
      );

      const data = response.data ?? [];
      this.permissionCache.set(cacheKey, {
        data,
        expiresAt: now + CACHE_TTL_MS,
      });

      return data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch permissions for ${discordId}/${userId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw new ServiceUnavailableException("Permissions service unavailable");
    }
  }
}
