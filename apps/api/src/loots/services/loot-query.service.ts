import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/db/prisma.service";
import {
  ItemRarity,
  NpcType,
  Profession,
  type Guild,
  type Prisma,
  type Role,
} from "src/generated/prisma/client";
import type { FetchLootsParamsDto } from "src/loots/dto/fetch-loots-params.dto";
import type { LootItemDto } from "src/loots/dto/loot-item.dto";
import type { LootNpcDto } from "src/loots/dto/loot-npc.dto";
import type { LootQueryResult } from "src/loots/dto/loot-query-result.dto";
import { LootShareResponseSchema } from "src/shared/dto/loot-response.dto";
import { DEFAULT_PAGE_LIMIT } from "../config/pagination";
import {
  buildNpcSnapshotVisibilityWhere,
  createStrategicAccessContext,
  LOOT_VISIBILITY_PERMISSIONS,
} from "src/shared/permissions/strategic-access-policy";
import {
  getProfByShortname,
  getShortnameByProf,
} from "src/shared/utils/get-prof-by-shortname";

const lootItemSelect = {
  hid: true,
  itemSnapshot: {
    select: {
      itemId: true,
      name: true,
      icon: true,
      lvl: true,
      rarity: true,
      itemType: true,
      statRaw: true,
    },
  },
} satisfies Prisma.LootItemSelect;

type LootItemWithSnapshot = Prisma.LootItemGetPayload<{
  select: typeof lootItemSelect;
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
    viewerDiscordId: string,
    roles: Role[],
    {
      cursor = null,
      limit = DEFAULT_PAGE_LIMIT,
      npcTypes = [],
      npcs = [],
      players = [],
      rarities = [],
      professions = [],
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
    const itemSnapshotIds = await this.resolveItemSnapshotIds(itemNames);

    if (itemSnapshotIds?.length === 0) {
      return [];
    }

    const baseWhere = this.buildBaseWhereCondition(
      guild,
      viewerDiscordId,
      roles,
      {
        npcTypes,
        npcs,
        players,
        rarities,
        professions,
        npcLevelMin,
        npcLevelMax,
        itemLevelMin,
        itemLevelMax,
        playerLevelMin,
        playerLevelMax,
        search,
        world,
        hid,
        itemSnapshotIds,
        cursor,
        createdAtMin,
        createdAtMax,
      },
    );

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
          select: lootItemSelect,
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
      lootShare: this.parseLootShare(loot.lootShare),
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

  async countLootsByGuildId(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    {
      npcTypes = [],
      npcs = [],
      players = [],
      rarities = [],
      professions = [],
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
    const itemSnapshotIds = await this.resolveItemSnapshotIds(itemNames);

    if (itemSnapshotIds?.length === 0) {
      return 0;
    }

    const baseWhere = this.buildBaseWhereCondition(
      guild,
      viewerDiscordId,
      roles,
      {
        npcTypes,
        npcs,
        players,
        rarities,
        professions,
        npcLevelMin,
        npcLevelMax,
        itemLevelMin,
        itemLevelMax,
        playerLevelMin,
        playerLevelMax,
        search,
        world,
        hid,
        itemSnapshotIds,
        cursor: null,
        createdAtMin,
        createdAtMax,
      },
    );

    return this.prisma.loot.count({
      where: baseWhere,
    });
  }

  async fetchLootById(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    lootId: number,
  ): Promise<LootQueryResult | null> {
    const baseWhere = this.buildBaseWhereCondition(
      guild,
      viewerDiscordId,
      roles,
      {
        cursor: null,
      },
    );

    const loot = await this.prisma.loot.findFirst({
      where: {
        ...baseWhere,
        id: lootId,
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
          select: lootItemSelect,
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
      lootShare: this.parseLootShare(loot.lootShare),
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

  async canViewLootById(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    lootId: number,
  ): Promise<boolean> {
    const baseWhere = this.buildBaseWhereCondition(
      guild,
      viewerDiscordId,
      roles,
      { cursor: null },
    );
    const loot = await this.prisma.loot.findFirst({
      where: {
        ...baseWhere,
        id: lootId,
      },
      select: { id: true },
    });

    return loot !== null;
  }

  async resolveLootItemByHid(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    options: { hid: string; world?: string },
  ): Promise<LootItemDto | null> {
    const hid = options.hid.trim();

    if (!hid) {
      return null;
    }

    const baseWhere = this.buildBaseWhereCondition(
      guild,
      viewerDiscordId,
      roles,
      {
        cursor: null,
        hid,
        world: options.world,
      },
    );

    const loot = await this.prisma.loot.findFirst({
      where: baseWhere,
      orderBy: { id: "desc" },
      select: {
        lootItems: {
          where: { hid },
          select: lootItemSelect,
          orderBy: { id: "asc" },
          take: 1,
        },
      },
    });

    const item = loot?.lootItems[0];

    return item ? this.mapItemFromSnapshot(item) : null;
  }

  private async resolveItemSnapshotIds(
    itemNames?: string[],
  ): Promise<number[] | undefined> {
    const names = Array.from(
      new Set((itemNames ?? []).map((name) => name.trim()).filter(Boolean)),
    );

    if (names.length === 0) {
      return undefined;
    }

    const snapshots = await this.prisma.itemSnapshot.findMany({
      where: {
        name: {
          in: names,
        },
      },
      select: {
        id: true,
      },
    });

    return snapshots.map((snapshot) => snapshot.id);
  }

  private buildBaseWhereCondition(
    guild: Guild,
    viewerDiscordId: string,
    roles: Role[],
    {
      npcTypes = [],
      npcs = [],
      players = [],
      rarities = [],
      professions = [],
      npcLevelMin,
      npcLevelMax,
      itemLevelMin,
      itemLevelMax,
      playerLevelMin,
      playerLevelMax,
      search,
      world,
      hid,
      itemSnapshotIds,
      cursor,
      createdAtMin,
      createdAtMax,
    }: {
      npcTypes?: string[];
      npcs?: string[];
      players?: string[];
      rarities?: string[];
      professions?: string[];
      npcLevelMin?: number;
      npcLevelMax?: number;
      itemLevelMin?: number;
      itemLevelMax?: number;
      playerLevelMin?: number;
      playerLevelMax?: number;
      search?: string;
      world?: string;
      hid?: string;
      itemSnapshotIds?: number[];
      cursor?: number | null;
      createdAtMin?: string;
      createdAtMax?: string;
    },
  ): Prisma.LootWhereInput {
    const accessContext = createStrategicAccessContext({
      organizationId: guild.id,
      ownerId: guild.ownerId,
      viewerDiscordId,
      roles,
    });
    const npcSnapshotVisibilityWhere = buildNpcSnapshotVisibilityWhere(
      accessContext,
      LOOT_VISIBILITY_PERMISSIONS,
    );
    const visibilityCondition = npcSnapshotVisibilityWhere
      ? {
          lootNpcs: {
            some: {
              npcSnapshot: npcSnapshotVisibilityWhere,
            },
          },
        }
      : null;
    const playersCondition = this.buildPlayersCondition(players);
    const npcsCondition = this.buildNpcsCondition(npcs);
    const npcTypesCondition = this.buildNpcTypesCondition(npcTypes);
    const raritiesCondition = this.buildRaritiesCondition(rarities);
    const itemProfessionsCondition =
      this.buildItemProfessionsCondition(professions);
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
    const itemSnapshotIdsCondition =
      this.buildItemSnapshotIdsCondition(itemSnapshotIds);
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
      itemProfessionsCondition,
      npcLevelsCondition,
      itemLevelsCondition,
      playerLevelsCondition,
      visibilityCondition,
      searchCondition,
      hidCondition,
      itemSnapshotIdsCondition,
      createdAtCondition,
    ].filter(Boolean) as Prisma.LootWhereInput[];

    if (andConditions.length > 0) {
      baseWhere.AND = andConditions;
    }

    return baseWhere;
  }

  private parseLootShare(lootShare: Prisma.JsonValue) {
    return LootShareResponseSchema.parse(lootShare);
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
          hid,
        },
      },
    };
  }

  private buildItemSnapshotIdsCondition(
    itemSnapshotIds?: number[],
  ): Prisma.LootWhereInput | null {
    if (!itemSnapshotIds) {
      return null;
    }

    return {
      lootItems: {
        some: {
          itemSnapshotId: {
            in: itemSnapshotIds,
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

  private buildItemProfessionsCondition(
    professions: string[],
  ): Prisma.LootWhereInput | null {
    const allowedProfessions = this.filterEnumValues(professions, Profession);
    if (allowedProfessions.length === 0) {
      return null;
    }

    return {
      lootItems: {
        some: {
          itemSnapshot: {
            OR: [
              {
                statRaw: {
                  not: {
                    contains: "reqp=",
                  },
                },
              },
              ...allowedProfessions.map((profession) => ({
                statsSnapshot: {
                  path: ["reqp"],
                  string_contains: getShortnameByProf(profession),
                },
              })),
            ],
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
    const statRaw = lootItem.itemSnapshot.statRaw;
    const lvl =
      lootItem.itemSnapshot.lvl ??
      this.parseNumber(this.parseStatValue(statRaw, "lvl")) ??
      0;

    return {
      id: lootItem.itemSnapshot.itemId,
      hid: lootItem.hid,
      name: lootItem.itemSnapshot.name,
      icon: lootItem.itemSnapshot.icon,
      stat: statRaw,
      type: lootItem.itemSnapshot.itemType,
      rarity: lootItem.itemSnapshot.rarity,
      lvl,
      prof: this.parseRequiredProf(this.parseStatValue(statRaw, "reqp")),
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

  private parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseStatValue(statRaw: string, key: string): string | null {
    const prefix = `${key}=`;
    const segment = statRaw
      .split(";")
      .find((entry) => entry.startsWith(prefix));

    return segment?.slice(prefix.length) ?? null;
  }

  private parseRequiredProf(reqp?: string | null): Profession[] {
    if (!reqp) return Object.values(Profession);
    return reqp
      .split("")
      .map((short) => getProfByShortname(short))
      .filter(Boolean);
  }
}
