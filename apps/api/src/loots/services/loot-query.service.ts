import { BadRequestException, Injectable } from '@nestjs/common';
import { Permission, Prisma, type Guild, type Role } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from 'src/loots/config/pagination';
import { ErrorKey } from 'src/loots/enum/error-key.enum';
import type { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import { isAdministrativeUser } from 'src/shared/permissions/is-administrative-user';

interface LootQueryResult {
  id: number;
  uniqueId: string;
  items: unknown;
  world: string;
  source: string;
  location: string;
  players: unknown;
  npcs: unknown;
  lootShare: unknown;
  createdAt: Date;
  updatedAt: Date;
  commentsCount: bigint;
}

const CACHE_TTL_SECONDS = 60;

@Injectable()
export class LootQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private getCacheKey(
    guildId: string,
    world: string,
    cursor: number | null,
    limit: number,
    filters: string,
  ): string {
    return `loots:${guildId}:${world}:${cursor || 'start'}:${limit}:${filters}`;
  }

  private getFiltersHash(params: FetchLootsParamsDto): string {
    const { npcTypes = [], npcs = [], players = [], rarities = [] } = params;

    return [
      npcTypes.sort().join(','),
      npcs.sort().join(','),
      players.sort().join(','),
      rarities.sort().join(','),
    ].join('|');
  }

  async invalidateLootsCache(guildId: string, world?: string): Promise<void> {
    const pattern = world
      ? `loots:${guildId}:${world}:*`
      : `loots:${guildId}:*`;
    await this.redis.deleteByPattern(pattern);
  }

  async fetchLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    {
      cursor = null,
      limit = DEFAULT_PAGE_LIMIT,
      npcTypes = [],
      npcs = [],
      players = [],
      rarities = [],
      world,
    }: FetchLootsParamsDto,
  ) {
    if (limit > MAX_PAGE_LIMIT) {
      throw new BadRequestException({
        message: ErrorKey.PAGINATION_LIMIT_TOO_HIGH,
      });
    }

    const filtersHash = this.getFiltersHash({
      cursor,
      limit,
      npcTypes,
      npcs,
      players,
      rarities,
      world,
    });
    const cacheKey = this.getCacheKey(
      guild.id,
      world,
      cursor,
      limit,
      filtersHash,
    );
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const filteredRoles = roles.filter((role) => {
      return role.permissions.includes(Permission.LOOTLOG_READ);
    });
    const administrativeUser = isAdministrativeUser(permissions);

    const levelRangesCondition =
      filteredRoles.length > 0 && !administrativeUser
        ? Prisma.sql`
      AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements("npcs") AS npc
      WHERE
        ${Prisma.join(
          filteredRoles.map((role) => {
            const hasReadTitans = role.permissions?.includes(
              Permission.LOOTLOG_READ_LOOTS_TITANS,
            );
            const hasReadHeroes = role.permissions?.includes(
              Permission.LOOTLOG_READ_LOOTS_HEROES,
            );
            return Prisma.sql`
          (
            (npc->>'lvl')::int >= ${role.lvlRangeFrom}
            AND (npc->>'lvl')::int <= ${role.lvlRangeTo}
            AND (
            (npc->>'type') != 'TITAN'
            OR (${hasReadTitans ? Prisma.sql`TRUE` : Prisma.sql`FALSE`})
            )
            AND (
            (npc->>'type') NOT IN ('HERO', 'EVENT_HERO')
            OR (${hasReadHeroes ? Prisma.sql`TRUE` : Prisma.sql`FALSE`})
            )
          )
          `;
          }),
          ' OR ',
        )}
      )`
        : Prisma.sql``;

    const playersCondition =
      players.length > 0
        ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("players") AS player
          WHERE player->>'name' = ANY(ARRAY[${Prisma.join(players)}]::text[])
        )`
        : Prisma.sql``;

    const npcsCondition =
      npcs.length > 0
        ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("npcs") AS npc
          WHERE npc->>'name' = ANY(ARRAY[${Prisma.join(npcs)}]::text[])
        )`
        : Prisma.sql``;

    const npcTypesCondition =
      npcTypes.length > 0
        ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("npcs") AS npc
          WHERE npc->>'type' = ANY(ARRAY[${Prisma.join(npcTypes)}]::text[])
        )`
        : Prisma.sql``;

    const raritiesCondition =
      rarities.length > 0
        ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("items") AS loot
          WHERE loot->>'rarity' = ANY(ARRAY[${Prisma.join(rarities)}]::text[])
        )`
        : Prisma.sql``;

    const cursorCondition = cursor
      ? Prisma.sql`
        AND l."id" < ${Number(cursor)}
      `
      : Prisma.sql``;

    const loots = await this.prisma.$queryRaw<LootQueryResult[]>(Prisma.sql`
    SELECT DISTINCT ON (l."id") l.*,
      (
      SELECT COUNT(*)
      FROM "LootComment" lc
      WHERE lc."lootId" = l."id" AND lc."guildId" = ${guild.id}
      ) AS "commentsCount"
    FROM "Loot" l
    INNER JOIN "LootSubmission" s ON s."lootId" = l."id"
    WHERE s."guildId" = ${guild.id}
      AND l."world" = ${world}
      ${playersCondition}
      ${npcsCondition}
      ${npcTypesCondition}
      ${raritiesCondition}
      ${cursorCondition}
      ${levelRangesCondition}
    ORDER BY l."id" DESC
    LIMIT ${limit};
    `);

    if (!loots.length) {
      await this.redis.set(cacheKey, JSON.stringify([]), CACHE_TTL_SECONDS);
      return [];
    }

    const lootIds = loots.map((l) => l.id);

    const submissions = await this.prisma.lootSubmission.findMany({
      where: {
        lootId: { in: lootIds },
        guildId: guild.id,
      },
      include: {
        member: {
          select: {
            name: true,
            avatar: true,
            userId: true,
          },
        },
      },
    });

    const submissionsByLootId = submissions.reduce(
      (acc, sub) => {
        (acc[sub.lootId] ??= []).push(sub);
        return acc;
      },
      {} as Record<number, typeof submissions>,
    );

    const lootsWithSubmissions = loots.map((loot) => ({
      ...loot,
      submissions: submissionsByLootId[loot.id] || [],
    }));

    await this.redis.set(
      cacheKey,
      JSON.stringify(lootsWithSubmissions),
      CACHE_TTL_SECONDS,
    );

    return lootsWithSubmissions;
  }
}
