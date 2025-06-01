import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import { createHash } from 'crypto';
import { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import {
  DEFAULT_OFFSET,
  DEFAULT_PAGE_LIMIT,
  MAX_PAGE_LIMIT,
} from 'src/loots/config/pagination';
import { ErrorKey } from 'src/loots/enum/error-key.enum';
import { PlayersService } from 'src/players/players.service';
import { NpcsService } from 'src/npcs/npcs.service';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { PrismaService } from 'src/db/prisma.service';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { Prisma } from '@prisma/client';
import {
  ItemRarity,
  Profession,
  ItemType,
  NpcType,
  Permission,
  // Item,
  LootlogConfig,
  LootlogConfigNpc,
} from '@prisma/client';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { getItemTypeByCl } from 'src/shared/utils/get-item-type-by-cl';
import { UsersService } from 'src/users/users.service';
import { GuildsService } from 'src/guilds/guilds.service';

@Injectable()
export class LootsService {
  constructor(
    private readonly playersService: PlayersService,
    private readonly npcsService: NpcsService,
    private readonly guildsService: GuildsService,
    private readonly prisma: PrismaService,
    private readonly lootlogConfigService: LootlogConfigService,
  ) {}

  async createLoot(userId: string, body: CreateLootDto) {
    if (body.loots.length > 10) {
      throw new BadRequestException('TOO MANY LOOTS');
    }

    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      userId,
      [Permission.LOOTLOG_WRITE],
    );
    if (guilds.length === 0) {
      throw new ForbiddenException();
    }

    const guildIds = guilds.map(({ id }) => id);
    const lootlogConfigs =
      await this.lootlogConfigService.getMultipleLootlogConfigs(guildIds);
    const members = await this.prisma.member.findMany({
      where: {
        guildId: {
          in: guildIds,
        },
        userId,
      },
    });

    const highestWtNpc = body.npcs.reduce((prev, current) => {
      return prev && prev.wt > current.wt ? prev : current;
    });
    const highestWtNpcType = getNpcTypeByWt(
      highestWtNpc.wt,
      highestWtNpc.prof,
      highestWtNpc.type,
    );

    const sortedNpcsByWt = this.sortNpcsByWt(body.npcs);

    const npcs = this.mapNpcs(sortedNpcsByWt);
    const players = this.mapPlayers(body.players);

    const data = guilds.reduce((acc, guild) => {
      const config = lootlogConfigs.find((config) => config.id === guild.id);
      const calculatedLoot = this.getLootForGivenConfig(
        body.loots,
        config.npcs,
        highestWtNpcType,
      );

      if (calculatedLoot.length === 0) return acc;
      const uniqueLootId = this.createUniqueLootId(
        body.loots,
        body.world,
        guild.id,
      );
      const member = members.find(({ guildId }) => guildId === guild.id);

      acc.push({
        uniqueId: uniqueLootId,
        guildId: guild.id,
        world: body.world,
        source: body.source,
        location: body.location,
        memberId: member.id,
        npcs,
        players,
        loots: calculatedLoot,
      });

      return acc;
    }, []);

    if (data.length === 0) return;

    this.playersService.bulkIndexPlayers(players);
    this.npcsService.bulkIndexNpcs(npcs);

    try {
      await this.prisma.loot.createMany({
        data,
        skipDuplicates: true,
      });
    } catch (error) {
      console.log(error);
    }

    return;
  }

  async fetchLootsByGuildId(
    guildId: string,
    permissions: Permission[],
    {
      cursor = null,
      limit = DEFAULT_PAGE_LIMIT,
      npcTypes,
      npcs,
      players,
      rarities,
      world,
    }: FetchLootsParamsDto,
  ) {
    if (limit > MAX_PAGE_LIMIT) {
      throw new BadRequestException({
        message: ErrorKey.PAGINATION_LIMIT_TOO_HIGH,
      });
    }

    // @TODO = add permissions for titans

    const playersCondition =
      players.length > 0
        ? Prisma.sql`
    AND EXISTS (
        SELECT 1
        FROM jsonb_array_elements("players") AS player
        WHERE player->>'id' = ANY(ARRAY[${Prisma.join(players)}]::text[])
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
        FROM jsonb_array_elements("loots") AS loot
        WHERE loot->>'rarity' = ANY(ARRAY[${Prisma.join(rarities)}]::text[])
        )`
        : Prisma.sql``;

    const cursorCondition = cursor
      ? Prisma.sql`
    AND "id" < ${Number(cursor)}
    `
      : Prisma.sql``;

    const query = Prisma.sql`
      SELECT * FROM "Loot"
      WHERE "guildId" = ${guildId}
      AND "world" = ${world}
      ${playersCondition}
      ${npcsCondition}
      ${npcTypesCondition}
      ${raritiesCondition}
      ${cursorCondition}
      ORDER BY "id" DESC
      LIMIT ${limit};
    `;

    const loots = await this.prisma.$queryRaw(query);

    return loots;
  }

  createUniqueLootId(
    loots: CreateLootDto['loots'],
    world: string,
    guildId: string,
  ) {
    const string =
      loots
        .sort((a, b) => {
          if (a.hid > b.hid) {
            return 1;
          }

          if (a.hid < b.hid) {
            return -1;
          }

          return 0;
        })
        .map((loot) => loot.hid)
        .join('') +
      world +
      guildId;

    return createHash('sha256').update(string).digest('hex');
  }

  parseItemStats(stats: string) {
    const split = stats.split(';');
    const statsObj = {};

    split.forEach((stat) => {
      const [key, value] = stat.split('=');

      statsObj[key] = value;
    });

    return statsObj;
  }

  getItemStats({ stat, cl }: CreateLootDto['loots'][0]) {
    const parsedStats = this.parseItemStats(stat);

    const lvl = parsedStats['lvl'] as number;
    const rarity = parsedStats['rarity']?.toUpperCase() as ItemRarity;
    const requiredProf = parsedStats['reqp'] as string;
    const requiredProfArray = requiredProf
      ? requiredProf
          .split('')
          .map((id) => getProfByShortname(id))
          .filter((prof) => prof)
      : Object.values(Profession);
    const type = getItemTypeByCl(cl);

    return {
      lvl: lvl ? +lvl : 0,
      rarity,
      prof: requiredProfArray,
      type,
    };
  }

  sortNpcsByWt(npcs: CreateLootDto['npcs']) {
    return npcs.sort((a, b) => {
      if (a.wt > b.wt) {
        return -1;
      }

      if (a.wt < b.wt) {
        return 0;
      }

      return 0;
    });
  }

  getLootForGivenConfig(
    loot: CreateLootDto['loots'],
    npcs: LootlogConfigNpc[],
    highestWtNpcType,
  ) {
    const calculatedLoot = loot.reduce((acc, loot) => {
      const { rarity, lvl, type, prof } = this.getItemStats(loot);
      const { allowedRarities } = npcs.find(
        (npc) => highestWtNpcType === npc.npcType,
      );

      if (allowedRarities.includes(rarity)) {
        acc.push({
          id: loot.id,
          hid: loot.hid,
          name: loot.name,
          icon: loot.icon,
          stat: loot.stat,
          pr: loot.pr,
          rarity: rarity,
          prc: loot.prc,
          type: type,
          prof: prof,
          lvl: lvl,
        });
      }

      return acc;
    }, []);

    return calculatedLoot;
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
