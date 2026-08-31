import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../../prisma/contract.js";
import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import { Injectable } from "@nestjs/common";
import { PrismaService } from "#src/db/prisma.service";
import type { FetchLootsParamsDto } from "#src/loots/dto/fetch-loots-params.dto";
import type { LootItemDto } from "#src/loots/dto/loot-item.dto";
import type { LootNpcDto } from "#src/loots/dto/loot-npc.dto";
import type { LootQueryResult } from "#src/loots/dto/loot-query-result.dto";
import { LootShareResponseSchema } from "#src/shared/dto/loot-response.dto";
import { DEFAULT_PAGE_LIMIT } from "../config/pagination.js";
import { toLootVisibilityRoles } from "#src/loots/loot-visibility.prisma";
import {
  getProfByShortname,
  getShortnameByProf,
} from "#src/shared/utils/get-prof-by-shortname";

const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];
const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession = (typeof Profession)[keyof typeof Profession];
type Guild = FieldOutputTypes["public"]["Guild"];
type ItemRarityValue = (typeof ItemRarity)[keyof typeof ItemRarity];
type NpcTypeValue = (typeof NpcType)[keyof typeof NpcType];
type ProfessionValue = (typeof Profession)[keyof typeof Profession];
type Role = FieldOutputTypes["public"]["Role"];

type LootItemWithSnapshot = {
  hid: string;
  itemSnapshot: {
    itemId: number;
    name: string;
    icon: string;
    lvl: number | null;
    rarity: ItemRarityValue | null;
    itemType: string | null;
    statRaw: string;
  };
};

type LootPlayerWithSnapshot = {
  lvl: number | null;
  hpp: number | null;
  playerSnapshot: {
    accountId: number;
    characterId: number;
    name: string;
    prof: ProfessionValue | null;
    icon: string | null;
  };
};

type LootNpcWithSnapshot = {
  npcSnapshot: {
    npcId: number;
    name: string;
    wt: number | null;
    lvl: number | null;
    prof: ProfessionValue | null;
    icon: string | null;
    type: NpcTypeValue | null;
    margonemType: number | null;
  };
};

type LootWhereOptions = {
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
};

@Injectable()
export class LootQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private parseLootShare(lootShare: unknown) {
    return LootShareResponseSchema.parse(lootShare);
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

    const lootOptions: LootWhereOptions = {
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
    };

    let organizationRecordsQuery =
      this.prisma.db.orm.public.OrganizationLootRecord.where((row) =>
        and(row.guildId.eq(guild.id), row.archivedAt.isNull()),
      );
    organizationRecordsQuery = organizationRecordsQuery.where((row) =>
      row.loot.some((loot) =>
        this.buildLootPredicate(loot, permissions, roles, lootOptions),
      ),
    );
    const organizationRecords = await organizationRecordsQuery
      .include("submissions", (row) =>
        row.include("member", (rowChild) =>
          rowChild.select("name", "avatar", "userId"),
        ),
      )
      .include("comments", (row) => row.count())
      .include("loot", (row) =>
        row
          .select(
            "id",
            "uniqueId",
            "world",
            "source",
            "location",
            "lootShare",
            "createdAt",
            "updatedAt",
          )
          .include("lootItems", (rowRow) =>
            rowRow.orderBy((rowRowRow) => rowRowRow.id.asc()),
          )
          .include("lootPlayers", (rowRow) =>
            rowRow
              .include("playerSnapshot")
              .orderBy((rowRowRow) => rowRowRow.id.asc()),
          )
          .include("lootNpcs", (rowRow) =>
            rowRow
              .include("npcSnapshot")
              .orderBy((rowRowRow) => rowRowRow.id.asc()),
          ),
      )
      .orderBy((row) => row.lootId.desc())
      .limit(limit)
      .all();

    if (organizationRecords.length === 0) return [];

    return organizationRecords.map((organizationRecord): LootQueryResult => {
      const { loot } = organizationRecord;

      return {
        id: loot.id,
        uniqueId: loot.uniqueId,
        world: loot.world,
        source: loot.source,
        location: loot.location,
        lootShare: this.parseLootShare(loot.lootShare),
        createdAt: loot.createdAt,
        updatedAt: loot.updatedAt,
        items: this.mapItems(
          loot.lootItems as unknown as LootItemWithSnapshot[],
        ),
        players: (loot.lootPlayers as unknown as LootPlayerWithSnapshot[]).map(
          (entry) => this.mapPlayerFromSnapshot(entry),
        ),
        npcs: this.mapNpcs(loot.lootNpcs as unknown as LootNpcWithSnapshot[]),
        submissions: organizationRecord.submissions.map((submission) => ({
          guildId: guild.id,
          lootId: loot.id,
          memberId: submission.memberId,
          member: submission.member,
        })),
        commentsCount: organizationRecord.comments,
      };
    });
  }

  async countLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
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

    const lootQuery = this.applyBaseLootFilters(
      this.prisma.db.orm.public.Loot,
      guild,
      permissions,
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

    return lootQuery.count();
  }

  async fetchLootById(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    lootId: number,
  ): Promise<LootQueryResult | null> {
    const loot = await this.applyBaseLootFilters(
      this.prisma.db.orm.public.Loot,
      guild,
      permissions,
      roles,
      { cursor: null },
    )
      .where((row) => row.id.eq(lootId))
      .select(
        "id",
        "uniqueId",
        "world",
        "source",
        "location",
        "lootShare",
        "createdAt",
        "updatedAt",
      )
      .include("organizationLootRecords", (row) =>
        row
          .include("submissions", (rowRow) =>
            rowRow.include("member", (rowRowChild) =>
              rowRowChild.select("name", "avatar", "userId"),
            ),
          )
          .include("comments", (rowRow) => rowRow.count())
          .where((row) =>
            and(row.guildId.eq(guild.id), row.archivedAt.isNull()),
          )
          .limit(1),
      )
      .include("lootItems", (row) => row.orderBy((rowRow) => rowRow.id.asc()))
      .include("lootPlayers", (row) =>
        row.include("playerSnapshot").orderBy((rowRow) => rowRow.id.asc()),
      )
      .include("lootNpcs", (row) =>
        row.include("npcSnapshot").orderBy((rowRow) => rowRow.id.asc()),
      )
      .first();

    if (!loot) return null;

    const organizationRecord = loot.organizationLootRecords[0];
    if (!organizationRecord) return null;

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
      submissions: organizationRecord.submissions.map((submission) => ({
        guildId: guild.id,
        lootId: loot.id,
        memberId: submission.memberId,
        member: submission.member,
      })),
      commentsCount: organizationRecord.comments,
    };
  }

  async resolveLootItemByHid(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    options: { hid: string; world?: string },
  ): Promise<LootItemDto | null> {
    const hid = options.hid.trim();

    if (!hid) {
      return null;
    }

    const loot = await this.applyBaseLootFilters(
      this.prisma.db.orm.public.Loot,
      guild,
      permissions,
      roles,
      { cursor: null, hid, world: options.world },
    )
      .include("lootItems", (row) =>
        row
          .where((row) => row.hid.eq(hid))
          .orderBy((rowRow) => rowRow.id.asc())
          .limit(1),
      )
      .orderBy((row) => row.id.desc())
      .first();

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

    const snapshots = await this.prisma.db.orm.public.ItemSnapshot.where(
      (row) => row.name.in(names),
    )
      .select("id")
      .all();

    return snapshots.map((snapshot) => snapshot.id);
  }

  private applyBaseLootFilters(
    collection: any,
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    options: LootWhereOptions,
  ) {
    return collection.where((loot) =>
      and(
        loot.organizationLootRecords.some((record) =>
          and(record.guildId.eq(guild.id), record.archivedAt.isNull()),
        ),
        this.buildLootPredicate(loot, permissions, roles, options),
      ),
    );
  }

  private buildLootPredicate(
    loot: any,
    permissions: Permission[],
    roles: Role[],
    options: LootWhereOptions,
  ) {
    const predicates = [];

    if (options.world) predicates.push(loot.world.eq(options.world));
    if (options.cursor) predicates.push(loot.id.lt(Number(options.cursor)));
    if (options.createdAtMin) {
      predicates.push(loot.createdAt.gte(new Date(options.createdAtMin)));
    }
    if (options.createdAtMax) {
      predicates.push(loot.createdAt.lte(new Date(options.createdAtMax)));
    }
    if (options.players?.length) {
      predicates.push(
        loot.lootPlayers.some((player) =>
          player.playerSnapshot.some((snapshot) =>
            snapshot.name.in(options.players),
          ),
        ),
      );
    }
    if (options.npcs?.length) {
      predicates.push(
        loot.lootNpcs.some((npc) =>
          npc.npcSnapshot.some((snapshot) => snapshot.name.in(options.npcs)),
        ),
      );
    }
    if (options.hid) {
      predicates.push(loot.lootItems.some((item) => item.hid.eq(options.hid)));
    }
    if (options.itemSnapshotIds) {
      predicates.push(
        loot.lootItems.some((item) =>
          item.itemSnapshotId.in(options.itemSnapshotIds),
        ),
      );
    }

    const npcTypes = this.filterEnumValues(options.npcTypes ?? [], NpcType);
    if (npcTypes.length > 0) {
      predicates.push(
        loot.lootNpcs.some((npc) =>
          npc.npcSnapshot.some((snapshot) => snapshot._type.in(npcTypes)),
        ),
      );
    }
    const rarities = this.filterEnumValues(options.rarities ?? [], ItemRarity);
    if (rarities.length > 0) {
      predicates.push(
        loot.lootItems.some((item) =>
          item.itemSnapshot.some((snapshot) => snapshot.rarity.in(rarities)),
        ),
      );
    }
    const professions = this.filterEnumValues(
      options.professions ?? [],
      Profession,
    );
    if (professions.length > 0) {
      predicates.push(
        loot.lootItems.some((item) =>
          item.itemSnapshot.some((snapshot) =>
            or(
              not(snapshot.statRaw.ilike("%reqp=%")),
              ...professions.map((profession) =>
                snapshot.statRaw.ilike(
                  `%reqp=${getShortnameByProf(profession)}%`,
                ),
              ),
            ),
          ),
        ),
      );
    }

    this.addRangePredicate(
      predicates,
      options.npcLevelMin,
      options.npcLevelMax,
      (range) =>
        loot.lootNpcs.some((npc) =>
          npc.npcSnapshot.some((snapshot) => range(snapshot.lvl)),
        ),
    );
    this.addRangePredicate(
      predicates,
      options.itemLevelMin,
      options.itemLevelMax,
      (range) =>
        loot.lootItems.some((item) =>
          item.itemSnapshot.some((snapshot) => range(snapshot.lvl)),
        ),
    );
    this.addRangePredicate(
      predicates,
      options.playerLevelMin,
      options.playerLevelMax,
      (range) => loot.lootPlayers.some((player) => range(player.lvl)),
    );

    const search = options.search?.trim();
    if (search) {
      const pattern = `%${search}%`;
      predicates.push(
        or(
          loot.location.ilike(pattern),
          loot.lootItems.some((item) =>
            item.itemSnapshot.some((snapshot) => snapshot.name.ilike(pattern)),
          ),
          loot.lootNpcs.some((npc) =>
            npc.npcSnapshot.some((snapshot) => snapshot.name.ilike(pattern)),
          ),
          loot.lootPlayers.some((player) =>
            player.playerSnapshot.some((snapshot) =>
              snapshot.name.ilike(pattern),
            ),
          ),
        ),
      );
    }

    predicates.push(
      ...this.buildLootVisibilityPredicates(loot, permissions, roles),
    );

    return and(...predicates);
  }

  private buildLootVisibilityPredicates(
    loot: any,
    permissions: Permission[],
    roles: Role[],
  ): any[] {
    if (permissions.includes(Permission.OWNER)) return [];

    const readableRoles = toLootVisibilityRoles(roles).filter((role) =>
      role.permissions.includes(Permission.LOOTLOG_LOOTS_READ),
    );
    if (readableRoles.length === 0) return [loot.id.eq(-1)];

    return [
      loot.lootNpcs.some((npc) => npc.id.isNotNull()),
      loot.lootNpcs.every((npc) =>
        npc.npcSnapshot.some((snapshot) =>
          or(
            ...readableRoles.map((role) => {
              const rolePredicates = [
                snapshot.lvl.isNotNull(),
                snapshot.lvl.gte(role.levelFrom),
                snapshot.lvl.lte(role.levelTo),
                snapshot._type.isNotNull(),
              ];
              if (
                !role.permissions.includes(Permission.LOOTLOG_LOOTS_TITANS_READ)
              ) {
                rolePredicates.push(snapshot._type.neq(NpcType.TITAN));
              }
              if (
                !role.permissions.includes(Permission.LOOTLOG_LOOTS_HEROES_READ)
              ) {
                rolePredicates.push(
                  not(snapshot._type.in([NpcType.HERO, NpcType.EVENT_HERO])),
                );
              }
              return and(...rolePredicates);
            }),
          ),
        ),
      ),
    ];
  }

  private addRangePredicate(
    predicates: any[],
    min: number | null | undefined,
    max: number | null | undefined,
    wrap: (range: (field: any) => any) => any,
  ): void {
    if (min === undefined && max === undefined) return;
    predicates.push(
      wrap((field) =>
        and(
          field.isNotNull(),
          ...(min === undefined || min === null ? [] : [field.gte(min)]),
          ...(max === undefined || max === null ? [] : [field.lte(max)]),
        ),
      ),
    );
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
