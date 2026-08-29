import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  type OnModuleInit,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import type { Logger } from "winston";
import type { CreateLootDto } from "src/loots/dto/create-loot.dto";
import type { FetchLootsParamsDto } from "src/loots/dto/fetch-loots-params.dto";
import {
  getNpcTypeByWt,
  type GuildLootCreatedEventV2,
  type GuildLootEventNpc,
  type GuildLootShareUpdatedEventV2,
  type LootCreatedNotificationEventV2,
} from "@lootlog/types";
import { ErrorKey } from "./enum/error-key.enum";
import { PlayersService } from "src/players/players.service";
import { NpcsService } from "src/npcs/npcs.service";
import { ItemsService } from "src/items/items.service";
import { PrismaService } from "src/db/prisma.service";
import { LootlogConfigService } from "src/lootlog-config/lootlog-config.service";
import {
  LootShareSource,
  NpcType,
  Permission,
  type Guild,
  type Prisma,
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
import { LootStatsService } from "./services/loot-stats.service";
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
import type { LootQueryResult } from "src/loots/dto/loot-query-result.dto";
import type { LootShare } from "src/shared/dto/loot-response.dto";

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

type CreateLootOutcome = {
  submissionData: LootSubmissionData[];
  submittedGuilds: CreateLootSubmittedGuild[];
  rejectedGuilds: CreateLootRejectedGuild[];
};

type InitialLootShare =
  | {
      share: Record<string, never>;
      source: typeof LootShareSource.NONE;
    }
  | {
      share: LootShare;
      source: typeof LootShareSource.ITEM_OWNER;
    };

const LOOT_SHARE_SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

type CachedLootQueryResult = Omit<
  LootQueryResult,
  "createdAt" | "updatedAt"
> & {
  createdAt: Date | string;
  updatedAt: Date | string;
};

const LOOTS_LIST_CACHE_TTL_SECONDS = 10;
const LOOT_LOCK_TTL_MS = 30_000;
const LOOT_LOCK_RETRY_OPTIONS = {
  retryCount: 100,
  retryDelay: 100,
  retryJitter: 50,
} as const;

@Injectable()
export class LootsService implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;
  private readonly lockTtl = LOOT_LOCK_TTL_MS;

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
    private readonly lootStatsService: LootStatsService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redlockService: RedlockService,
  ) {}

  onModuleInit() {
    this.redlock = this.redlockService.createInstance();
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

  private async publishLootCreateEvents(
    lootId: number,
    submissions: LootSubmissionData[],
    npcs: GuildLootEventNpc[],
  ) {
    await Promise.all(
      submissions.map((submission) =>
        this.amqpConnection.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.GUILDS_LOOTS_CREATE,
          {
            version: 2,
            guildId: submission.guildId,
            lootId,
            npcs,
          } satisfies GuildLootCreatedEventV2,
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

  private async invalidateLootStatsCaches(guildIds: string[]) {
    if (guildIds.length === 0) {
      return;
    }

    await this.lootStatsService.invalidateCache(guildIds);
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

    return JSON.stringify(value) ?? "undefined";
  }

  private normalizeCachedLootDate(value: Date | string): Date {
    if (value instanceof Date) {
      return value;
    }

    return new Date(value);
  }

  private normalizeCachedLoots(
    loots: CachedLootQueryResult[],
  ): LootQueryResult[] {
    return loots.map((loot) => ({
      ...loot,
      createdAt: this.normalizeCachedLootDate(loot.createdAt),
      updatedAt: this.normalizeCachedLootDate(loot.updatedAt),
    }));
  }

  private getSocketNpcPayloadsFromLootNpcs(
    lootNpcs: LootNpcWithSocketSnapshot[],
  ): GuildLootEventNpc[] {
    return lootNpcs.map(({ npcSnapshot }) => ({
      lvl: npcSnapshot.lvl,
      prof: npcSnapshot.prof,
      type:
        npcSnapshot.type ??
        getNpcTypeByWt(
          NpcType,
          npcSnapshot.wt ?? 0,
          npcSnapshot.prof ?? undefined,
        ),
      wt: npcSnapshot.wt,
    }));
  }

  private getAuthorizedLootUpdateWhere(
    actorUserId: string,
    lootId: number,
    submissionCutoff: Date,
  ): Prisma.LootWhereInput {
    return {
      id: lootId,
      organizationLootRecords: {
        some: {
          submissions: {
            some: {
              member: { globalUserId: actorUserId },
              createdAt: { gte: submissionCutoff },
            },
          },
        },
      },
    };
  }

  private async getInitialLootShare(
    body: CreateLootDto,
    primaryNpc: CreateLootDto["npcs"][number],
    primaryNpcType: NpcType,
  ): Promise<InitialLootShare> {
    if (primaryNpcType !== NpcType.COLOSSUS) {
      return { share: {}, source: LootShareSource.NONE };
    }

    const ambiguousNpcVariant = await this.prisma.npcSnapshot.findFirst({
      where: {
        name: primaryNpc.name,
        OR: [{ type: { not: NpcType.COLOSSUS } }, { type: null }],
      },
      select: { id: true },
    });

    if (ambiguousNpcVariant) {
      return { share: {}, source: LootShareSource.NONE };
    }

    const itemOwnerShare = this.lootMappingService.mapLootShareFromItemOwners(
      body.loots,
      body.players,
    );
    if (!itemOwnerShare) {
      return { share: {}, source: LootShareSource.NONE };
    }

    return {
      share: itemOwnerShare,
      source: LootShareSource.ITEM_OWNER,
    };
  }

  private async acknowledgeConcurrentLootShareUpdate(
    actorUserId: string,
    lootId: number,
    submissionCutoff: Date,
    expectedLootShare: LootShare,
  ): Promise<LootShare> {
    const loot = await this.prisma.loot.findFirst({
      where: this.getAuthorizedLootUpdateWhere(
        actorUserId,
        lootId,
        submissionCutoff,
      ),
      select: { lootShare: true, lootShareSource: true },
    });

    if (!loot) {
      throw new ForbiddenException(ErrorKey.CANT_UPDATE_LOOT);
    }

    if (loot.lootShareSource !== LootShareSource.CHAT_MESSAGE) {
      throw new ServiceUnavailableException("Failed to persist loot share");
    }

    this.assertMatchingLootShare(lootId, loot.lootShare, expectedLootShare);

    return {};
  }

  private assertMatchingLootShare(
    lootId: number,
    persistedLootShare: unknown,
    submittedLootShare: LootShare,
  ) {
    const persisted = this.stableSerialize(persistedLootShare);
    const submitted = this.stableSerialize(submittedLootShare);
    if (persisted === submitted) {
      return;
    }

    this.logger.warn("Conflicting chat loot share rejected", {
      lootId,
      persistedHash: createHash("sha256").update(persisted).digest("hex"),
      submittedHash: createHash("sha256").update(submitted).digest("hex"),
    });
    throw new ConflictException("Conflicting loot share");
  }

  async createLoot(discordId: string, _userId: string, body: CreateLootDto) {
    const uniqueId = this.lootMappingService.createUniqueLootId(
      body.loots,
      body.world,
    );

    const lockKey = `loot:lock:${uniqueId}`;
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire(
        [lockKey],
        this.lockTtl,
        LOOT_LOCK_RETRY_OPTIONS,
      );

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
      const socketNpcs = npcData.mapped.map((npc) => ({
        lvl: npc.lvl,
        prof: npc.prof,
        type: npc.type,
        wt: npc.wt,
      }));

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
        const existingOrganizationRecords =
          await this.prisma.organizationLootRecord.findMany({
            where: {
              lootId: existingLoot.id,
              guildId: {
                in: outcome.submissionData.map(
                  (submission) => submission.guildId,
                ),
              },
            },
            select: {
              guildId: true,
              archivedAt: true,
              submissions: {
                select: { memberId: true },
              },
            },
          });
        const existingSubmissions = existingOrganizationRecords.flatMap(
          (record) =>
            record.submissions.map((submission) => ({
              guildId: record.guildId,
              memberId: submission.memberId,
            })),
        );
        const newSubmissions = this.getNewLootSubmissions(
          outcome.submissionData,
          existingSubmissions,
        );

        if (newSubmissions.length > 0) {
          const organizationRecords = await this.prisma.$transaction(
            async (tx) => {
              await tx.organizationLootRecord.createMany({
                data: this.getUniqueGuildSubmissions(newSubmissions).map(
                  (submission) => ({
                    guildId: submission.guildId,
                    lootId: existingLoot.id,
                  }),
                ),
                skipDuplicates: true,
              });
              const records = await tx.organizationLootRecord.findMany({
                where: {
                  lootId: existingLoot.id,
                  guildId: {
                    in: newSubmissions.map((submission) => submission.guildId),
                  },
                },
                select: { id: true, guildId: true, archivedAt: true },
              });
              const recordIdByGuildId = new Map(
                records.map((record) => [record.guildId, record.id]),
              );
              const submissionRows = newSubmissions.map((submission) => {
                const organizationLootRecordId = recordIdByGuildId.get(
                  submission.guildId,
                );
                if (organizationLootRecordId === undefined) {
                  throw new ServiceUnavailableException(
                    "Failed to resolve Organization Loot record",
                  );
                }

                return {
                  organizationLootRecordId,
                  memberId: submission.memberId,
                };
              });

              await tx.lootSubmission.createMany({
                data: submissionRows,
                skipDuplicates: true,
              });

              return records;
            },
          );

          const archivedGuildIds = new Set(
            organizationRecords
              .filter((record) => (record.archivedAt ?? null) !== null)
              .map((record) => record.guildId),
          );
          const activeNewSubmissions = newSubmissions.filter(
            (submission) => !archivedGuildIds.has(submission.guildId),
          );
          const activeGuildIds = activeNewSubmissions.map(
            (submission) => submission.guildId,
          );
          await Promise.all([
            this.invalidateLootsListCache(activeGuildIds),
            this.invalidateLootStatsCaches(activeGuildIds),
          ]);
          await this.publishLootCreateEvents(
            existingLoot.id,
            activeNewSubmissions,
            socketNpcs,
          );
        }
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
      const initialLootShare = await this.getInitialLootShare(
        body,
        npcData.highest,
        highestWtNpcType,
      );

      const loot = await this.prisma.loot.create({
        data: {
          uniqueId,
          world: body.world,
          source: body.source,
          location: body.location,
          lootShare: initialLootShare.share,
          lootShareSource: initialLootShare.source,
          lootItems: {
            create: lootItems,
          },
          lootPlayers: {
            create: lootPlayers,
          },
          lootNpcs: {
            create: lootNpcs,
          },
          organizationLootRecords: {
            create: outcome.submissionData.map((submission) => ({
              guildId: submission.guildId,
              submissions: {
                create: { memberId: submission.memberId },
              },
            })),
          },
        },
      });

      const submittedGuildIds = outcome.submissionData.map(
        (submission) => submission.guildId,
      );
      await Promise.all([
        this.invalidateLootsListCache(submittedGuildIds),
        this.invalidateLootStatsCaches(submittedGuildIds),
      ]);
      await this.publishLootCreateEvents(
        loot.id,
        outcome.submissionData,
        socketNpcs,
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

      const notificationEvent = {
        version: 2,
        lootId: loot.id,
        world: body.world,
        guildIds: outcome.submissionData.map(
          (submission) => submission.guildId,
        ),
        itemIds: items.map((item) => item.id),
        itemNames: items.map((item) => item.name),
        npcs: socketNpcs.map((npc) => ({
          type: npc.type ?? null,
          lvl: npc.lvl ?? null,
        })),
      } satisfies LootCreatedNotificationEventV2;

      await this.amqpConnection.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.NOTIFICATIONS_LOOT_CREATED,
        notificationEvent,
      );

      return this.createCreateLootResponse(loot.id, outcome);
    } catch (error: unknown) {
      if (error instanceof ExecutionError) {
        this.logger.log({
          level: "error",
          message: "Lock acquisition failed for createLoot",
          uniqueId,
        });
        throw new ServiceUnavailableException("Failed to acquire loot lock");
      }

      throw error;
    } finally {
      await lock?.release();
    }
  }

  async getComments(options: {
    guild: Guild;
    lootId: number;
    permissions: Permission[];
    roles: Role[];
  }) {
    const { guild, lootId, permissions, roles } = options;
    const visibleLoot = await this.lootQueryService.fetchLootById(
      guild,
      permissions,
      roles,
      lootId,
    );
    if (!visibleLoot) {
      throw new NotFoundException();
    }

    return this.lootCommentService.getComments({ guildId: guild.id, lootId });
  }

  async archiveLoot(options: {
    discordId: string;
    guild: Guild;
    lootId: number;
    permissions: Permission[];
    roles: Role[];
  }) {
    const { discordId, guild, lootId, permissions, roles } = options;
    const visibleLoot = await this.lootQueryService.fetchLootById(
      guild,
      permissions,
      roles,
      lootId,
    );
    if (!visibleLoot) {
      throw new NotFoundException(ErrorKey.CANT_DELETE_LOOT);
    }

    const actor = await this.prisma.member.findUnique({
      where: {
        memberId: { userId: discordId, guildId: guild.id },
      },
      select: { id: true },
    });
    if (!actor) {
      throw new NotFoundException(ErrorKey.CANT_DELETE_LOOT);
    }

    const archived = await this.prisma.organizationLootRecord.updateMany({
      where: { guildId: guild.id, lootId, archivedAt: null },
      data: {
        archivedAt: new Date(),
        archivedByMemberId: actor.id,
      },
    });
    if (archived.count === 0) {
      throw new NotFoundException(ErrorKey.CANT_DELETE_LOOT);
    }

    await Promise.all([
      this.invalidateLootsListCache([guild.id]),
      this.invalidateLootStatsCaches([guild.id]),
    ]);
  }

  async createComment(options: {
    discordId: string;
    guild: Guild;
    lootId: number;
    body: CreateCommentDto;
    permissions: Permission[];
    roles: Role[];
  }) {
    const { guild, lootId, permissions, roles } = options;
    const visibleLoot = await this.lootQueryService.fetchLootById(
      guild,
      permissions,
      roles,
      lootId,
    );
    if (!visibleLoot) {
      throw new NotFoundException();
    }

    const comment = await this.lootCommentService.createComment({
      discordId: options.discordId,
      guildId: guild.id,
      lootId,
      body: options.body,
    });
    await this.invalidateLootsListCache([guild.id]);
    return comment;
  }

  async updateLoot(actorUserId: string, lootId: number, data: UpdateLootDto) {
    const submissionCutoff = new Date(
      Date.now() - LOOT_SHARE_SUBMISSION_WINDOW_MS,
    );
    const authorizedLootWhere = this.getAuthorizedLootUpdateWhere(
      actorUserId,
      lootId,
      submissionCutoff,
    );
    const loot = await this.prisma.loot.findFirst({
      where: authorizedLootWhere,
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
        organizationLootRecords: {
          where: { archivedAt: null },
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

    if (loot.lootShareSource === LootShareSource.CHAT_MESSAGE) {
      this.assertMatchingLootShare(lootId, loot.lootShare, mappedLootShare);
      return {};
    }

    if (Object.keys(mappedLootShare).length < items.length) {
      this.logger.log({
        level: "warn",
        message:
          "Loot share does not include all items, some items may not be shared",
        lootId,
        mappedItemsCount: Object.keys(mappedLootShare).length,
        totalItemsCount: items.length,
      });
    }

    const updateResult = await this.prisma.loot.updateMany({
      where: {
        ...authorizedLootWhere,
        lootShareSource: { not: LootShareSource.CHAT_MESSAGE },
      },
      data: {
        lootShare: mappedLootShare,
        lootShareSource: LootShareSource.CHAT_MESSAGE,
      },
    });

    if (updateResult.count === 0) {
      return this.acknowledgeConcurrentLootShareUpdate(
        actorUserId,
        lootId,
        submissionCutoff,
        mappedLootShare,
      );
    }

    const socketNpcs = this.getSocketNpcPayloadsFromLootNpcs(loot.lootNpcs);
    const uniqueGuildSubmissions = this.getUniqueGuildSubmissions(
      loot.organizationLootRecords,
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
            version: 2,
            guildId: submission.guildId,
            lootId,
            lootShare: mappedLootShare,
            npcs: socketNpcs,
          } satisfies GuildLootShareUpdatedEventV2,
        ),
      ),
    );

    return {};
  }

  async fetchLootsByGuildId(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    params: FetchLootsParamsDto,
  ) {
    if (this.isFirstLootsPage(params)) {
      const loots = await this.redisService.getOrSetJsonBestEffort<
        CachedLootQueryResult[]
      >({
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

      return this.normalizeCachedLoots(loots);
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

  resolveLootItemByHid(
    guild: Guild,
    permissions: Permission[],
    roles: Role[],
    options: { hid: string; world?: string },
  ) {
    return this.lootQueryService.resolveLootItemByHid(
      guild,
      permissions,
      roles,
      options,
    );
  }
}
