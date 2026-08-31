import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
import { and } from "@prisma/orm-family-sql/orm-client";
import { RedisService } from "@lootlog/nest-shared/redis";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { PrismaService } from "#src/db/prisma.service";
import type { CreateCommentDto } from "#src/loots/dto/create-comment-dto";
import type { FetchLootsParamsDto } from "#src/loots/dto/fetch-loots-params.dto";
import type { LootQueryResult } from "#src/loots/dto/loot-query-result.dto";
import { ErrorKey } from "#src/loots/enum/error-key.enum";
import { LootCommentService } from "#src/loots/services/loot-comment.service";
import { LootQueryService } from "#src/loots/services/loot-query.service";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import type { Logger } from "winston";

const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
type Guild = FieldOutputTypes["public"]["Guild"];
type Role = FieldOutputTypes["public"]["Role"];

type CachedLootQueryResult = Omit<
  LootQueryResult,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

const LOOTS_LIST_CACHE_TTL_SECONDS = 10;

@Injectable()
export class LootsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lootQueryService: LootQueryService,
    private readonly lootCommentService: LootCommentService,
    private readonly lootStatsService: LootStatsService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async getComments(options: {
    guild: Guild;
    lootId: number;
    permissions: Permission[];
    roles: Role[];
  }) {
    const visibleLoot = await this.lootQueryService.fetchLootById(
      options.guild,
      options.permissions,
      options.roles,
      options.lootId,
    );
    if (!visibleLoot) {
      throw new NotFoundException();
    }

    return this.lootCommentService.getComments({
      guildId: options.guild.id,
      lootId: options.lootId,
    });
  }

  async archiveLoot(options: {
    discordId: string;
    guild: Guild;
    lootId: number;
    permissions: Permission[];
    roles: Role[];
  }) {
    const visibleLoot = await this.lootQueryService.fetchLootById(
      options.guild,
      options.permissions,
      options.roles,
      options.lootId,
    );
    if (!visibleLoot) {
      throw new NotFoundException(ErrorKey.CANT_DELETE_LOOT);
    }

    const actor = await this.prisma.db.orm.public.Member.where((row) =>
      and(row.userId.eq(options.discordId), row.guildId.eq(options.guild.id)),
    )
      .select("id")
      .first();
    if (!actor) {
      throw new NotFoundException(ErrorKey.CANT_DELETE_LOOT);
    }

    const archived =
      await this.prisma.db.orm.public.OrganizationLootRecord.where((row) =>
        and(
          row.guildId.eq(options.guild.id),
          row.lootId.eq(options.lootId),
          row.archivedAt.isNull(),
        ),
      ).updateAndCount({
        archivedAt: new Date(),
        archivedByMemberId: actor.id,
        updatedAt: new Date(),
      });
    if (archived === 0) {
      throw new NotFoundException(ErrorKey.CANT_DELETE_LOOT);
    }

    await Promise.all([
      this.invalidateLootsListCache([options.guild.id]),
      this.invalidateLootStatsCaches([options.guild.id]),
    ]);
  }

  async createComment(options: {
    discordId: string;
    guild: Guild;
    lootId: number;
    body: CreateCommentDto;
    permissions: Permission[];
    roles: Role[];
  }) {
    const visibleLoot = await this.lootQueryService.fetchLootById(
      options.guild,
      options.permissions,
      options.roles,
      options.lootId,
    );
    if (!visibleLoot) {
      throw new NotFoundException();
    }

    const comment = await this.lootCommentService.createComment({
      discordId: options.discordId,
      guildId: options.guild.id,
      lootId: options.lootId,
      body: options.body,
    });
    await this.invalidateLootsListCache([options.guild.id]);
    return comment;
  }

  async fetchLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) {
    if (this.isFirstLootsPage(params)) {
      const loots = await this.redisService.getOrSetJsonBestEffort<
        CachedLootQueryResult[]
      >({
        key: this.getLootsListCacheKey(guild, permissions, roles, params),
        ttlSeconds: LOOTS_LIST_CACHE_TTL_SECONDS,
        onError: (error) =>
          this.logger.warn("Loots list cache unavailable", { error }),
        factory: () =>
          this.lootQueryService.fetchLootsByGuildId(
            guild,
            permissions,
            roles,
            params,
          ),
      });
      return this.normalizeCachedLoots(loots);
    }

    return this.lootQueryService.fetchLootsByGuildId(
      guild,
      permissions,
      roles,
      params,
    );
  }

  countLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) {
    return this.lootQueryService.countLootsByGuildId(
      guild,
      permissions,
      roles,
      params,
    );
  }

  fetchLootById(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    lootId: number,
  ) {
    return this.lootQueryService.fetchLootById(
      guild,
      permissions,
      roles,
      lootId,
    );
  }

  resolveLootItemByHid(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    options: { hid: string; world?: string },
  ) {
    return this.lootQueryService.resolveLootItemByHid(
      guild,
      permissions,
      roles,
      options,
    );
  }

  private isFirstLootsPage(params: FetchLootsParamsDto): boolean {
    return (
      params.cursor === undefined ||
      params.cursor === null ||
      params.cursor <= 0
    );
  }

  private getLootsListCacheKey(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ): string {
    const visibilityScope = {
      permissions: [...permissions].sort(),
      roles: roles
        .map((role) => ({
          id: role.id,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
          permissions: [...role.permissions].sort(),
        }))
        .sort((leftRole, rightRole) => leftRole.id.localeCompare(rightRole.id)),
    };

    return [
      "loots",
      "list",
      guild.id,
      Buffer.from(
        this.stableSerialize({
          params: { ...params, cursor: 0 },
          visibilityScope,
        }),
      ).toString("base64url"),
    ].join(":");
  }

  private async invalidateLootsListCache(guildIds: string[]): Promise<void> {
    await Promise.all(
      [...new Set(guildIds)].map(async (guildId) => {
        try {
          await this.redisService.deleteByPattern(`loots:list:${guildId}:*`);
        } catch (error) {
          this.logger.warn("Failed to invalidate loots list cache", {
            error,
            guildId,
          });
        }
      }),
    );
  }

  private async invalidateLootStatsCaches(guildIds: string[]): Promise<void> {
    if (guildIds.length > 0) {
      await this.lootStatsService.invalidateCache(guildIds);
    }
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }
    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));
      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }
    return JSON.stringify(value) ?? "undefined";
  }

  private normalizeCachedLootDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  private normalizeCachedLoots(
    loots: CachedLootQueryResult[],
  ): LootQueryResult[] {
    return loots.map((loot) => ({
      ...loot,
      createdAt: this.normalizeCachedLootDate(loot.createdAt),
      updatedAt: this.normalizeCachedLootDate(loot.updatedAt),
    }));
  }
}
