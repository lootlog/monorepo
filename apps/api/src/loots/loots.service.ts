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
  Guild,
  Role,
} from 'generated/client';
import { getProfByShortname } from 'src/shared/utils/get-prof-by-shortname';
import { getItemTypeByCl } from 'src/shared/utils/get-item-type-by-cl';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import { isAdministrativeUser } from 'src/shared/permissions/is-administrative-user';
import { UpdateLootDto } from 'src/loots/dto/update-loot.dto';
import {
  LOOT_SHARE_ITEM_REGEX,
  LOOT_SHARE_MSG_REGEX,
} from 'src/loots/constants/loot-share-msg-regex';

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
    if (body.loots.length > 10) {
      throw new BadRequestException('TOO MANY LOOTS');
    }

    const uniqueId = this.createUniqueLootId(body.loots, body.world);

    const guilds = await this.guildsService.getGuildsForRequiredPermissions(
      discordId,
      [Permission.LOOTLOG_WRITE],
    );
    if (guilds.length === 0) {
      throw new ForbiddenException();
    }

    const config =
      await this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        body.accountId,
        body.characterId,
      );

    const { filteredGuildIds, filteredGuilds } = guilds.reduce(
      (acc, guild) => {
        const isOnBlacklist = config?.collectLootBlaclistGuildIds?.includes(
          guild.id,
        );
        if (!isOnBlacklist) {
          acc.filteredGuilds.push(guild);
          acc.filteredGuildIds.push(guild.id);
        }
        return acc;
      },
      { filteredGuilds: [], filteredGuildIds: [] as string[] },
    );

    const [lootlogConfigs, members] = await Promise.all([
      this.lootlogConfigService.getMultipleLootlogConfigs(filteredGuildIds),
      this.prisma.member.findMany({
        where: {
          guildId: { in: filteredGuildIds },
          userId: discordId,
        },
      }),
    ]);

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
    const items = this.mapItems(body.loots);

    let loot = await this.prisma.loot.findUnique({ where: { uniqueId } });

    if (!loot) {
      try {
        loot = await this.prisma.loot.create({
          data: {
            uniqueId,
            items,
            world: body.world,
            source: body.source,
            location: body.location,
            players,
            npcs,
          },
        });
      } catch (e: any) {
        if (e.code === 'P2002') {
          loot = await this.prisma.loot.findUnique({ where: { uniqueId } });
          if (!loot) throw e;
        } else {
          throw e;
        }
      }
    }

    await Promise.all(
      filteredGuilds.map(async (guild) => {
        const config = lootlogConfigs.find((c) => c.id === guild.id);
        const calculatedLoot = this.getLootForGivenConfig(
          body.loots,
          config.npcs,
          highestWtNpcType,
        );

        if (calculatedLoot.length === 0) return;

        const member = members.find(({ guildId }) => guildId === guild.id);
        if (!member) return;

        await this.prisma.lootSubmission.upsert({
          where: {
            lootId_guildId_memberId: {
              lootId: loot.id,
              guildId: guild.id,
              memberId: member.id,
            },
          },
          update: {},
          create: {
            lootId: loot.id,
            guildId: guild.id,
            memberId: member.id,
          },
        });
      }),
    );

    this.playersService.bulkIndexPlayers(players);
    this.npcsService.bulkIndexNpcs(npcs);

    return { id: loot.id };
  }

  async updateLoot(discordId: string, lootId: number, data: UpdateLootDto) {
    const loot = await this.prisma.loot.findFirst({
      where: {
        id: lootId,
        lootSubmissions: { some: { member: { userId: discordId } } },
        lootShare: {
          equals: {},
        },
      },
    });

    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT);
    }

    const lootShare = this.getLootShareFromMsg(data.msg);
    if (Object.keys(lootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE);
    }

    const parsedPlayers =
      typeof loot.players === 'string'
        ? JSON.parse(loot.players)
        : loot.players;

    const parsedLoot =
      typeof loot.items === 'string' ? JSON.parse(loot.items) : loot.items;

    const mappedLootShare = Object.entries(lootShare).reduce(
      (acc, [nick, hids]) => {
        const playerId = parsedPlayers.find((p) => p.name === nick)?.id;
        if (!playerId) return acc;

        const itemIds = (hids as string[])
          .map((hid) => parsedLoot.find((item) => item.hid === hid)?.hid)
          .filter(Boolean);

        if (itemIds.length === 0) return acc;

        acc[playerId] = itemIds;
        return acc;
      },
      {},
    );

    if (Object.keys(mappedLootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE_ITEM_OR_PLAYER);
    }

    if (Object.keys(mappedLootShare).length < parsedLoot.length) {
      console.warn(
        'Loot share does not include all items, some items may not be shared.',
      );
      console.log(data.msg);
    }

    await this.prisma.loot.update({
      where: { id: lootId },
      data: {
        lootShare: mappedLootShare,
      },
    });

    return mappedLootShare;
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
            return Prisma.sql`
          (
            (npc->>'lvl')::int >= ${role.lvlRangeFrom}
            AND (npc->>'lvl')::int <= ${role.lvlRangeTo}
            AND (
            (npc->>'type') != 'TITAN'
            OR (${hasReadTitans ? Prisma.sql`TRUE` : Prisma.sql`FALSE`})
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

    const loots: any[] = await this.prisma.$queryRaw(Prisma.sql`
    SELECT DISTINCT ON (l."id") l.*
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

    const submissionsByLootId: Record<number, typeof submissions> = {};
    for (const sub of submissions) {
      if (!submissionsByLootId[sub.lootId]) {
        submissionsByLootId[sub.lootId] = [];
      }
      submissionsByLootId[sub.lootId].push(sub);
    }

    return loots.map((loot) => ({
      ...loot,
      submissions: submissionsByLootId[loot.id] || [],
    }));
  }

  createUniqueLootId(loots: CreateLootDto['loots'], world: string): string {
    const string =
      [...loots]
        .sort((a, b) => a.hid.localeCompare(b.hid))
        .map((loot) => loot.hid)
        .join('') + world;
    return createHash('sha256').update(string).digest('hex');
  }

  parseItemStats(stats: string): Record<string, string> {
    return stats.split(';').reduce(
      (acc, stat) => {
        const [key, value] = stat.split('=');
        if (key && value) acc[key] = value;
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
          .filter(Boolean)
      : Object.values(Profession);
    const type = getItemTypeByCl(cl);
    return { lvl, rarity, prof: requiredProfArray, type };
  }

  sortNpcsByWt(npcs: CreateLootDto['npcs']) {
    return [...npcs].sort((a, b) => b.wt - a.wt);
  }

  getLootForGivenConfig(
    loot: CreateLootDto['loots'],
    npcs: LootlogConfigNpc[],
    highestWtNpcType: string,
  ) {
    const targetNpc = npcs.find((npc) => npc.npcType === highestWtNpcType);
    if (!targetNpc) return [];
    return loot
      .map((item) => {
        const { rarity, lvl, type, prof } = this.getItemStats(item);
        if (!targetNpc.allowedRarities.includes(rarity)) return null;
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
      .filter(Boolean);
  }

  mapItems(items: CreateLootDto['loots']) {
    return items.map((item) => {
      const { lvl, rarity, prof, type } = this.getItemStats(item);

      return {
        id: item.id,
        hid: item.hid,
        name: item.name,
        icon: item.icon,
        stat: item.stat,
        pr: item.pr,
        prc: item.prc,
        lvl,
        rarity,
        prof,
        type,
      };
    });
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
      hpp: npc.hpp,
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

  getLootShareFromMsg(msg: string) {
    let share = {};
    let match;

    while ((match = LOOT_SHARE_MSG_REGEX.exec(msg)) !== null) {
      const nick = match[1].trim();
      const itemsStr = match[2];

      let itemMatch;
      while ((itemMatch = LOOT_SHARE_ITEM_REGEX.exec(itemsStr)) !== null) {
        const itemId = itemMatch[1];
        if (share[nick]) {
          share[nick].push(itemId);
        } else {
          share[nick] = [itemId];
        }
      }

      LOOT_SHARE_ITEM_REGEX.lastIndex = 0;
    }

    return share;
  }
}
