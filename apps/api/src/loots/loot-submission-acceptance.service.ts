import { db as prismaDb } from "#src/prisma/db";
import type { FieldOutputTypes } from "../prisma/contract.js";
import { and } from "@prisma/orm-family-sql/orm-client";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { RedisService } from "@lootlog/nest-shared/redis";
import {
  getNpcTypeByWt,
  type GuildLootCreatedEventV2,
  type GuildLootEventNpc,
  type LootCreatedNotificationEventV2,
} from "@lootlog/types";
import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  type OnModuleInit,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { ExecutionError } from "redlock";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { PrismaService } from "#src/db/prisma.service";
import { RoutingKey } from "#src/enum/routing-key.enum";
import { GuildsService } from "#src/guilds/guilds.service";
import { ItemsService } from "#src/items/items.service";
import { RedlockService } from "#src/lib/redlock/redlock.service";
import { LootlogConfigService } from "#src/lootlog-config/lootlog-config.service";
import type { CreateLootDto } from "#src/loots/dto/create-loot.dto";
import type {
  CreateLootRejectedGuild,
  CreateLootRejectedGuildReason,
  CreateLootResponse,
  CreateLootSubmittedGuild,
} from "#src/loots/dto/loot-response.dto";
import { ErrorKey } from "#src/loots/enum/error-key.enum";
import { LootAllocationService } from "#src/loots/loot-allocation.service";
import { LootStatsService } from "#src/loots/services/loot-stats.service";
import { NpcsService } from "#src/npcs/npcs.service";
import { PlayersService } from "#src/players/players.service";
import { getItemTypeByCl } from "#src/shared/utils/get-item-type-by-cl";
import { getProfByShortname } from "#src/shared/utils/get-prof-by-shortname";
import { UserLootlogConfigService } from "#src/user-lootlog-config/user-lootlog-config.service";
import type { Logger } from "winston";
import { dateToTemporal } from "#src/db/temporal";

const NpcType = prismaDb.nativeEnums.public.NpcType.members;
type NpcType = (typeof NpcType)[keyof typeof NpcType];
const Permission = prismaDb.nativeEnums.public.Permission.members;
type Permission = (typeof Permission)[keyof typeof Permission];
const Profession = prismaDb.nativeEnums.public.Profession.members;
type Profession = (typeof Profession)[keyof typeof Profession];
type Guild = FieldOutputTypes["public"]["Guild"];
const ItemRarity = prismaDb.nativeEnums.public.ItemRarity.members;
type ItemRarity = (typeof ItemRarity)[keyof typeof ItemRarity];
type LootlogConfigNpc = FieldOutputTypes["public"]["LootlogConfigNpc"];

type LootSubmissionData = {
  guildId: string;
  guildName: string;
  memberId: number;
};

type AcceptanceOutcome = {
  submissionData: LootSubmissionData[];
  submittedGuilds: CreateLootSubmittedGuild[];
  rejectedGuilds: CreateLootRejectedGuild[];
};

type ProcessedNpc = {
  id: number;
  name: string;
  lvl: number;
  prof: string;
  icon: string;
  wt: number;
  location: string;
  type: NpcType;
  margonemType: number;
};

type LootEventNpc = GuildLootEventNpc & { type: NpcType };

const SNAPSHOT_HASH_IGNORED_KEYS = new Set([
  "created",
  "gold",
  "amount",
  "opis",
]);
const LOOT_LOCK_TTL_MS = 30_000;
const LOOT_LOCK_RETRY_OPTIONS = {
  retryCount: 100,
  retryDelay: 100,
  retryJitter: 50,
} as const;

@Injectable()
export class LootSubmissionAcceptanceService implements OnModuleInit {
  private redlock: ReturnType<RedlockService["createInstance"]>;

  constructor(
    private readonly allocation: LootAllocationService,
    private readonly amqpConnection: AmqpConnection,
    private readonly playersService: PlayersService,
    private readonly npcsService: NpcsService,
    private readonly itemsService: ItemsService,
    private readonly guildsService: GuildsService,
    private readonly prisma: PrismaService,
    private readonly lootlogConfigService: LootlogConfigService,
    private readonly userLootlogConfigService: UserLootlogConfigService,
    private readonly lootStatsService: LootStatsService,
    private readonly redisService: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly redlockService: RedlockService,
  ) {}

  onModuleInit(): void {
    this.redlock = this.redlockService.createInstance();
  }

  async accept(options: {
    discordId: string;
    submission: CreateLootDto;
  }): Promise<CreateLootResponse> {
    const uniqueId = this.createUniqueLootId(
      options.submission.loots,
      options.submission.world,
    );
    let lock: Awaited<ReturnType<typeof this.redlock.acquire>> | null = null;

    try {
      lock = await this.redlock.acquire(
        [`loot:lock:${uniqueId}`],
        LOOT_LOCK_TTL_MS,
        LOOT_LOCK_RETRY_OPTIONS,
      );
      return await this.acceptWithLock({ ...options, uniqueId });
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

  private async acceptWithLock(options: {
    discordId: string;
    submission: CreateLootDto;
    uniqueId: string;
  }): Promise<CreateLootResponse> {
    const existingLoot = await this.prisma.db.orm.public.Loot.where((row) =>
      row.uniqueId.eq(options.uniqueId),
    )
      .select("id")
      .first();
    const [guilds, characterConfig] = await Promise.all([
      this.guildsService.getGuildsForRequiredPermissions(options.discordId, [
        Permission.LOOTLOG_LOOTS_WRITE,
      ]),
      this.userLootlogConfigService.getLootlogCharacterConfig(
        options.discordId,
        options.submission.accountId,
        options.submission.characterId,
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
      this.throwBadRequest(
        ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
        guilds.map((guild) =>
          this.createRejectedGuild(guild, "NOT_ON_CHARACTER_WHITELIST"),
        ),
      );
    }

    const [lootlogConfigs, members] = await Promise.all([
      this.lootlogConfigService.getMultipleLootlogConfigs(filteredGuildIds),
      this.prisma.db.orm.public.Member.where((row) =>
        and(row.guildId.in(filteredGuildIds), row.userId.eq(options.discordId)),
      )
        .select("id", "guildId")
        .all(),
    ]);
    const npcData = this.processNpcs(options.submission.npcs);
    if (npcData.primary.wt < 10) {
      throw new BadRequestException(ErrorKey.NPC_WT_TOO_LOW);
    }

    const primaryNpcType = getNpcTypeByWt(
      NpcType,
      npcData.primary.wt,
      npcData.primary.prof,
      npcData.primary.type,
    );
    const outcome = this.resolveAcceptanceOutcome({
      guilds,
      lootlogConfigs,
      members,
      primaryNpcType,
      submission: options.submission,
      whitelistedGuildIds,
    });
    if (outcome.submissionData.length === 0) {
      this.throwBadRequest(
        ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
        outcome.rejectedGuilds,
      );
    }

    const socketNpcs = npcData.mapped.map((npc) => ({
      lvl: npc.lvl,
      prof: npc.prof,
      type: npc.type,
      wt: npc.wt,
    }));
    if (existingLoot) {
      await this.acceptExistingLoot(
        existingLoot.id,
        outcome.submissionData,
        socketNpcs,
      );
      return this.createResponse(existingLoot.id, outcome);
    }

    const lootId = await this.createNewLoot({
      npcData,
      outcome,
      primaryNpcType,
      submission: options.submission,
      uniqueId: options.uniqueId,
    });
    await this.publishNewLootEffects({
      lootId,
      npcs: npcData.mapped,
      outcome,
      socketNpcs,
      submission: options.submission,
    });
    return this.createResponse(lootId, outcome);
  }

  private resolveAcceptanceOutcome(options: {
    guilds: Guild[];
    lootlogConfigs: Array<{ id: string; npcs: LootlogConfigNpc[] }>;
    members: Array<{ id: number; guildId: string }>;
    primaryNpcType: NpcType;
    submission: CreateLootDto;
    whitelistedGuildIds: Set<string>;
  }): AcceptanceOutcome {
    const lootlogConfigByGuildId = new Map(
      options.lootlogConfigs.map((config) => [config.id, config]),
    );
    const memberByGuildId = new Map(
      options.members.map((member) => [member.guildId, member]),
    );

    return options.guilds.reduce<AcceptanceOutcome>(
      (outcome, guild) => {
        if (!options.whitelistedGuildIds.has(guild.id)) {
          outcome.rejectedGuilds.push(
            this.createRejectedGuild(guild, "NOT_ON_CHARACTER_WHITELIST"),
          );
          return outcome;
        }

        const config = lootlogConfigByGuildId.get(guild.id);
        if (!config) {
          outcome.rejectedGuilds.push(
            this.createRejectedGuild(guild, "MISSING_LOOTLOG_CONFIG"),
          );
          return outcome;
        }
        if (
          !this.isAcceptedByConfig(
            options.submission.loots,
            config.npcs,
            options.primaryNpcType,
          )
        ) {
          outcome.rejectedGuilds.push(
            this.createRejectedGuild(guild, "LOOT_NOT_ACCEPTED_BY_CONFIG"),
          );
          return outcome;
        }

        const member = memberByGuildId.get(guild.id);
        if (!member) {
          outcome.rejectedGuilds.push(
            this.createRejectedGuild(guild, "MISSING_MEMBER"),
          );
          return outcome;
        }
        outcome.submissionData.push({
          guildId: guild.id,
          guildName: guild.name,
          memberId: member.id,
        });
        outcome.submittedGuilds.push({
          guildId: guild.id,
          guildName: guild.name,
        });
        return outcome;
      },
      { submissionData: [], submittedGuilds: [], rejectedGuilds: [] },
    );
  }

  private async acceptExistingLoot(
    lootId: number,
    submissions: LootSubmissionData[],
    socketNpcs: LootEventNpc[],
  ): Promise<void> {
    const existingRecords =
      await this.prisma.db.orm.public.OrganizationLootRecord.where((row) =>
        and(
          row.lootId.eq(lootId),
          row.guildId.in(submissions.map((submission) => submission.guildId)),
        ),
      )
        .select("guildId", "archivedAt")
        .include("submissions", (row) => row.select("memberId"))
        .all();
    const existingSubmissions = existingRecords.flatMap((record) =>
      record.submissions.map((submission) => ({
        guildId: record.guildId,
        memberId: submission.memberId,
      })),
    );
    const newSubmissions = this.getNewSubmissions(
      submissions,
      existingSubmissions,
    );
    if (newSubmissions.length === 0) {
      return;
    }

    const organizationRecords = await this.prisma.db.transaction(async (tx) => {
      for (const guildId of this.getUniqueOrganizationIds(newSubmissions)) {
        await tx.orm.public.OrganizationLootRecord.where((row) =>
          and(row.guildId.eq(guildId), row.lootId.eq(lootId)),
        ).upsert({
          create: { guildId, lootId, updatedAt: dateToTemporal(new Date()) },
          update: {},
        });
      }
      const records = await tx.orm.public.OrganizationLootRecord.where((row) =>
        and(
          row.lootId.eq(lootId),
          row.guildId.in(newSubmissions.map(({ guildId }) => guildId)),
        ),
      )
        .select("id", "guildId", "archivedAt")
        .all();
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
      for (const submission of submissionRows) {
        await tx.orm.public.LootSubmission.where((row) =>
          and(
            row.organizationLootRecordId.eq(
              submission.organizationLootRecordId,
            ),
            row.memberId.eq(submission.memberId),
          ),
        ).upsert({
          create: { ...submission, updatedAt: dateToTemporal(new Date()) },
          update: {},
        });
      }
      return records;
    });

    const archivedOrganizationIds = new Set(
      organizationRecords
        .filter((record) => (record.archivedAt ?? null) !== null)
        .map((record) => record.guildId),
    );
    const activeSubmissions = newSubmissions.filter(
      (submission) => !archivedOrganizationIds.has(submission.guildId),
    );
    const activeOrganizationIds = activeSubmissions.map(
      ({ guildId }) => guildId,
    );
    await this.invalidateCaches(activeOrganizationIds);
    await this.publishCreatedFacts(lootId, activeSubmissions, socketNpcs);
  }

  private async createNewLoot(options: {
    npcData: { primary: CreateLootDto["npcs"][number] };
    outcome: AcceptanceOutcome;
    primaryNpcType: NpcType;
    submission: CreateLootDto;
    uniqueId: string;
  }): Promise<number> {
    const initialAllocation = await this.allocation.inferInitial(
      options.submission,
      options.npcData.primary,
      options.primaryNpcType,
    );
    const loot = await this.prisma.db.transaction(async (transaction) => {
      const savedLoot = await transaction.orm.public.Loot.create({
        uniqueId: options.uniqueId,
        world: options.submission.world,
        source: options.submission.source,
        location: options.submission.location,
        lootShare: initialAllocation.share,
        lootShareSource: initialAllocation.source,
        updatedAt: dateToTemporal(new Date()),
      });

      for (const item of options.submission.loots) {
        const { lvl, rarity, type } = this.getItemStats(item);
        const statsHash = this.generateStatsHash(item.stat);
        const snapshot = await transaction.orm.public.ItemSnapshot.where(
          (row) => and(row.itemId.eq(item.id), row.statsHash.eq(statsHash)),
        ).upsert({
          create: {
            itemId: item.id,
            statsHash,
            name: item.name,
            icon: item.icon,
            lvl,
            rarity,
            itemType: type,
            statRaw: item.stat,
            statsSnapshot: this.parseItemStats(item.stat),
          },
          update: {},
        });
        await transaction.orm.public.LootItem.create({
          lootId: savedLoot.id,
          itemSnapshotId: snapshot.id,
          hid: item.hid,
        });
      }

      for (const player of options.submission.players) {
        const { accountId, characterId } = this.normalizeCharacterAndAccount(
          player.id,
          player.accountId,
        );
        const snapshotHash = createHash("sha256")
          .update(`${player.name}${player.prof}${player.icon}`)
          .digest("hex");
        const snapshot = await transaction.orm.public.PlayerSnapshot.where(
          (row) =>
            and(
              row.world.eq(options.submission.world),
              row.accountId.eq(accountId),
              row.characterId.eq(characterId),
              row.snapshotHash.eq(snapshotHash),
            ),
        ).upsert({
          create: {
            world: options.submission.world,
            accountId,
            characterId,
            snapshotHash,
            name: player.name,
            prof: getProfByShortname(player.prof),
            icon: player.icon,
          },
          update: {},
        });
        await transaction.orm.public.LootPlayer.create({
          lootId: savedLoot.id,
          playerSnapshotId: snapshot.id,
          lvl: player.lvl,
        });
      }

      for (const npc of options.submission.npcs) {
        const snapshot = await transaction.orm.public.NpcSnapshot.where((row) =>
          and(row.npcId.eq(npc.id), row.name.eq(npc.name)),
        ).upsert({
          create: {
            npcId: npc.id,
            name: npc.name,
            _type: getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
            lvl: npc.lvl,
            icon: npc.icon,
            wt: npc.wt,
            margonemType: npc.type,
            prof: npc.prof ? getProfByShortname(npc.prof) : null,
          },
          update: {},
        });
        await transaction.orm.public.LootNpc.create({
          lootId: savedLoot.id,
          npcSnapshotId: snapshot.id,
        });
      }

      for (const submission of options.outcome.submissionData) {
        const record =
          await transaction.orm.public.OrganizationLootRecord.create({
            lootId: savedLoot.id,
            guildId: submission.guildId,
            updatedAt: dateToTemporal(new Date()),
          });
        await transaction.orm.public.LootSubmission.create({
          organizationLootRecordId: record.id,
          memberId: submission.memberId,
          updatedAt: dateToTemporal(new Date()),
        });
      }
      return savedLoot;
    });
    return loot.id;
  }

  private async publishNewLootEffects(options: {
    lootId: number;
    npcs: ProcessedNpc[];
    outcome: AcceptanceOutcome;
    socketNpcs: LootEventNpc[];
    submission: CreateLootDto;
  }): Promise<void> {
    const organizationIds = options.outcome.submissionData.map(
      ({ guildId }) => guildId,
    );
    await this.invalidateCaches(organizationIds);
    await this.publishCreatedFacts(
      options.lootId,
      options.outcome.submissionData,
      options.socketNpcs,
    );

    const players = this.mapPlayers(options.submission.players);
    this.playersService.bulkIndexPlayers(
      players.map((player) => ({
        ...player,
        world: options.submission.world,
      })),
    );
    this.npcsService.bulkIndexNpcs(
      options.npcs.map((npc) => ({ ...npc, world: options.submission.world })),
    );

    const items = this.mapItems(options.submission.loots);
    this.itemsService.bulkIndexItems(
      items.map((item) => ({
        id: item.id,
        name: item.name,
        icon: item.icon,
        stat: item.stat,
        lvl: item.lvl,
        rarity: item.rarity,
        type: item.type,
        world: options.submission.world,
      })),
    );

    await this.amqpConnection.publish(
      DEFAULT_EXCHANGE_NAME,
      RoutingKey.NOTIFICATIONS_LOOT_CREATED,
      {
        version: 2,
        lootId: options.lootId,
        world: options.submission.world,
        guildIds: organizationIds,
        itemIds: items.map((item) => item.id),
        itemNames: items.map((item) => item.name),
        npcs: options.socketNpcs.map((npc) => ({
          type: npc.type ?? null,
          lvl: npc.lvl ?? null,
        })),
      } satisfies LootCreatedNotificationEventV2,
    );
  }

  private createUniqueLootId(
    loots: CreateLootDto["loots"],
    world: string,
  ): string {
    const source =
      [...loots]
        .sort((left, right) => left.hid.localeCompare(right.hid))
        .map((loot) => loot.hid)
        .join("") + world;
    return createHash("sha256").update(source).digest("hex");
  }

  private processNpcs(npcs: CreateLootDto["npcs"]): {
    primary: CreateLootDto["npcs"][number];
    mapped: ProcessedNpc[];
  } {
    const sorted = [...npcs].sort((left, right) => right.wt - left.wt);
    const primary = sorted[0];
    if (!primary) {
      throw new BadRequestException(ErrorKey.NPC_WT_TOO_LOW);
    }
    return {
      primary,
      mapped: sorted.map((npc) => ({
        id: npc.id,
        name: npc.name,
        lvl: npc.lvl,
        prof: npc.prof ? getProfByShortname(npc.prof) : "",
        icon: npc.icon,
        wt: npc.wt,
        location: npc.location,
        type: getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
        margonemType: npc.type,
      })),
    };
  }

  private isAcceptedByConfig(
    loots: CreateLootDto["loots"],
    npcs: LootlogConfigNpc[],
    primaryNpcType: NpcType,
  ): boolean {
    const targetNpc = npcs.find((npc) => npc.npcType === primaryNpcType);
    if (!targetNpc) {
      return false;
    }
    return loots.some((item) =>
      targetNpc.allowedRarities.includes(this.getItemStats(item).rarity),
    );
  }

  private getItemStats(item: CreateLootDto["loots"][number]) {
    const parsedStats = this.parseItemStats(item.stat);
    const lvl = parsedStats["lvl"] ? Number(parsedStats["lvl"]) : 0;
    const rarity = parsedStats["rarity"]?.toUpperCase() as ItemRarity;
    const requiredProf = parsedStats["reqp"];
    const prof = requiredProf
      ? requiredProf
          .split("")
          .map((id) => getProfByShortname(id))
          .filter(Boolean)
      : Object.values(Profession);
    return { lvl, rarity, prof, type: getItemTypeByCl(item.cl) };
  }

  private parseItemStats(stats: string): Record<string, string> {
    return stats.split(";").reduce<Record<string, string>>((parsed, entry) => {
      const [key, value] = entry.split("=");
      if (key && value) {
        parsed[key] = value;
      }
      return parsed;
    }, {});
  }

  private mapItems(items: CreateLootDto["loots"]) {
    return items.map((item) => ({ ...item, ...this.getItemStats(item) }));
  }

  private mapPlayers(players: CreateLootDto["players"]) {
    return players.map((player) => {
      const { accountId, characterId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );
      return {
        id: `${characterId}${accountId}`,
        name: player.name,
        lvl: player.lvl,
        prof: getProfByShortname(player.prof),
        icon: player.icon,
        characterId,
        accountId,
      };
    });
  }

  private normalizeCharacterAndAccount(
    id: string | number,
    accountId: string | number,
  ): { characterId: number; accountId: number } {
    const account = String(accountId ?? "");
    const character = String(id ?? "");
    if (account && character.endsWith(account)) {
      const characterPart = character.slice(
        0,
        character.length - account.length,
      );
      return {
        characterId: Number(characterPart || character),
        accountId: Number(account),
      };
    }
    return { characterId: Number(character), accountId: Number(account) };
  }

  private generateStatsHash(stats: string): string {
    const normalized = stats
      .split(";")
      .filter((entry) => {
        const [key] = entry.split("=");
        return Boolean(key) && !SNAPSHOT_HASH_IGNORED_KEYS.has(key);
      })
      .sort()
      .join(";");
    return createHash("sha256").update(normalized).digest("hex");
  }

  private createRejectedGuild(
    guild: Pick<Guild, "id" | "name">,
    reason: CreateLootRejectedGuildReason,
  ): CreateLootRejectedGuild {
    return { guildId: guild.id, guildName: guild.name, reason };
  }

  private createResponse(
    id: number,
    outcome: Omit<AcceptanceOutcome, "submissionData">,
  ): CreateLootResponse {
    return {
      id,
      submittedGuilds: outcome.submittedGuilds,
      rejectedGuilds: outcome.rejectedGuilds,
    };
  }

  private throwBadRequest(
    message: ErrorKey,
    rejectedGuilds: CreateLootRejectedGuild[],
  ): never {
    throw new BadRequestException({
      message,
      submittedGuilds: [],
      rejectedGuilds,
    });
  }

  private getNewSubmissions(
    submissions: LootSubmissionData[],
    existingSubmissions: Array<{ guildId: string; memberId: number }>,
  ): LootSubmissionData[] {
    const existingKeys = new Set(
      existingSubmissions.map(
        ({ guildId, memberId }) => `${guildId}:${memberId}`,
      ),
    );
    return submissions.filter(
      ({ guildId, memberId }) => !existingKeys.has(`${guildId}:${memberId}`),
    );
  }

  private getUniqueOrganizationIds(
    submissions: Array<{ guildId: string }>,
  ): string[] {
    return [...new Set(submissions.map(({ guildId }) => guildId))];
  }

  private async invalidateCaches(organizationIds: string[]): Promise<void> {
    await Promise.all([
      ...this.getUniqueOrganizationIds(
        organizationIds.map((guildId) => ({ guildId })),
      ).map(async (guildId) => {
        try {
          await this.redisService.deleteByPattern(`loots:list:${guildId}:*`);
        } catch (error) {
          this.logger.warn("Failed to invalidate loots list cache", {
            error,
            guildId,
          });
        }
      }),
      organizationIds.length > 0
        ? this.lootStatsService.invalidateCache(organizationIds)
        : Promise.resolve(),
    ]);
  }

  private async publishCreatedFacts(
    lootId: number,
    submissions: LootSubmissionData[],
    npcs: LootEventNpc[],
  ): Promise<void> {
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
}
