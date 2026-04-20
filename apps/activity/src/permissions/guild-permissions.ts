import { Permission, type UserGuildPermissionsDto } from "@lootlog/types";
import type { Logger } from "winston";
import { APP_CONFIG } from "../config/env.js";
import { CacheStore } from "../shared/cache/cache-store.js";

type ResolvedGuildDto = {
  id: string;
};

export class GuildPermissions {
  private readonly permissionsCacheTtlMs = 5 * 60 * 1000;

  constructor(
    private readonly cacheStore: CacheStore,
    private readonly logger: Logger,
  ) {}

  async resolveGuildId(idOrVanityUrl: string) {
    const cacheKey = `guild-id:${idOrVanityUrl}`;
    const cachedGuildId = await this.cacheStore.get<string>(cacheKey);

    if (cachedGuildId) {
      this.logger.debug("Permissions cache hit for guild resolution", {
        cacheKey,
      });
      return cachedGuildId;
    }

    const resolvedGuild = await this.fetchJson<ResolvedGuildDto | null>(
      `${APP_CONFIG.apiServiceUrl}/internal/guilds/${encodeURIComponent(idOrVanityUrl)}`,
      {
        notFoundValue: null,
      },
    );

    if (!resolvedGuild) {
      this.logger.warn("Guild not found for identifier", {
        idOrVanityUrl,
      });
      return null;
    }

    await this.cacheStore.set(
      cacheKey,
      resolvedGuild.id,
      this.permissionsCacheTtlMs,
    );

    return resolvedGuild.id;
  }

  async getUserPermissions(discordId: string, userId: string) {
    const cacheKey = `permissions:${userId}:${discordId}`;
    const cachedPermissions =
      await this.cacheStore.get<UserGuildPermissionsDto[]>(cacheKey);

    if (cachedPermissions) {
      this.logger.debug("Permissions cache hit for user permissions", {
        cacheKey,
      });
      return cachedPermissions;
    }

    try {
      const url = new URL(
        "/internal/guilds/user-permissions",
        APP_CONFIG.apiServiceUrl,
      );
      url.searchParams.set("discordId", discordId);
      url.searchParams.set("userId", userId);

      const permissions =
        (await this.fetchJson<UserGuildPermissionsDto[] | null>(
          url.toString(),
          {
            notFoundValue: [],
          },
        )) ?? [];

      await this.cacheStore.set(
        cacheKey,
        permissions,
        this.permissionsCacheTtlMs,
      );
      return permissions;
    } catch (error) {
      this.logger.error("Error fetching user permissions", {
        discordId,
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  async getUserGuildPermissions(
    discordId: string,
    userId: string,
    guildId: string,
  ) {
    const userPermissions = await this.getUserPermissions(discordId, userId);

    const guildPermissions = userPermissions.find(
      (permissionsEntry) => permissionsEntry.guild.id === guildId,
    );

    if (!guildPermissions) {
      return [];
    }

    if (guildPermissions.guild.ownerId === discordId) {
      return Object.values(Permission);
    }

    return Array.from(
      new Set(guildPermissions.roles.flatMap((role) => role.permissions)),
    );
  }

  async invalidateUserPermissions(userId: string, discordId: string) {
    await this.cacheStore.delete(`permissions:${userId}:${discordId}`);
  }

  private async fetchJson<T>(
    url: string,
    options: {
      notFoundValue: T;
    },
  ) {
    const response = await fetch(url);

    if (response.status === 404) {
      return options.notFoundValue;
    }

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    return (await response.json()) as T;
  }
}
