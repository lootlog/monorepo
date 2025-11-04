import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import type { FetchLootsParamsDto } from 'src/loots/dto/fetch-loots-params.dto';
import { ErrorKey } from 'src/loots/enum/error-key.enum';
import { PlayersService } from 'src/players/players.service';
import { NpcsService } from 'src/npcs/npcs.service';
import { LootlogConfigService } from 'src/lootlog-config/lootlog-config.service';
import {
  Permission,
  NpcType,
  type Guild,
  type Role,
  type Prisma,
} from 'generated/client';
import { getNpcTypeByWt } from 'src/shared/utils/get-npc-type-by-wt';
import { UserLootlogConfigService } from 'src/user-lootlog-config/user-lootlog-config.service';
import type { UpdateLootDto } from 'src/loots/dto/update-loot.dto';
import type { CreateCommentDto } from 'src/loots/dto/create-comment-dto';
import { LootCreationService } from 'src/loots/services/loot-creation.service';
import { LootValidationService } from 'src/loots/services/loot-validation.service';
import { LootShareService } from 'src/loots/services/loot-share.service';
import { LootCommentService } from 'src/loots/services/loot-comment.service';
import { LootQueryService } from 'src/loots/services/loot-query.service';

@Injectable()
export class LootsService {
  constructor(
    private readonly playersService: PlayersService,
    private readonly npcsService: NpcsService,
    private readonly lootlogConfigService: LootlogConfigService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
    private readonly lootCreationService: LootCreationService,
    private readonly lootValidationService: LootValidationService,
    private readonly lootShareService: LootShareService,
    private readonly lootCommentService: LootCommentService,
    private readonly lootQueryService: LootQueryService,
  ) {}

  async createLootForGuild(
    discordId: string,
    userId: string,
    guildId: string,
    member: { id: number },
    body: CreateLootDto,
  ) {
    const uniqueId = this.lootCreationService.createUniqueLootId(
      body.loots,
      body.world,
    );

    const config =
      await this.userLootlogConfigService.getLootlogCharacterConfig(
        discordId,
        body.accountId,
        body.characterId,
      );

    if (!config?.collectLootWhitelistGuildIds?.includes(guildId)) {
      throw new ForbiddenException(
        ErrorKey.GUILD_NOT_WHITELISTED_FOR_CHARACTER,
      );
    }

    const lootlogConfig =
      await this.lootlogConfigService.getLootlogConfig(guildId);

    if (!lootlogConfig) {
      throw new BadRequestException(ErrorKey.GUILD_CONFIG_REJECTS_LOOT);
    }

    const npcData = this.lootValidationService.processNpcs(body.npcs);
    const highestWtNpcType = getNpcTypeByWt(
      npcData.highest.wt,
      npcData.highest.prof,
      npcData.highest.type,
    );

    const calculatedLoot = this.lootValidationService.getLootForGivenConfig(
      body.loots,
      lootlogConfig.npcs,
      highestWtNpcType,
    );

    if (calculatedLoot.length === 0) {
      throw new BadRequestException(ErrorKey.GUILD_CONFIG_REJECTS_LOOT);
    }

    const players = this.lootValidationService.mapPlayers(body.players);
    const items = this.lootValidationService.mapItems(body.loots);
    const npcs = npcData.mapped;
    const share =
      highestWtNpcType === NpcType.COLOSSUS
        ? this.lootValidationService.mapLootShare(body.loots, body.players)
        : {};

    const result = await this.lootCreationService.createLootWithLocking(
      uniqueId,
      userId,
      guildId,
      member.id,
      {
        items: items as unknown as Prisma.JsonValue,
        players: players as unknown as Prisma.JsonValue,
        npcs: npcs as unknown as Prisma.JsonValue,
        lootShare: share as unknown as Prisma.JsonValue,
      },
      body,
    );

    this.playersService.bulkIndexPlayers(
      this.lootValidationService.mapPlayersForIndexing(players),
    );
    this.npcsService.bulkIndexNpcs(
      this.lootValidationService.mapNpcsForIndexing(npcs),
    );

    await this.lootQueryService.invalidateLootsCache(guildId, body.world);

    return result;
  }

  async getComments(options: {
    discordId: string;
    guildId: string;
    lootId: number;
  }) {
    return this.lootCommentService.getComments(options);
  }

  async deleteLoot(options: { guildId: string; lootId: number }) {
    await this.lootCommentService.deleteLoot(options);
    await this.lootQueryService.invalidateLootsCache(options.guildId);
  }

  async createComment(options: {
    discordId: string;
    userId: string;
    guildId: string;
    lootId: number;
    body: CreateCommentDto;
  }) {
    return this.lootCommentService.createComment(options);
  }

  async updateLoot(discordId: string, lootId: number, data: UpdateLootDto) {
    return this.lootShareService.updateLootShare(discordId, lootId, data);
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
}
