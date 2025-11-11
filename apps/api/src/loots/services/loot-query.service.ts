import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import { Prisma, Permission, type Guild, type Role } from 'generated/client';
import type { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import { DEFAULT_PAGE_LIMIT } from '../config/pagination';
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

@Injectable()
export class LootQueryService {
  constructor(private readonly prisma: PrismaService) {}

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
    const filteredRoles = roles.filter((role) => {
      return role.permissions.includes(Permission.LOOTLOG_READ);
    });
    const administrativeUser = isAdministrativeUser(permissions);

    const levelRangesCondition = this.buildLevelRangesCondition(
      filteredRoles,
      administrativeUser,
    );
    const playersCondition = this.buildPlayersCondition(players);
    const npcsCondition = this.buildNpcsCondition(npcs);
    const npcTypesCondition = this.buildNpcTypesCondition(npcTypes);
    const raritiesCondition = this.buildRaritiesCondition(rarities);
    const cursorCondition = this.buildCursorCondition(cursor);

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

    if (!loots.length) return [];

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

    return lootsWithSubmissions;
  }

  private buildLevelRangesCondition(
    filteredRoles: Role[],
    administrativeUser: boolean,
  ) {
    if (filteredRoles.length === 0 || administrativeUser) {
      return Prisma.sql``;
    }

    return Prisma.sql`
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
      )`;
  }

  private buildPlayersCondition(players: string[]) {
    return players.length > 0
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("players") AS player
          WHERE player->>'name' = ANY(ARRAY[${Prisma.join(players)}]::text[])
        )`
      : Prisma.sql``;
  }

  private buildNpcsCondition(npcs: string[]) {
    return npcs.length > 0
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("npcs") AS npc
          WHERE npc->>'name' = ANY(ARRAY[${Prisma.join(npcs)}]::text[])
        )`
      : Prisma.sql``;
  }

  private buildNpcTypesCondition(npcTypes: string[]) {
    return npcTypes.length > 0
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("npcs") AS npc
          WHERE npc->>'type' = ANY(ARRAY[${Prisma.join(npcTypes)}]::text[])
        )`
      : Prisma.sql``;
  }

  private buildRaritiesCondition(rarities: string[]) {
    return rarities.length > 0
      ? Prisma.sql`
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements("items") AS loot
          WHERE loot->>'rarity' = ANY(ARRAY[${Prisma.join(rarities)}]::text[])
        )`
      : Prisma.sql``;
  }

  private buildCursorCondition(cursor: number | null) {
    return cursor
      ? Prisma.sql`
        AND l."id" < ${Number(cursor)}
      `
      : Prisma.sql``;
  }
}
