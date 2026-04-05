import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import {
  ItemRarity,
  NpcType,
  Permission,
  Profession,
  type Guild,
  type Prisma,
  type Role,
} from "src/generated/prisma/client";
import type { FetchLootsParamsDto } from "src/loots/dto/fetch-loots-params.dto";
import type { LootItemDto } from "src/loots/dto/loot-item.dto";
import type { LootNpcDto } from "src/loots/dto/loot-npc.dto";
import type { LootQueryResult } from "src/loots/dto/loot-query-result.dto";
import { DEFAULT_PAGE_LIMIT } from "../config/pagination";
import { isAdministrativeUser } from "src/shared/permissions/is-administrative-user";
import { getProfByShortname } from "src/shared/utils/get-prof-by-shortname";

type LootItemWithSnapshot = Prisma.LootItemGetPayload<{
  include: { itemSnapshot: true };
}>;

type LootPlayerWithSnapshot = Prisma.LootPlayerGetPayload<{
  include: { playerSnapshot: true };
}>;

type LootNpcWithSnapshot = Prisma.LootNpcGetPayload<{
  include: { npcSnapshot: true };
}>;

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
      npcLevelMin,
      npcLevelMax,
      itemLevelMin,
      itemLevelMax,
      playerLevelMin,
      playerLevelMax,
      search,
      world,
      hid,
      itemNames,
      createdAtMin,
      createdAtMax,
    }: FetchLootsParamsDto,
  ) {
    const baseWhere = this.buildBaseWhereCondition(guild, permissions, roles, {
      npcTypes,
      npcs,
      players,
      rarities,
      npcLevelMin,
      npcLevelMax,
      itemLevelMin,
      itemLevelMax,
      playerLevelMin,
      playerLevelMax,
      search,
      world,
      hid,
      itemNames,
      cursor,
      createdAtMin,
      createdAtMax,
    });

    const lootsWithRelations = await this.prisma.loot.findMany({
      where: baseWhere,
      orderBy: { id: "desc" },
      take: limit,
      select: {
        id: true,
        uniqueId: true,
        world: true,
        source: true,
        location: true,
        lootShare: true,
        createdAt: true,
        updatedAt: true,
        lootSubmissions: {
          where: { guildId: guild.id },
          include: {
            member: {
              select: {
                name: true,
                avatar: true,
                userId: true,
              },
            },
          },
        },
        lootItems: {
          include: { itemSnapshot: true },
          orderBy: { id: "asc" },
        },
        lootPlayers: {
          include: { playerSnapshot: true },
          orderBy: { id: "asc" },
        },
        lootNpcs: {
          include: { npcSnapshot: true },
          orderBy: { id: "asc" },
        },
        _count: {
          select: { comments: { where: { guildId: guild.id } } },
        },
      },
    });

    if (!lootsWithRelations.length) return [];

    const results: LootQueryResult[] = lootsWithRelations.map((loot) => ({
      id: loot.id,
      uniqueId: loot.uniqueId,
      world: loot.world,
      source: loot.source,
      location: loot.location,
      lootShare: loot.lootShare,
      createdAt: loot.createdAt,
      updatedAt: loot.updatedAt,
      items: this.mapItems(loot.lootItems as unknown as LootItemWithSnapshot[]),
      players: (loot.lootPlayers as unknown as LootPlayerWithSnapshot[]).map(
        (entry) => this.mapPlayerFromSnapshot(entry),
      ),
      npcs: this.mapNpcs(loot.lootNpcs as unknown as LootNpcWithSnapshot[]),
      submissions: loot.lootSubmissions,
      commentsCount: loot._count.comments,
    }));

    return results;
  }

  countLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    {
      npcTypes = [],
      npcs = [],
      players = [],
      rarities = [],
      npcLevelMin,
      npcLevelMax,
      itemLevelMin,
      itemLevelMax,
      playerLevelMin,
      playerLevelMax,
      search,
      world,
      hid,
      itemNames,
      createdAtMin,
      createdAtMax,
    }: FetchLootsParamsDto,
  ) {
    const baseWhere = this.buildBaseWhereCondition(guild, permissions, roles, {
      npcTypes,
      npcs,
      players,
      rarities,
      npcLevelMin,
      npcLevelMax,
      itemLevelMin,
      itemLevelMax,
      playerLevelMin,
      playerLevelMax,
      search,
      world,
      hid,
      itemNames,
      cursor: null,
      createdAtMin,
      createdAtMax,
    });

    return this.prisma.loot.count({
      where: baseWhere,
    });
  }

  async fetchLootById(
    guild: Guild,
    lootId: number,
  ): Promise<LootQueryResult | null> {
    const loot = await this.prisma.loot.findFirst({
      where: {
        id: lootId,
        lootSubmissions: {
          some: {
            guildId: guild.id,
          },
        },
      },
      select: {
        id: true,
        uniqueId: true,
        world: true,
        source: true,
        location: true,
        lootShare: true,
        createdAt: true,
        updatedAt: true,
        lootSubmissions: {
          where: { guildId: guild.id },
          include: {
            member: {
              select: {
                name: true,
                avatar: true,
                userId: true,
              },
            },
          },
        },
        lootItems: {
          include: { itemSnapshot: true },
          orderBy: { id: "asc" },
        },
        lootPlayers: {
          include: { playerSnapshot: true },
          orderBy: { id: "asc" },
        },
        lootNpcs: {
          include: { npcSnapshot: true },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!loot) return null;

    const commentsCount = await this.prisma.lootComment.count({
      where: {
        lootId: loot.id,
        guildId: guild.id,
      },
    });

    return {
      id: loot.id,
      uniqueId: loot.uniqueId,
      world: loot.world,
      source: loot.source,
      location: loot.location,
      lootShare: loot.lootShare,
      createdAt: loot.createdAt,
      updatedAt: loot.updatedAt,
      items: this.mapItems(loot.lootItems),
      players: loot.lootPlayers.map((entry) =>
        this.mapPlayerFromSnapshot(entry),
      ),
      npcs: this.mapNpcs(loot.lootNpcs),
      submissions: loot.lootSubmissions,
      commentsCount,
    };
  }

  private buildBaseWhereCondition(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    {
      npcTypes = [],
      npcs = [],
      players = [],
      rarities = [],
      npcLevelMin,
      npcLevelMax,
      itemLevelMin,
      itemLevelMax,
      playerLevelMin,
      playerLevelMax,
      search,
      world,
      hid,
      itemNames,
      cursor,
      createdAtMin,
      createdAtMax,
    }: {
      npcTypes?: string[];
      npcs?: string[];
      players?: string[];
      rarities?: string[];
      npcLevelMin?: number;
      npcLevelMax?: number;
      itemLevelMin?: number;
      itemLevelMax?: number;
      playerLevelMin?: number;
      playerLevelMax?: number;
      search?: string;
      world?: string;
      hid?: string;
      itemNames?: string[];
      cursor?: number | null;
      createdAtMin?: string;
      createdAtMax?: string;
    },
  ): Prisma.LootWhereInput {
    const filteredRoles = roles.filter((role) =>
      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
    );
    const administrativeUser = isAdministrativeUser(permissions);

    const levelRangesCondition = this.buildLevelRangesCondition(
      filteredRoles,
      administrativeUser,
    );
    const playersCondition = this.buildPlayersCondition(players);
    const npcsCondition = this.buildNpcsCondition(npcs);
    const npcTypesCondition = this.buildNpcTypesCondition(npcTypes);
    const raritiesCondition = this.buildRaritiesCondition(rarities);
    const npcLevelsCondition = this.buildNpcLevelsCondition(
      npcLevelMin,
      npcLevelMax,
    );
    const itemLevelsCondition = this.buildItemLevelsCondition(
      itemLevelMin,
      itemLevelMax,
    );
    const playerLevelsCondition = this.buildPlayerLevelsCondition(
      playerLevelMin,
      playerLevelMax,
    );
    const searchCondition = this.buildSearchCondition(search);
    const cursorCondition = this.buildCursorCondition(cursor ?? null);
    const hidCondition = this.buildHidCondition(hid);
    const itemNamesCondition = this.buildItemNamesCondition(itemNames);
    const createdAtCondition = this.buildCreatedAtCondition(
      createdAtMin,
      createdAtMax,
    );

    const baseWhere: Prisma.LootWhereInput = {
      lootSubmissions: {
        some: {
          guildId: guild.id,
        },
      },
    };

    if (world) {
      baseWhere.world = world;
    }

    const andConditions = [
      cursorCondition,
      playersCondition,
      npcsCondition,
      npcTypesCondition,
      raritiesCondition,
      npcLevelsCondition,
      itemLevelsCondition,
      playerLevelsCondition,
      levelRangesCondition,
      searchCondition,
      hidCondition,
      itemNamesCondition,
      createdAtCondition,
    ].filter(Boolean) as Prisma.LootWhereInput[];

    if (andConditions.length > 0) {
      baseWhere.AND = andConditions;
    }

    return baseWhere;
  }

  private buildLevelRangesCondition(
    filteredRoles: Role[],
    administrativeUser: boolean,
  ): Prisma.LootWhereInput | null {
    if (filteredRoles.length === 0 || administrativeUser) {
      return null;
    }

    const npcVisibilityPerRole: Prisma.NpcSnapshotWhereInput[] = [];

    for (const role of filteredRoles) {
      const roleCondition = this.buildRoleVisibilityCondition(role);
      if (roleCondition) {
        npcVisibilityPerRole.push(roleCondition);
      }
    }

    if (npcVisibilityPerRole.length === 0) {
      return null;
    }

    return {
      lootNpcs: {
        some: {
          npcSnapshot: {
            OR: npcVisibilityPerRole,
          },
        },
      },
    };
  }

  private buildRoleVisibilityCondition(
    role: Role,
  ): Prisma.NpcSnapshotWhereInput | null {
    const hasReadTitans = role.permissions?.includes(
      Permission.LOOTLOG_LOOTS_TITANS_READ,
    );
    const hasReadHeroes = role.permissions?.includes(
      Permission.LOOTLOG_LOOTS_HEROES_READ,
    );

    const lvlFrom = Number(role.lvlRangeFrom ?? 0);
    const lvlTo = Number(role.lvlRangeTo ?? 500);

    const npcConstraints: Prisma.NpcSnapshotWhereInput[] = [];

    npcConstraints.push({
      OR: [{ lvl: { gte: lvlFrom } }, ...(lvlFrom <= 0 ? [{ lvl: null }] : [])],
    });

    npcConstraints.push({
      OR: [{ lvl: { lte: lvlTo } }, ...(lvlTo >= 0 ? [{ lvl: null }] : [])],
    });

    if (!hasReadTitans) {
      npcConstraints.push({
        type: {
          not: NpcType.TITAN,
        },
      });
    }

    if (!hasReadHeroes) {
      npcConstraints.push({
        type: {
          notIn: [NpcType.HERO, NpcType.EVENT_HERO],
        },
      });
    }

    if (npcConstraints.length === 0) {
      return null;
    }

    return {
      AND: npcConstraints,
    };
  }

  private buildPlayersCondition(
    players: string[],
  ): Prisma.LootWhereInput | null {
    if (!players || players.length === 0) {
      return null;
    }

    return {
      lootPlayers: {
        some: {
          playerSnapshot: {
            name: {
              in: players,
            },
          },
        },
      },
    };
  }

  private buildNpcsCondition(npcs: string[]): Prisma.LootWhereInput | null {
    if (!npcs || npcs.length === 0) {
      return null;
    }

    return {
      lootNpcs: {
        some: {
          npcSnapshot: {
            name: {
              in: npcs,
            },
          },
        },
      },
    };
  }

  private buildHidCondition(hid?: string): Prisma.LootWhereInput | null {
    if (!hid) {
      return null;
    }

    return {
      lootItems: {
        some: {
          hid: hid,
        },
      },
    };
  }

  private buildItemNamesCondition(
    itemNames?: string[],
  ): Prisma.LootWhereInput | null {
    if (!itemNames || itemNames.length === 0) {
      return null;
    }

    return {
      lootItems: {
        some: {
          itemSnapshot: {
            name: {
              in: itemNames,
            },
          },
        },
      },
    };
  }

  private buildNpcTypesCondition(
    npcTypes: string[],
  ): Prisma.LootWhereInput | null {
    const allowedTypes = this.filterEnumValues(npcTypes, NpcType);
    if (allowedTypes.length === 0) {
      return null;
    }

    return {
      lootNpcs: {
        some: {
          npcSnapshot: {
            type: {
              in: allowedTypes,
            },
          },
        },
      },
    };
  }

  private buildRaritiesCondition(
    rarities: string[],
  ): Prisma.LootWhereInput | null {
    const allowedRarities = this.filterEnumValues(rarities, ItemRarity);
    if (allowedRarities.length === 0) {
      return null;
    }

    return {
      lootItems: {
        some: {
          itemSnapshot: {
            rarity: {
              in: allowedRarities,
            },
          },
        },
      },
    };
  }

  private buildNpcLevelsCondition(
    npcLevelMin?: number | null,
    npcLevelMax?: number | null,
  ): Prisma.LootWhereInput | null {
    const levelRange = this.buildNullableIntRangeFilter(
      npcLevelMin,
      npcLevelMax,
    );

    if (!levelRange) {
      return null;
    }

    return {
      lootNpcs: {
        some: {
          npcSnapshot: {
            lvl: levelRange,
          },
        },
      },
    };
  }

  private buildItemLevelsCondition(
    itemLevelMin?: number | null,
    itemLevelMax?: number | null,
  ): Prisma.LootWhereInput | null {
    const levelRange = this.buildNullableIntRangeFilter(
      itemLevelMin,
      itemLevelMax,
    );

    if (!levelRange) {
      return null;
    }

    return {
      lootItems: {
        some: {
          itemSnapshot: {
            lvl: levelRange,
          },
        },
      },
    };
  }

  private buildPlayerLevelsCondition(
    playerLevelMin?: number | null,
    playerLevelMax?: number | null,
  ): Prisma.LootWhereInput | null {
    const levelRange = this.buildNullableIntRangeFilter(
      playerLevelMin,
      playerLevelMax,
    );

    if (!levelRange) {
      return null;
    }

    return {
      lootPlayers: {
        some: {
          lvl: levelRange,
        },
      },
    };
  }

  private buildCursorCondition(
    cursor: number | null,
  ): Prisma.LootWhereInput | null {
    if (!cursor) {
      return null;
    }

    return {
      id: {
        lt: Number(cursor),
      },
    };
  }

  private buildCreatedAtCondition(
    createdAtMin?: string,
    createdAtMax?: string,
  ): Prisma.LootWhereInput | null {
    const createdAtRange = this.buildDateTimeRangeFilter(
      createdAtMin,
      createdAtMax,
    );

    if (!createdAtRange) {
      return null;
    }

    return {
      createdAt: createdAtRange,
    };
  }

  private buildSearchCondition(
    search?: string | null,
  ): Prisma.LootWhereInput | null {
    if (!search) {
      return null;
    }

    const trimmedSearch = search.trim();

    if (!trimmedSearch) {
      return null;
    }

    return {
      OR: [
        {
          location: {
            contains: trimmedSearch,
            mode: "insensitive",
          },
        },
        {
          lootItems: {
            some: {
              itemSnapshot: {
                name: {
                  contains: trimmedSearch,
                  mode: "insensitive",
                },
              },
            },
          },
        },
        {
          lootNpcs: {
            some: {
              npcSnapshot: {
                name: {
                  contains: trimmedSearch,
                  mode: "insensitive",
                },
              },
            },
          },
        },
        {
          lootPlayers: {
            some: {
              playerSnapshot: {
                name: {
                  contains: trimmedSearch,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      ],
    };
  }

  private filterEnumValues<T extends string>(
    values: string[],
    enumObject: Record<string, T>,
  ): T[] {
    const enumValues = Object.values(enumObject) as T[];
    return values.filter((value): value is T =>
      enumValues.includes(value as T),
    );
  }

  private buildNullableIntRangeFilter(
    min?: number | null,
    max?: number | null,
  ): Prisma.IntNullableFilter | null {
    if (min === undefined && max === undefined) {
      return null;
    }

    const rangeFilter: Prisma.IntNullableFilter = {};

    if (min !== undefined && min !== null) {
      rangeFilter.gte = min;
    }

    if (max !== undefined && max !== null) {
      rangeFilter.lte = max;
    }

    return rangeFilter;
  }

  private buildDateTimeRangeFilter(
    min?: string,
    max?: string,
  ): Prisma.DateTimeFilter | null {
    if (min === undefined && max === undefined) {
      return null;
    }

    const rangeFilter: Prisma.DateTimeFilter = {};

    if (min !== undefined) {
      rangeFilter.gte = new Date(min);
    }

    if (max !== undefined) {
      rangeFilter.lte = new Date(max);
    }

    return rangeFilter;
  }

  private mapItems(entries: LootItemWithSnapshot[]): LootItemDto[] {
    return entries.map((entry) => this.mapItemFromSnapshot(entry));
  }

  private mapItemFromSnapshot(lootItem: LootItemWithSnapshot): LootItemDto {
    const stats = this.parseStatsSnapshot(lootItem.itemSnapshot.statsSnapshot);
    const lvl = lootItem.itemSnapshot.lvl ?? this.parseNumber(stats?.lvl) ?? 0;

    return {
      id: lootItem.itemSnapshot.itemId,
      hid: lootItem.hid,
      name: lootItem.itemSnapshot.name,
      icon: lootItem.itemSnapshot.icon,
      stat: lootItem.itemSnapshot.statRaw,
      type: lootItem.itemSnapshot.itemType,
      rarity: lootItem.itemSnapshot.rarity,
      lvl,
      prof: this.parseRequiredProf(stats?.reqp),
    };
  }

  private mapPlayerFromSnapshot(lootPlayer: LootPlayerWithSnapshot) {
    const snapshot = lootPlayer.playerSnapshot;
    const lvl = lootPlayer.lvl ?? null;
    const accountId = this.parseNumber(snapshot.accountId);
    const characterId = this.parseNumber(snapshot.characterId);
    const id = `${characterId ?? snapshot.characterId}${accountId ?? snapshot.accountId}`;
    return {
      id,
      name: snapshot.name,
      lvl,
      prof: snapshot.prof,
      icon: snapshot.icon,
      characterId,
      accountId,
      hpp: lootPlayer.hpp,
    };
  }

  private mapNpcFromSnapshot(lootNpc: LootNpcWithSnapshot): LootNpcDto {
    const snapshot = lootNpc.npcSnapshot;
    return {
      id: snapshot.npcId,
      name: snapshot.name,
      wt: snapshot.wt ?? null,
      lvl: snapshot.lvl ?? null,
      prof: snapshot.prof ?? null,
      icon: snapshot.icon,
      type: snapshot.type,
      margonemType: snapshot.margonemType ?? null,
    };
  }

  private mapNpcs(entries: LootNpcWithSnapshot[]): LootNpcDto[] {
    return entries.map((entry) => this.mapNpcFromSnapshot(entry));
  }

  private parseStatsSnapshot(
    statsSnapshot: Prisma.JsonValue | null,
  ): Record<string, string> {
    if (!statsSnapshot || typeof statsSnapshot !== "object") {
      return {};
    }
    return statsSnapshot as Record<string, string>;
  }

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseRequiredProf(reqp?: string | null): Profession[] {
    if (!reqp) return Object.values(Profession);
    return reqp
      .split("")
      .map((short) => getProfByShortname(short))
      .filter(Boolean);
  }
}
