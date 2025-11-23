import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';
import {
  Prisma,
  Permission,
  Profession,
  ItemRarity,
  NpcType,
  type Guild,
  type Role,
} from 'generated/client';
import type { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import { DEFAULT_PAGE_LIMIT } from '../config/pagination';
import { isAdministrativeUser } from 'src/shared/permissions/is-administrative-user';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';

type SubmissionWithMember = Prisma.LootSubmissionGetPayload<{
  include: {
    member: {
      select: {
        name: true;
        avatar: true;
        userId: true;
      };
    };
  };
}>;

type LootItemWithSnapshot = Prisma.LootItemGetPayload<{
  include: { itemSnapshot: true };
}>;

type LootPlayerWithSnapshot = Prisma.LootPlayerGetPayload<{
  include: { playerSnapshot: true };
}>;

type LootNpcWithSnapshot = Prisma.LootNpcGetPayload<{
  include: { npcSnapshot: true };
}>;

type LootSelection = Prisma.LootGetPayload<{
  select: {
    id: true;
    uniqueId: true;
    world: true;
    source: true;
    location: true;
    lootShare: true;
    createdAt: true;
    updatedAt: true;
  };
}>;

type LootItemDto = {
  id: number;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  type: string | null;
  rarity: ItemRarity | null;
  lvl: number;
  prof: Profession[];
};

type LootPlayerDto = {
  id: string;
  name: string;
  lvl: number | null;
  prof: Profession | null;
  icon: string | null;
  characterId: number | null;
  accountId: number | null;
  hpp: number | null;
};

type LootNpcDto = {
  id: number;
  name: string;
  wt: number | null;
  lvl: number | null;
  prof: Profession | null;
  icon: string | null;
  type: NpcType | null;
  margonemType: number | null;
};

type LootQueryResult = LootSelection & {
  items: LootItemDto[];
  players: LootPlayerDto[];
  npcs: LootNpcDto[];
  submissions: SubmissionWithMember[];
  commentsCount: bigint;
};

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
      levelRangesCondition,
    ].filter(Boolean) as Prisma.LootWhereInput[];

    if (andConditions.length > 0) {
      baseWhere.AND = andConditions;
    }

    const lootsSelection = await this.prisma.loot.findMany({
      where: baseWhere,
      orderBy: { id: 'desc' },
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
      },
    });

    if (!lootsSelection.length) return [];

    const lootIds = lootsSelection.map((l) => l.id);

    const [submissions, lootItems, lootPlayers, lootNpcs, commentsCounts] =
      await Promise.all([
        this.prisma.lootSubmission.findMany({
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
        }),
        this.prisma.lootItem.findMany({
          where: { lootId: { in: lootIds } },
          include: { itemSnapshot: true },
          orderBy: { id: 'asc' },
        }),
        this.prisma.lootPlayer.findMany({
          where: { lootId: { in: lootIds } },
          include: { playerSnapshot: true },
          orderBy: { id: 'asc' },
        }),
        this.prisma.lootNpc.findMany({
          where: { lootId: { in: lootIds } },
          include: { npcSnapshot: true },
          orderBy: { id: 'asc' },
        }),
        this.prisma.lootComment.groupBy({
          by: ['lootId'],
          where: {
            lootId: { in: lootIds },
            guildId: guild.id,
          },
          _count: { _all: true },
        }),
      ]);

    const submissionsByLootId = this.groupByLootId(submissions);
    const lootItemsByLootId = this.groupByLootId(lootItems);
    const lootPlayersByLootId = this.groupByLootId(lootPlayers);
    const lootNpcsByLootId = this.groupByLootId(lootNpcs);
    const commentsCountByLootId = commentsCounts.reduce(
      (acc, group) => {
        acc[group.lootId] = BigInt(group._count._all);
        return acc;
      },
      {} as Record<number, bigint>,
    );

    const lootsWithRelations: LootQueryResult[] = lootsSelection.map((loot) => {
      const associatedItems = lootItemsByLootId[loot.id] ?? [];
      const associatedPlayers = lootPlayersByLootId[loot.id] ?? [];
      const associatedNpcs = lootNpcsByLootId[loot.id] ?? [];

      return {
        ...loot,
        items: this.mapItems(associatedItems),
        players: associatedPlayers.map((entry) =>
          this.mapPlayerFromSnapshot(entry),
        ),
        npcs: this.mapNpcs(associatedNpcs),
        submissions: submissionsByLootId[loot.id] ?? [],
        commentsCount: commentsCountByLootId[loot.id] ?? BigInt(0),
      };
    });

    return lootsWithRelations;
  }

  private buildLevelRangesCondition(
    filteredRoles: Role[],
    administrativeUser: boolean,
  ): Prisma.LootWhereInput | null {
    if (filteredRoles.length === 0 || administrativeUser) {
      return null;
    }

    const roleConditions = filteredRoles.map((role) =>
      this.buildRoleVisibilityCondition(role),
    );

    return roleConditions.length > 0 ? { OR: roleConditions } : null;
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

  private buildRoleVisibilityCondition(role: Role): Prisma.LootWhereInput {
    const hasReadTitans = role.permissions?.includes(
      Permission.LOOTLOG_READ_LOOTS_TITANS,
    );
    const hasReadHeroes = role.permissions?.includes(
      Permission.LOOTLOG_READ_LOOTS_HEROES,
    );

    const lvlFrom = role.lvlRangeFrom ?? 0;
    const lvlTo = role.lvlRangeTo ?? 500;
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

    return {
      lootNpcs: {
        some: {
          npcSnapshot: {
            AND: npcConstraints,
          },
        },
      },
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

  private groupByLootId<T extends { lootId: number }>(rows: T[]) {
    return rows.reduce(
      (acc, row) => {
        (acc[row.lootId] ??= []).push(row);
        return acc;
      },
      {} as Record<number, T[]>,
    );
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
    if (!statsSnapshot || typeof statsSnapshot !== 'object') {
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
      .split('')
      .map((short) => getProfByShortname(short))
      .filter(Boolean);
  }
}
