import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  type OnModuleInit,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import type { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import type { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import { ErrorKey } from './enum/error-key.enum';
import { PlayersService } from 'src/players/players.service';
import { NpcsService } from 'src/npcs/npcs.service';
import { ItemsService } from 'src/items/items.service';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { PrismaService } from 'src/db/prisma.service';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import { Permission, type Guild, type Role } from 'generated/client';
import { GuildsService } from 'src/guilds/guilds.service';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import type { UpdateLootDto } from 'src/loots/dto/update-loot.dto';
import type { CreateCommentDto } from 'src/loots/dto/create-comment-dto';
import { LootMappingService } from './services/loot-mapping.service';
import { LootValidationService } from './services/loot-validation.service';
import { LootQueryService } from './services/loot-query.service';
import { LootCommentService } from './services/loot-comment.service';
import { RedisService } from 'src/lib/redis/redis.service';
import Redlock, { ExecutionError } from 'redlock';

@Injectable()
export class LootsService implements OnModuleInit {
  private redlock: Redlock;
  private readonly lockTtl = 10000;

  constructor(
    private readonly playersService: PlayersService,
    private readonly npcsService: NpcsService,
    private readonly itemsService: ItemsService,
    private readonly guildsService: GuildsService,
    private readonly prisma: PrismaService,
    private readonly lootlogConfigService: LootlogConfigService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
    private readonly lootMappingService: LootMappingService,
    private readonly lootValidationService: LootValidationService,
    private readonly lootQueryService: LootQueryService,
    private readonly lootCommentService: LootCommentService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    const client = await this.redisService.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 100,
      retryJitter: 50,
      automaticExtensionThreshold: 5000,
    });
  }

  async createLoot(discordId: string, body: CreateLootDto) {
    const uniqueId = this.lootMappingService.createUniqueLootId(
      body.loots,
      body.world,
    );

    const lockKey = `loot:lock:${uniqueId}`;
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire([lockKey], this.lockTtl);

      const existingLoot = await this.prisma.loot.findUnique({
        where: { uniqueId },
        select: { id: true },
      });

      const [guilds, characterConfig] = await Promise.all([
        this.guildsService.getGuildsForRequiredPermissions(discordId, [
          Permission.LOOTLOG_WRITE,
        ]),
        this.userLootlogConfigService.getLootlogCharacterConfig(
          discordId,
          body.accountId,
          body.characterId,
        ),
      ]);

      if (guilds.length === 0) {
        throw new ForbiddenException();
      }

      const { filteredGuildIds } = guilds.reduce(
        (acc, guild) => {
          const isOnWhitelist =
            characterConfig?.collectLootWhitelistGuildIds?.includes(guild.id);
          if (isOnWhitelist) {
            acc.filteredGuildIds.push(guild.id);
          }
          return acc;
        },
        { filteredGuildIds: [] as string[] },
      );

      if (filteredGuildIds.length === 0) {
        throw new BadRequestException(
          ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
        );
      }

      const [lootlogConfigs, members] = await Promise.all([
        this.lootlogConfigService.getMultipleLootlogConfigs(filteredGuildIds),
        this.prisma.member.findMany({
          where: {
            guildId: { in: filteredGuildIds },
            userId: discordId,
          },
          select: { id: true, guildId: true },
        }),
      ]);

      const npcData = this.lootMappingService.processNpcs(body.npcs);
      const highestWtNpcType = getNpcTypeByWt(
        npcData.highest.wt,
        npcData.highest.prof,
        npcData.highest.type,
      );

      const submissionData = filteredGuildIds
        .map((guildId) => {
          const config = lootlogConfigs.find((c) => c.id === guildId);
          if (!config) return null;

          const calculatedLoot =
            this.lootValidationService.getLootForGivenConfig(
              body.loots,
              config.npcs,
              highestWtNpcType,
            );
          if (calculatedLoot.length === 0) return null;

          const member = members.find((m) => m.guildId === guildId);
          if (!member) return null;

          return {
            guildId: guildId,
            memberId: member.id,
          };
        })
        .filter(Boolean);

      if (submissionData.length === 0) {
        throw new BadRequestException(
          ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
        );
      }

      if (existingLoot) {
        await this.prisma.lootSubmission.createMany({
          data: submissionData.map((sd) => ({
            ...sd,
            lootId: existingLoot.id,
          })),
          skipDuplicates: true,
        });
        return { id: existingLoot.id };
      }

      const npcs = npcData.mapped;
      const players = this.lootMappingService.mapPlayers(body.players);
      const items = this.lootMappingService.mapItems(body.loots);

      const lootItems = this.lootMappingService.mapLootItemsToConnectOrCreate(
        body.loots,
      );
      const lootPlayers =
        this.lootMappingService.mapLootPlayersToConnectOrCreate(
          body.players,
          body.world,
        );
      const lootNpcs = this.lootMappingService.mapLootNpcsToConnectOrCreate(
        body.npcs,
      );
      const share = {};

      const loot = await this.prisma.loot.create({
        data: {
          uniqueId,
          world: body.world,
          source: body.source,
          location: body.location,
          lootShare: share,
          lootItems: {
            create: lootItems,
          },
          lootPlayers: {
            create: lootPlayers,
          },
          lootNpcs: {
            create: lootNpcs,
          },
        },
      });

      await this.prisma.lootSubmission.createMany({
        data: submissionData.map((sd) => ({
          ...sd,
          lootId: loot.id,
        })),
        skipDuplicates: true,
      });

      this.playersService.bulkIndexPlayers(players);
      this.npcsService.bulkIndexNpcs(npcs);

      const indexItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        lvl: item.lvl,
        rarity: item.rarity,
        type: item.type,
        world: body.world,
      }));
      this.itemsService.bulkIndexItems(indexItems);

      return { id: loot.id };
    } catch (error: unknown) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: 'error',
          message: 'Lock acquisition failed for createLoot',
          uniqueId,
        });
        throw new BadRequestException('Failed to acquire lock');
      }

      throw error;
    } finally {
      await lock?.release();
    }
  }

  async getComments(options: {
    discordId: string;
    guildId: string;
    lootId: number;
  }) {
    return this.lootCommentService.getComments(options);
  }

  async deleteLoot(options: { guildId: string; lootId: number }) {
    const { guildId, lootId } = options;

    const loot = await this.prisma.loot.findFirst({
      where: {
        id: lootId,
        lootSubmissions: { some: { guildId } },
      },
    });

    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_DELETE_LOOT);
    }

    await this.prisma.lootSubmission.deleteMany({
      where: {
        lootId,
        guildId,
      },
    });
  }

  async createComment(options: {
    discordId: string;
    guildId: string;
    lootId: number;
    body: CreateCommentDto;
  }) {
    return this.lootCommentService.createComment(options);
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
      include: {
        lootItems: {
          include: {
            itemSnapshot: true,
          },
        },
        lootPlayers: {
          include: {
            playerSnapshot: true,
          },
        },
      },
    });

    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT);
    }

    const lootShare = this.lootMappingService.getLootShareFromMsg(data.msg);
    if (Object.keys(lootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE);
    }

    // Transform relational data to the expected format for parseLootShareForUpdate
    const players = loot.lootPlayers.map((lp) => ({
      id: `${lp.playerSnapshot.characterId}${lp.playerSnapshot.accountId}`,
      name: lp.playerSnapshot.name,
      lvl: lp.lvl ?? 0,
      prof: lp.playerSnapshot.prof,
      icon: lp.playerSnapshot.icon ?? '',
      characterId: String(lp.playerSnapshot.characterId),
      accountId: String(lp.playerSnapshot.accountId),
    }));

    const items = loot.lootItems.map((li) => ({
      id: String(li.itemSnapshot.itemId),
      hid: li.hid,
      name: li.itemSnapshot.name,
      icon: li.itemSnapshot.icon,
      stat: li.itemSnapshot.statRaw,
      lvl: li.itemSnapshot.lvl ?? 0,
      rarity: li.itemSnapshot.rarity,
      prof: [],
      type: li.itemSnapshot.itemType ?? '',
    }));

    const mappedLootShare = this.lootMappingService.parseLootShareForUpdate(
      data.msg,
      players,
      items,
    );

    if (Object.keys(mappedLootShare).length === 0) {
      throw new BadRequestException(ErrorKey.MISSING_LOOT_SHARE_ITEM_OR_PLAYER);
    }

    if (Object.keys(mappedLootShare).length < items.length) {
      this.logger.log({
        level: 'warn',
        message:
          'Loot share does not include all items, some items may not be shared',
        lootId,
        lootShareMsg: data.msg,
        mappedItemsCount: Object.keys(mappedLootShare).length,
        totalItemsCount: items.length,
      });
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
    params: FetchLootsParamsDto,
  ) {
    return this.lootQueryService.fetchLootsByGuildId(
      guild,
      permissions,
      roles,
      params,
    );
  }

  async countLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) {
    return this.lootQueryService.countLootsByGuildId(
      guild,
      permissions,
      roles,
      params,
    );
  }
}
