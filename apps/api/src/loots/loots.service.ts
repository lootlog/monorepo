import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import { createHash } from 'crypto';
import { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import {
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from 'src/loots/config/pagination';
import { ErrorKey } from 'src/loots/enum/error-key.enum';
import { PlayersService } from 'src/players/players.service';
import { NpcsService } from 'src/npcs/npcs.service';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { PrismaService } from 'src/db/prisma.service';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import {
  ItemRarity,
  Profession,
  Permission,
  Prisma,
  LootlogConfigNpc,
  Member,
  ItemType,
} from 'generated/client';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { getItemTypeByCl } from 'src/shared/utils/get-item-type-by-cl';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';

// Types for better type safety
interface Guild {
  id: string;
  name: string;
  // Add other guild properties as needed
}

interface LootlogConfig {
  id: string;
  npcs: LootlogConfigNpc[];
  // Add other config properties as needed
}

interface ProcessedLootItem {
  id: number;
  hid: string;
  name: string;
  icon: string;
  stat: string;
  pr: number;
  rarity: ItemRarity;
  prc: string;
  type: ItemType;
  prof: Profession[];
  lvl: number;
}

@Injectable()
export class LootsService {
  constructor(
    private readonly playersService: PlayersService,
    private readonly npcsService: NpcsService,
    private readonly guildsService: GuildsService,
    private readonly prisma: PrismaService,
    private readonly lootlogConfigService: LootlogConfigService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
  ) {}

  async createLoot(discordId: string, body: CreateLootDto) {
    this.validateCreateLootRequest(body);

    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_WRITE],
    );

    if (guilds.length === 0) {
      throw new ForbiddenException();
    }

    const filteredGuilds = await this.filterGuildsByBlacklist(
      discordId,
      body,
      guilds,
    );

    if (filteredGuilds.length === 0) {
      return;
    }

    const filteredGuildIds = filteredGuilds.map((guild) => guild.id);
    const [lootlogConfigs, members] = await Promise.all([
      this.lootlogConfigService.getMultipleLootlogConfigs(filteredGuildIds),
      this.getMembersByGuildIds(filteredGuildIds, discordId),
    ]);

    const processedData = this.processLootData(
      body,
      filteredGuilds,
      lootlogConfigs,
      members,
    );

    if (processedData.length === 0) {
      return;
    }

    // TODO: Re-enable indexing when types are fixed
    // const npcs = this.mapNpcs(this.sortNpcsByWt(body.npcs));
    // const players = this.mapPlayers(body.players);
    // this.playersService.bulkIndexPlayers(players);
    // this.npcsService.bulkIndexNpcs(npcs);

    await this.saveLootData(processedData);
  }

  private validateCreateLootRequest(body: CreateLootDto) {
    if (body.loots.length > 10) {
      throw new BadRequestException('TOO MANY LOOTS');
    }
  }

  private async filterGuildsByBlacklist(
    discordId: string,
    body: CreateLootDto,
    guilds: Guild[],
  ): Promise<Guild[]> {
    const config =
      await this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        body.accountId,
        body.characterId,
      );

    return guilds.filter(
      (guild) => !config?.collectLootBlaclistGuildIds?.includes(guild.id),
    );
  }

  private async getMembersByGuildIds(
    filteredGuildIds: string[],
    discordId: string,
  ): Promise<Member[]> {
    return this.prisma.member.findMany({
      where: {
        guildId: { in: filteredGuildIds },
        userId: discordId,
      },
    });
  }

  private processLootData(
    body: CreateLootDto,
    filteredGuilds: Guild[],
    lootlogConfigs: LootlogConfig[],
    members: Member[],
  ): Prisma.LootCreateManyInput[] {
    const highestWtNpc = this.getHighestWtNpc(body.npcs);
    const highestWtNpcType = getNpcTypeByWt(
      highestWtNpc.wt,
      highestWtNpc.prof,
      highestWtNpc.type,
    );

    const npcs = this.mapNpcs(this.sortNpcsByWt(body.npcs));
    const players = this.mapPlayers(body.players);

    return filteredGuilds.reduce((acc, guild) => {
      const config = lootlogConfigs.find((config) => config.id === guild.id);
      const calculatedLoot = this.getLootForGivenConfig(
        body.loots,
        config.npcs,
        highestWtNpcType,
      );

      if (calculatedLoot.length === 0) return acc;

      const member = members.find(({ guildId }) => guildId === guild.id);
      const uniqueLootId = this.createUniqueLootId(
        body.loots,
        body.world,
        guild.id,
      );

      acc.push({
        uniqueId: uniqueLootId,
        guildId: guild.id,
        world: body.world,
        source: body.source,
        location: body.location,
        memberId: member.id,
        npcs,
        players,
        items: calculatedLoot,
      });

      return acc;
    }, []);
  }

  private getHighestWtNpc(npcs: CreateLootDto['npcs']) {
    return npcs.reduce((prev, current) =>
      prev && prev.wt > current.wt ? prev : current,
    );
  }

  private async saveLootData(
    data: Prisma.LootCreateManyInput[],
  ): Promise<void> {
    try {
      await this.prisma.loot.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      console.error('Error saving loot data:', error);
      throw new BadRequestException('Failed to save loot data');
    }
  }

  async fetchLootsByGuildId(
    guildId: string,
    permissions: Permission[],
    params: FetchLootsParamsDto,
  ) {
    const {
      cursor = null,
      limit = DEFAULT_PAGE_LIMIT,
      npcTypes,
      npcs,
      players,
      rarities,
      world,
    } = params;

    if (limit > MAX_PAGE_LIMIT) {
      throw new BadRequestException({
        message: ErrorKey.PAGINATION_LIMIT_TOO_HIGH,
      });
    }

    const conditions = this.buildQueryConditions({
      players,
      npcs,
      npcTypes,
      rarities,
      cursor,
    });

    const query = Prisma.sql`
      SELECT * FROM "Loot"
      WHERE "guildId" = ${guildId}
      AND "world" = ${world}
      ${conditions.playersCondition}
      ${conditions.npcsCondition}
      ${conditions.npcTypesCondition}
      ${conditions.raritiesCondition}
      ${conditions.cursorCondition}
      ORDER BY "id" DESC
      LIMIT ${limit};
    `;

    return this.prisma.$queryRaw(query);
  }

  private buildQueryConditions({
    players,
    npcs,
    npcTypes,
    rarities,
    cursor,
  }: {
    players: string[];
    npcs: string[];
    npcTypes: string[];
    rarities: string[];
    cursor: number | null;
  }) {
    return {
      playersCondition:
        players.length > 0
          ? Prisma.sql`
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements("players") AS player
            WHERE player->>'name' = ANY(ARRAY[${Prisma.join(players)}]::text[])
          )`
          : Prisma.sql``,

      npcsCondition:
        npcs.length > 0
          ? Prisma.sql`
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements("npcs") AS npc
            WHERE npc->>'name' = ANY(ARRAY[${Prisma.join(npcs)}]::text[])
          )`
          : Prisma.sql``,

      npcTypesCondition:
        npcTypes.length > 0
          ? Prisma.sql`
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements("npcs") AS npc
            WHERE npc->>'type' = ANY(ARRAY[${Prisma.join(npcTypes)}]::text[])
          )`
          : Prisma.sql``,

      raritiesCondition:
        rarities.length > 0
          ? Prisma.sql`
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements("items") AS loot
            WHERE loot->>'rarity' = ANY(ARRAY[${Prisma.join(rarities)}]::text[])
          )`
          : Prisma.sql``,

      cursorCondition: cursor
        ? Prisma.sql`AND "id" < ${Number(cursor)}`
        : Prisma.sql``,
    };
  }

  createUniqueLootId(
    loots: CreateLootDto['loots'],
    world: string,
    guildId: string,
  ) {
    const string =
      loots
        .map((loot) => loot.hid)
        .sort((a, b) => a.localeCompare(b)) // Prostsze sortowanie
        .join('') +
      world +
      guildId;

    return createHash('sha256').update(string).digest('hex');
  }

  parseItemStats(stats: string) {
    return stats.split(';').reduce(
      (acc, stat) => {
        const [key, value] = stat.split('=');
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, string>,
    );
  }

  getItemStats({ stat, cl }: CreateLootDto['loots'][0]) {
    const parsedStats = this.parseItemStats(stat);

    const lvl = parsedStats['lvl'] ? Number(parsedStats['lvl']) : 0;
    const rarity = parsedStats['rarity']?.toUpperCase() as ItemRarity;
    const requiredProf = parsedStats['reqp'] as string;
    const requiredProfArray = requiredProf
      ? requiredProf
          .split('')
          .map((id) => getProfByShortname(id))
          .filter(Boolean) // Prostsze od filter((prof) => prof)
      : Object.values(Profession);
    const type = getItemTypeByCl(cl);

    return {
      lvl,
      rarity,
      prof: requiredProfArray,
      type,
    };
  }

  sortNpcsByWt(npcs: CreateLootDto['npcs']) {
    return [...npcs].sort((a, b) => b.wt - a.wt); // Prostsze sortowanie malejące
  }

  getLootForGivenConfig(
    loot: CreateLootDto['loots'],
    npcs: LootlogConfigNpc[],
    highestWtNpcType: string,
  ): ProcessedLootItem[] {
    const targetNpc = npcs.find((npc) => npc.npcType === highestWtNpcType);
    if (!targetNpc) {
      return [];
    }

    return loot
      .map((item) => {
        const { rarity, lvl, type, prof } = this.getItemStats(item);

        if (!targetNpc.allowedRarities.includes(rarity)) {
          return null;
        }

        return {
          id: item.id,
          hid: item.hid,
          name: item.name,
          icon: item.icon,
          stat: item.stat,
          pr: item.pr,
          rarity,
          prc: item.prc,
          type,
          prof,
          lvl,
        };
      })
      .filter(Boolean) as ProcessedLootItem[]; // Type assertion after filter
  }

  mapNpcs(npcs: CreateLootDto['npcs']) {
    return npcs.map((npc) => ({
      id: npc.id,
      name: npc.name,
      lvl: npc.lvl,
      prof: getProfByShortname(npc.prof),
      icon: npc.icon,
      wt: npc.wt,
      location: npc.location,
      type: getNpcTypeByWt(npc.wt, npc.prof, npc.type),
      margonemType: npc.type,
    }));
  }

  mapPlayers(players: CreateLootDto['players']) {
    return players.map((player) => ({
      id: `${player.id}${player.accountId}`,
      name: player.name,
      lvl: player.lvl,
      prof: getProfByShortname(player.prof),
      icon: player.icon,
      characterId: player.id,
      accountId: player.accountId,
    }));
  }
}
