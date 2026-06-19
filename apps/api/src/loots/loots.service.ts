import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  type OnModuleInit,
} from "@nestjs/common";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import type { CreateLootDto } from "src/loots/dto/create-loot.dto";
import type { FetchLootsParamsDto } from "src/loots/dto/fetch-loots-params.dto";
import { getNpcTypeByWt } from "@lootlog/types";
import { ErrorKey } from "./enum/error-key.enum";
import { PlayersService } from "src/players/players.service";
import { NpcsService } from "src/npcs/npcs.service";
import { ItemsService } from "src/items/items.service";
import { PrismaService } from "src/db/prisma.service";
import { LootlogConfigService } from "src/lootlog-config/lootlog-config.service";
import {
  NpcType,
  Permission,
  type Guild,
  type Role,
} from "src/generated/prisma/client";
import { GuildsService } from "src/guilds/guilds.service";
import { UserLootlogConfigService } from "src/user-lootlog-config/user-lootlog-config.service";
import type { UpdateLootDto } from "src/loots/dto/update-loot.dto";
import type { CreateCommentDto } from "src/loots/dto/create-comment-dto";
import { LootMappingService } from "./services/loot-mapping.service";
import { LootValidationService } from "./services/loot-validation.service";
import { LootQueryService } from "./services/loot-query.service";
import { LootCommentService } from "./services/loot-comment.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { ExecutionError } from "redlock";
import { RedlockService } from "src/lib/redlock/redlock.service";
import { DEFAULT_EXCHANGE_NAME } from "src/config/rabbitmq.config";
import { RoutingKey } from "src/enum/routing-key.enum";
import type {
  CreateLootRejectedGuild,
  CreateLootRejectedGuildReason,
  CreateLootResponse,
  CreateLootSubmittedGuild,
} from "src/loots/dto/loot-response.dto";

type LootSubmissionData = {
  guildId: string;
  guildName: string;
  memberId: number;
};

type LootNpcWithSocketSnapshot = {
  npcSnapshot: {
    lvl: number | null;
    prof: string | null;
    type: NpcType | null;
    wt: number | null;
  };
};

type LootSocketNpcPayload = {
  lvl?: number | null;
  prof?: string | null;
  type?: string | null;
  wt?: number | null;
};

type CreateLootOutcome = {
  submissionData: LootSubmissionData[];
  submittedGuilds: CreateLootSubmittedGuild[];
  rejectedGuilds: CreateLootRejectedGuild[];
};

const LOOTS_LIST_CACHE_TTL_SECONDS = 10;

@Injectable()
export class LootsService implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;
  private readonly lockTtl = 10000;

  constructor(
    private readonly amqpConnection: AmqpConnection,
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
    private readonly redlockService: RedlockService,
  ) {}

  onModuleInit() {
    this.redlock = this.redlockService.createInstance({
      automaticExtensionThreshold: 5000,
    });
  }

  private createRejectedGuild(
    guild: Pick<Guild, "id" | "name">,
    reason: CreateLootRejectedGuildReason,
  ): CreateLootRejectedGuild {
    return {
      guildId: guild.id,
      guildName: guild.name,
      reason,
    };
  }

  private createCreateLootResponse(
    id: number,
    outcome: Omit<CreateLootOutcome, "submissionData">,
  ): CreateLootResponse {
    return {
      id,
      submittedGuilds: outcome.submittedGuilds,
      rejectedGuilds: outcome.rejectedGuilds,
    };
  }

  private throwCreateLootBadRequest(
    message: ErrorKey,
    rejectedGuilds: CreateLootRejectedGuild[],
  ): never {
    throw new BadRequestException({
      message,
      submittedGuilds: [],
      rejectedGuilds,
    });
  }

  private getPrimarySocketNpcPayload(
    npcData: ReturnType<LootMappingService["processNpcs"]>,
    npcType: NpcType,
  ): LootSocketNpcPayload {
    return {
      lvl: npcData.highest.lvl ?? null,
      prof: npcData.highest.prof ?? null,
      type: npcType,
      wt: npcData.highest.wt ?? null,
    };
  }

  private async publishLootCreateEvents(
    lootId: number,
    submissions: LootSubmissionData[],
    npc: LootSocketNpcPayload,
  ) {
    await Promise.all(
      submissions.map((submission) =>
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_LOOTS_CREATE,
          {
            guildId: submission.guildId,
            lootId,
            npc,
          },
        ),
      ),
    );
  }

  private getNewLootSubmissions(
    submissions: LootSubmissionData[],
    existingSubmissions: Array<{ guildId: string; memberId: number }>,
  ) {
    const existingSubmissionKeys = new Set(
      existingSubmissions.map(
        (submission) => `${submission.guildId}:${submission.memberId}`,
      ),
    );

    return submissions.filter(
      (submission) =>
        !existingSubmissionKeys.has(
          `${submission.guildId}:${submission.memberId}`,
        ),
    );
  }

  private getUniqueGuildSubmissions(
    submissions: Array<{ guildId: string }>,
  ): Array<{ guildId: string }> {
    const seenGuildIds = new Set<string>();
    const uniqueSubmissions: Array<{ guildId: string }> = [];

    for (const submission of submissions) {
      if (seenGuildIds.has(submission.guildId)) {
        continue;
      }

      seenGuildIds.add(submission.guildId);
      uniqueSubmissions.push(submission);
    }

    return uniqueSubmissions;
  }

  private isFirstLootsPage(params: FetchLootsParamsDto) {
    return (
      params.cursor === undefined ||
      params.cursor === null ||
      params.cursor <= 0
    );
  }

  private getLootsListCacheKey(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) {
    const visibilityScope = {
      permissions: [...permissions].sort(),
      roles: roles
        .map((role) => ({
          id: role.id,
          lvlRangeFrom: role.lvlRangeFrom,
          lvlRangeTo: role.lvlRangeTo,
          permissions: [...role.permissions].sort(),
        }))
        .sort((leftRole, rightRole) => leftRole.id.localeCompare(rightRole.id)),
    };

    return [
      "loots",
      "list",
      guild.id,
      Buffer.from(
        this.stableSerialize({
          params: {
            ...params,
            cursor: 0,
          },
          visibilityScope,
        }),
      ).toString("base64url"),
    ].join(":");
  }

  private async invalidateLootsListCache(guildIds: string[]) {
    const uniqueGuildIds = [...new Set(guildIds)];

    await Promise.all(
      uniqueGuildIds.map(async (guildId) => {
        try {
          await this.redisService.deleteByPattern(`loots:list:${guildId}:*`);
        } catch (error) {
          this.logger.warn("Failed to invalidate loots list cache", {
            error,
            guildId,
          });
        }
      }),
    );
  }

  private stableSerialize(value: unknown): string {
    if (Array.isArray(value)) {
      return `[${value.map((entry) => this.stableSerialize(entry)).join(",")}]`;
    }

    if (value && typeof value === "object") {
      const entries = Object.entries(value)
        .filter(([, entry]) => entry !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entry]) =>
            `${JSON.stringify(key)}:${this.stableSerialize(entry)}`,
        )
        .join(",")}}`;
    }

    return JSON.stringify(value);
  }

  private getSocketNpcPayloadFromLootNpcs(
    lootNpcs: LootNpcWithSocketSnapshot[],
  ): LootSocketNpcPayload {
    const primaryNpc = [...lootNpcs].sort(
      (a, b) => (b.npcSnapshot.wt ?? 0) - (a.npcSnapshot.wt ?? 0),
    )[0]?.npcSnapshot;

    if (!primaryNpc) {
      return {};
    }

    return {
      lvl: primaryNpc.lvl,
      prof: primaryNpc.prof,
      type:
        primaryNpc.type ??
        getNpcTypeByWt(
          NpcType,
          primaryNpc.wt ?? 0,
          primaryNpc.prof ?? undefined,
        ),
      wt: primaryNpc.wt,
    };
  }

  async createLoot(discordId: string, _userId: string, body: CreateLootDto) {
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
          Permission.LOOTLOG_LOOTS_WRITE,
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

      const whitelistedGuildIds = new Set(
        characterConfig?.catchingGuildIds ?? [],
      );
      const filteredGuildIds = guilds
        .filter((guild) => whitelistedGuildIds.has(guild.id))
        .map((guild) => guild.id);

      if (filteredGuildIds.length === 0) {
        this.throwCreateLootBadRequest(
          ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
          guilds.map((guild) =>
            this.createRejectedGuild(guild, "NOT_ON_CHARACTER_WHITELIST"),
          ),
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

      if (npcData.highest.wt < 10) {
        throw new BadRequestException(ErrorKey.NPC_WT_TOO_LOW);
      }

      const highestWtNpcType = getNpcTypeByWt(
        NpcType,
        npcData.highest.wt,
        npcData.highest.prof,
        npcData.highest.type,
      );
      const socketNpc = this.getPrimarySocketNpcPayload(
        npcData,
        highestWtNpcType,
      );

      const lootlogConfigByGuildId = new Map(
        lootlogConfigs.map((config) => [config.id, config]),
      );
      const memberByGuildId = new Map(
        members.map((member) => [member.guildId, member]),
      );

      const outcome = guilds.reduce<CreateLootOutcome>(
        (acc, guild) => {
          if (!whitelistedGuildIds.has(guild.id)) {
            acc.rejectedGuilds.push(
              this.createRejectedGuild(guild, "NOT_ON_CHARACTER_WHITELIST"),
            );
            return acc;
          }

          const config = lootlogConfigByGuildId.get(guild.id);
          if (!config) {
            acc.rejectedGuilds.push(
              this.createRejectedGuild(guild, "MISSING_LOOTLOG_CONFIG"),
            );
            return acc;
          }

          const calculatedLoot =
            this.lootValidationService.getLootForGivenConfig(
              body.loots,
              config.npcs,
              highestWtNpcType,
            );
          if (calculatedLoot.length === 0) {
            acc.rejectedGuilds.push(
              this.createRejectedGuild(guild, "LOOT_NOT_ACCEPTED_BY_CONFIG"),
            );
            return acc;
          }

          const member = memberByGuildId.get(guild.id);
          if (!member) {
            acc.rejectedGuilds.push(
              this.createRejectedGuild(guild, "MISSING_MEMBER"),
            );
            return acc;
          }

          acc.submissionData.push({
            guildId: guild.id,
            guildName: guild.name,
            memberId: member.id,
          });
          acc.submittedGuilds.push({
            guildId: guild.id,
            guildName: guild.name,
          });

          return acc;
        },
        {
          submissionData: [],
          submittedGuilds: [],
          rejectedGuilds: [],
        },
      );

      if (outcome.submissionData.length === 0) {
        this.throwCreateLootBadRequest(
          ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
          outcome.rejectedGuilds,
        );
      }

      if (existingLoot) {
        const existingSubmissions = await this.prisma.lootSubmission.findMany({
          where: {
            lootId: existingLoot.id,
            OR: outcome.submissionData.map((submission) => ({
              guildId: submission.guildId,
              memberId: submission.memberId,
            })),
          },
          select: {
            guildId: true,
            memberId: true,
          },
        });
        const newSubmissions = this.getNewLootSubmissions(
          outcome.submissionData,
          existingSubmissions,
        );

        if (newSubmissions.length > 0) {
          await this.prisma.lootSubmission.createMany({
            data: newSubmissions.map((submission) => ({
              guildId: submission.guildId,
              memberId: submission.memberId,
              lootId: existingLoot.id,
            })),
            skipDuplicates: true,
          });
        }

        await this.invalidateLootsListCache(
          newSubmissions.map((submission) => submission.guildId),
        );
        await this.publishLootCreateEvents(
          existingLoot.id,
          newSubmissions,
          socketNpc,
        );
        return this.createCreateLootResponse(existingLoot.id, outcome);
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
        data: outcome.submissionData.map((submission) => ({
          guildId: submission.guildId,
          memberId: submission.memberId,
          lootId: loot.id,
        })),
        skipDuplicates: true,
      });
      await this.invalidateLootsListCache(
        outcome.submissionData.map((submission) => submission.guildId),
      );
      await this.publishLootCreateEvents(
        loot.id,
        outcome.submissionData,
        socketNpc,
      );

      const playersWithWorld = players.map((player) => ({
        ...player,
        world: body.world,
      }));
      this.playersService.bulkIndexPlayers(playersWithWorld);

      const npcsWithWorld = npcs.map((npc) => ({
        ...npc,
        world: body.world,
      }));
      this.npcsService.bulkIndexNpcs(npcsWithWorld);

      const indexItems = items.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        stat: item.stat,
        lvl: item.lvl,
        rarity: item.rarity,
        type: item.type,
        world: body.world,
      }));
      this.itemsService.bulkIndexItems(indexItems);

      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.NOTIFICATIONS_LOOT_CREATED,
        {
          lootId: loot.id,
          world: body.world,
          guildIds: outcome.submissionData.map(
            (submission) => submission.guildId,
          ),
          itemIds: items.map((item) => item.id),
          itemNames: items.map((item) => item.name),
          npcType: highestWtNpcType,
          npcLvl: npcData.highest.lvl ?? null,
        },
      );

      return this.createCreateLootResponse(loot.id, outcome);
    } catch (error: unknown) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
          message: "Lock acquisition failed for createLoot",
          uniqueId,
        });
        throw new BadRequestException("Failed to acquire lock");
      }

      throw error;
    } finally {
      await lock?.release();
    }
  }

  getComments(options: { guildId: string; lootId: number }) {
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
    await this.invalidateLootsListCache([guildId]);
  }

  async createComment(options: {
    discordId: string;
    guildId: string;
    lootId: number;
    body: CreateCommentDto;
  }) {
    const comment = await this.lootCommentService.createComment(options);
    await this.invalidateLootsListCache([options.guildId]);
    return comment;
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
        lootNpcs: {
          include: {
            npcSnapshot: true,
          },
          orderBy: { id: "asc" },
        },
        lootSubmissions: {
          select: {
            guildId: true,
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
      icon: lp.playerSnapshot.icon ?? "",
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
      type: li.itemSnapshot.itemType ?? "",
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
        level: "warn",
        message:
          "Loot share does not include all items, some items may not be shared",
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

    const socketNpc = this.getSocketNpcPayloadFromLootNpcs(loot.lootNpcs);
    const uniqueGuildSubmissions = this.getUniqueGuildSubmissions(
      loot.lootSubmissions,
    );
    await this.invalidateLootsListCache(
      uniqueGuildSubmissions.map((submission) => submission.guildId),
    );

    await Promise.all(
      uniqueGuildSubmissions.map((submission) =>
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_LOOTS_SHARE_UPDATE,
          {
            guildId: submission.guildId,
            lootId,
            lootShare: mappedLootShare,
            npc: socketNpc,
          },
        ),
      ),
    );

    return mappedLootShare;
  }

  fetchLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) {
    if (this.isFirstLootsPage(params)) {
      return this.redisService.getOrSetJsonBestEffort({
        key: this.getLootsListCacheKey(guild, permissions, roles, params),
        ttlSeconds: LOOTS_LIST_CACHE_TTL_SECONDS,
        onError: (error) =>
          this.logger.warn("Loots list cache unavailable", { error }),
        factory: () =>
          this.lootQueryService.fetchLootsByGuildId(
            guild,
            permissions,
            roles,
            params,
          ),
      });
    }

    return this.lootQueryService.fetchLootsByGuildId(
      guild,
      permissions,
      roles,
      params,
    );
  }

  countLootsByGuildId(
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

  fetchLootById(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    lootId: number,
  ) {
    return this.lootQueryService.fetchLootById(
      guild,
      permissions,
      roles,
      lootId,
    );
  }
}
