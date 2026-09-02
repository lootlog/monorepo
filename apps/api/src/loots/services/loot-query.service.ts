import { Injectable } from "@nestjs/common";
import { ProfessionEnum as Profession } from "@lootlog/schema/loot";
import type { Permission } from "@lootlog/schema/permissions";
import type { guildTable, roleTable } from "#src/database/drizzle/schema";
import type { FetchLootsParamsDto } from "#src/loots/dto/fetch-loots-params.dto";
import type { LootItemDto } from "#src/loots/dto/loot-item.dto";
import type { LootNpcDto } from "#src/loots/dto/loot-npc.dto";
import type { LootQueryResult } from "#src/loots/dto/loot-query-result.dto";
import { LootShareResponseSchema } from "#src/shared/dto/loot-response.dto";
import { DEFAULT_PAGE_LIMIT } from "../config/pagination.js";
import { getProfByShortname } from "#src/shared/utils/get-prof-by-shortname";
import { LootQueryRepository } from "./loot-query.repository.js";

type Guild = typeof guildTable.$inferSelect;
type Role = typeof roleTable.$inferSelect;
type LootQueryRecord = Awaited<
  ReturnType<LootQueryRepository["findMany"]>
>[number];
type LootItemWithSnapshot = LootQueryRecord["lootItems"][number];
type LootPlayerWithSnapshot = LootQueryRecord["lootPlayers"][number];
type LootNpcWithSnapshot = LootQueryRecord["lootNpcs"][number];

@Injectable()
export class LootQueryService {
  constructor(private readonly repository: LootQueryRepository) {}

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

    const filters = {
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

    const organizationRecords = await this.repository.findMany({
      guildId: guild.id,
      permissions,
      roles,
      filters,
      limit,
    });

    if (organizationRecords.length === 0) return [];

    return organizationRecords.map((loot): LootQueryResult => {
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
        submissions: loot.submissions.map((submission) => ({
          guildId: guild.id,
          lootId: loot.id,
          memberId: submission.memberId,
          member: submission.member,
        })),
        commentsCount: loot.commentsCount,
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

    const filters = {
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
    };

    return this.repository.count({
      guildId: guild.id,
      permissions,
      roles,
      filters,
    });
  }

  async fetchLootById(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    lootId: number,
  ): Promise<LootQueryResult | null> {
    const loot = await this.repository.findOne({
      guildId: guild.id,
      permissions,
      roles,
      filters: { lootId },
    });

    if (!loot) return null;

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
      players: (loot.lootPlayers as unknown as LootPlayerWithSnapshot[]).map(
        (entry) => this.mapPlayerFromSnapshot(entry),
      ),
      npcs: this.mapNpcs(loot.lootNpcs as unknown as LootNpcWithSnapshot[]),
      submissions: loot.submissions.map((submission) => ({
        guildId: guild.id,
        lootId: loot.id,
        memberId: submission.memberId,
        member: submission.member,
      })),
      commentsCount: loot.commentsCount,
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

    const item = await this.repository.resolveItemByHid({
      guildId: guild.id,
      permissions,
      roles,
      hid,
      world: options.world,
    });

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

    const snapshots = await this.repository.findItemSnapshotIds(names);

    return snapshots.map((snapshot) => snapshot.id);
  }

  private parseLootShare(lootShare: unknown) {
    return LootShareResponseSchema.parse(lootShare);
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
