import { Effect } from "effect";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import type {
  GuildLootCreatedEventV2,
  GuildLootEventNpc,
} from "@lootlog/schema/loot-events";
import type { LootCreatedNotificationEventV2 } from "@lootlog/schema/notifications";
import {
  InvalidRequestError,
  PermissionDeniedError,
} from "#src/shared/http/http-errors";
import { createHash } from "node:crypto";
import { DEFAULT_EXCHANGE_NAME } from "#src/config/rabbitmq.config";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { ItemRarityEnum as ItemRarity } from "@lootlog/schema/item-rarity";
import {
  LootShareSourceEnum as LootShareSource,
  ProfessionEnum as Profession,
} from "@lootlog/schema/loot";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import type {
  guildTable,
  lootlogConfigNpcTable,
} from "#src/database/drizzle/schema";
import type {
  CreateLootDto,
  LootsControllerCreateLoot201 as CreateLootResponse,
} from "#src/http-api/lootlog-api";
import { ErrorKey } from "#src/loots/enum/error-key.enum";
import { getItemTypeByCl } from "#src/shared/utils/get-item-type-by-cl";
import { getProfByShortname } from "#src/shared/utils/get-prof-by-shortname";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { LootShare } from "#src/loots/loot-response.schema";
import type { LootSubmissionAcceptancePersistence } from "./loot-submission-acceptance.repository.js";

type CreateLootSubmittedGuild = CreateLootResponse["submittedGuilds"][number];
type CreateLootRejectedGuild = CreateLootResponse["rejectedGuilds"][number];
type CreateLootRejectedGuildReason = CreateLootRejectedGuild["reason"];

type Guild = typeof guildTable.$inferSelect;
type LootlogConfigNpc = typeof lootlogConfigNpcTable.$inferSelect;

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

interface LootStatsInvalidator {
  readonly invalidateCache: (
    guildIds: string[],
  ) => Effect.Effect<void, unknown>;
}

interface LootSubmissionPublisher {
  readonly publish: (
    exchange: string,
    routingKey: string,
    message: unknown,
  ) => Effect.Effect<void, unknown>;
}

interface LootSubmissionCache {
  readonly deleteByPattern: (pattern: string) => Effect.Effect<void, unknown>;
}

interface LootSubmissionLock {
  readonly withLock: <A, E>(
    resource: string,
    ttlMilliseconds: number,
    options: typeof LOOT_LOCK_RETRY_OPTIONS,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, unknown>;
}

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

export interface LootSubmissionAcceptance {
  readonly accept: (options: {
    discordId: string;
    submission: CreateLootDto;
  }) => Effect.Effect<CreateLootResponse, unknown>;
}

class LootSubmissionAcceptanceImplementation implements LootSubmissionAcceptance {
  constructor(
    private readonly repository: LootSubmissionAcceptancePersistence,
    private readonly publisher: LootSubmissionPublisher,
    private readonly lootStatsService: LootStatsInvalidator,
    private readonly cache: LootSubmissionCache,
    private readonly logger: Logger,
    private readonly lock: LootSubmissionLock,
  ) {}

  accept(options: {
    discordId: string;
    submission: CreateLootDto;
  }): Effect.Effect<CreateLootResponse, unknown> {
    const uniqueId = this.createUniqueLootId(
      options.submission.loots,
      options.submission.world,
    );
    return this.lock
      .withLock(
        `loot:lock:${uniqueId}`,
        LOOT_LOCK_TTL_MS,
        LOOT_LOCK_RETRY_OPTIONS,
        this.acceptWithLock({ ...options, uniqueId }),
      )
      .pipe(
        Effect.withSpan("LootSubmissionAcceptance.accept", {
          attributes: { adapter: "loot-submission", retryCount: 0 },
        }),
      );
  }

  private acceptWithLock(options: {
    discordId: string;
    submission: CreateLootDto;
    uniqueId: string;
  }): Effect.Effect<CreateLootResponse, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const existingLootId = yield* self.repository.findLootIdByUniqueId(
        options.uniqueId,
      );
      const { guilds, characterConfig } = yield* Effect.all({
        guilds: self.repository.findGuildsForPermissions(options.discordId, [
          Permission.LOOTLOG_LOOTS_WRITE,
        ]),
        characterConfig: self.repository.findCharacterConfig(
          options.discordId,
          options.submission.accountId,
          options.submission.characterId,
        ),
      });
      if (guilds.length === 0) {
        return yield* Effect.fail(new PermissionDeniedError());
      }

      const whitelistedGuildIds = new Set(
        characterConfig?.catchingGuildIds ?? [],
      );
      const filteredGuildIds = guilds
        .filter((guild) => whitelistedGuildIds.has(guild.id))
        .map((guild) => guild.id);
      if (filteredGuildIds.length === 0) {
        return yield* Effect.fail(
          new InvalidRequestError({
            message: ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
            submittedGuilds: [],
            rejectedGuilds: guilds.map((guild) =>
              self.createRejectedGuild(guild, "NOT_ON_CHARACTER_WHITELIST"),
            ),
          }),
        );
      }

      const { lootlogConfigs, members } = yield* Effect.all({
        lootlogConfigs: self.repository.findLootlogConfigs(filteredGuildIds),
        members: self.repository.findMembers(
          options.discordId,
          filteredGuildIds,
        ),
      });
      const npcData = yield* Effect.try({
        try: () => self.processNpcs(options.submission.npcs),
        catch: (error) =>
          error instanceof InvalidRequestError
            ? error
            : new InvalidRequestError(ErrorKey.NPC_WT_TOO_LOW),
      });
      if (npcData.primary.wt < 10) {
        return yield* Effect.fail(
          new InvalidRequestError(ErrorKey.NPC_WT_TOO_LOW),
        );
      }

      const primaryNpcType = getNpcTypeByWt(
        NpcType,
        npcData.primary.wt,
        npcData.primary.prof,
        npcData.primary.type,
      );
      const outcome = self.resolveAcceptanceOutcome({
        guilds,
        lootlogConfigs,
        members,
        primaryNpcType,
        submission: options.submission,
        whitelistedGuildIds,
      });
      if (outcome.submissionData.length === 0) {
        return yield* Effect.fail(
          new InvalidRequestError({
            message: ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
            submittedGuilds: [],
            rejectedGuilds: outcome.rejectedGuilds,
          }),
        );
      }

      const socketNpcs = npcData.mapped.map((npc) => ({
        lvl: npc.lvl,
        prof: npc.prof,
        type: npc.type,
        wt: npc.wt,
      }));
      if (existingLootId !== null) {
        yield* self.acceptExistingLoot(
          existingLootId,
          outcome.submissionData,
          socketNpcs,
        );
        return self.createResponse(existingLootId, outcome);
      }

      const lootId = yield* self.createNewLoot({
        npcData,
        outcome,
        primaryNpcType,
        submission: options.submission,
        uniqueId: options.uniqueId,
      });
      yield* self.publishNewLootEffects({
        lootId,
        npcs: npcData.mapped,
        outcome,
        socketNpcs,
        submission: options.submission,
      });
      return self.createResponse(lootId, outcome);
    });
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

  private acceptExistingLoot(
    lootId: number,
    submissions: LootSubmissionData[],
    socketNpcs: LootEventNpc[],
  ): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const existingRecords = yield* self.repository.findExistingRecords(
        lootId,
        submissions.map(({ guildId }) => guildId),
      );
      const existingSubmissions = existingRecords.flatMap((record) =>
        record.submissions.map((submission) => ({
          guildId: record.guildId,
          memberId: submission.memberId,
        })),
      );
      const newSubmissions = self.getNewSubmissions(
        submissions,
        existingSubmissions,
      );
      if (newSubmissions.length === 0) {
        return;
      }

      const organizationRecords = yield* self.repository.appendSubmissions(
        lootId,
        newSubmissions,
      );

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
      yield* self.invalidateCaches(activeOrganizationIds);
      yield* self.publishCreatedFacts(lootId, activeSubmissions, socketNpcs);
    });
  }

  private createNewLoot(options: {
    npcData: { primary: CreateLootDto["npcs"][number] };
    outcome: AcceptanceOutcome;
    primaryNpcType: NpcType;
    submission: CreateLootDto;
    uniqueId: string;
  }): Effect.Effect<number, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const initialAllocation = yield* self.inferInitialAllocation(
        options.submission,
        options.npcData.primary,
        options.primaryNpcType,
      );
      return yield* self.repository.createNewLoot({
        uniqueId: options.uniqueId,
        world: options.submission.world,
        source: options.submission.source,
        location: options.submission.location,
        lootShare: initialAllocation.share,
        lootShareSource: initialAllocation.source,
        items: self.mapLootItemsToPersistence(options.submission.loots),
        players: self.mapLootPlayersToPersistence(
          options.submission.players,
          options.submission.world,
        ),
        npcs: self.mapLootNpcsToPersistence(options.submission.npcs),
        submissions: options.outcome.submissionData,
      });
    });
  }

  private publishNewLootEffects(options: {
    lootId: number;
    npcs: ProcessedNpc[];
    outcome: AcceptanceOutcome;
    socketNpcs: LootEventNpc[];
    submission: CreateLootDto;
  }): Effect.Effect<void, unknown> {
    const self = this;
    return Effect.gen(function* () {
      const organizationIds = options.outcome.submissionData.map(
        ({ guildId }) => guildId,
      );
      yield* self.invalidateCaches(organizationIds);
      yield* self.publishCreatedFacts(
        options.lootId,
        options.outcome.submissionData,
        options.socketNpcs,
      );

      const players = self.mapPlayers(options.submission.players);
      yield* self.publisher.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.SEARCH_PLAYERS_INDEX,
        players.map((player) => ({
          ...player,
          world: options.submission.world,
        })),
      );
      yield* self.publisher.publish(
        DEFAULT_EXCHANGE_NAME,
        RoutingKey.SEARCH_NPCS_INDEX,
        options.npcs.map((npc) => ({
          ...npc,
          world: options.submission.world,
        })),
      );

      const items = self.mapItems(options.submission.loots);
      if (items.length > 0)
        yield* self.publisher.publish(
          DEFAULT_EXCHANGE_NAME,
          RoutingKey.SEARCH_ITEMS_INDEX,
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

      yield* self.publisher.publish(
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
    });
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

  private inferInitialAllocation(
    submission: CreateLootDto,
    primaryNpc: CreateLootDto["npcs"][number],
    primaryNpcType: NpcType,
  ) {
    if (primaryNpcType !== NpcType.COLOSSUS) {
      return Effect.succeed({
        share: {} as Record<string, never>,
        source: LootShareSource.NONE,
      });
    }
    return this.repository.hasAmbiguousNpcVariant(primaryNpc.name).pipe(
      Effect.map((ambiguous) => {
        if (ambiguous) {
          return {
            share: {} as Record<string, never>,
            source: LootShareSource.NONE,
          };
        }
        const share = this.mapItemOwnerAllocation(
          submission.loots,
          submission.players,
        );
        return share
          ? { share, source: LootShareSource.ITEM_OWNER }
          : {
              share: {} as Record<string, never>,
              source: LootShareSource.NONE,
            };
      }),
    );
  }

  private mapItemOwnerAllocation(
    loots: CreateLootDto["loots"],
    players: CreateLootDto["players"],
  ): LootShare | null {
    if (loots.length === 0 || loots.length !== players.length) return null;
    const shareByCharacter = new Map<number, string>();
    const shareIds = new Set<string>();
    for (const player of players) {
      const { accountId, characterId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );
      const shareId = `${characterId}${accountId}`;
      if (shareByCharacter.has(player.id) || shareIds.has(shareId)) return null;
      shareByCharacter.set(player.id, shareId);
      shareIds.add(shareId);
    }
    const assigned = new Set<number>();
    const share: LootShare = {};
    for (const loot of loots) {
      if (loot.own === undefined || assigned.has(loot.own)) return null;
      const shareId = shareByCharacter.get(loot.own);
      if (shareId === undefined) return null;
      assigned.add(loot.own);
      share[shareId] = [loot.hid];
    }
    return assigned.size === players.length ? share : null;
  }

  private processNpcs(npcs: CreateLootDto["npcs"]): {
    primary: CreateLootDto["npcs"][number];
    mapped: ProcessedNpc[];
  } {
    const sorted = [...npcs].sort((left, right) => right.wt - left.wt);
    const primary = sorted[0];
    if (!primary) {
      throw new InvalidRequestError(ErrorKey.NPC_WT_TOO_LOW);
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

  private mapLootItemsToPersistence(items: CreateLootDto["loots"]) {
    return items.map((item) => {
      const { lvl, rarity, type } = this.getItemStats(item);
      const statsHash = this.generateStatsHash(item.stat);
      return {
        itemId: item.id,
        statsHash,
        name: item.name,
        icon: item.icon,
        lvl,
        rarity,
        itemType: type,
        statRaw: item.stat,
        statsSnapshot: this.parseItemStats(item.stat),
        hid: item.hid,
      };
    });
  }

  private mapLootPlayersToPersistence(
    players: CreateLootDto["players"],
    world: string,
  ) {
    return players.map((player) => {
      const prof = getProfByShortname(player.prof);
      const { accountId, characterId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );
      const snapshotHash = createHash("sha256")
        .update(`${player.name}${player.prof}${player.icon}`)
        .digest("hex");
      return {
        lvl: player.lvl,
        world,
        accountId,
        characterId,
        snapshotHash,
        name: player.name,
        prof,
        icon: player.icon,
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

  private mapLootNpcsToPersistence(npcs: CreateLootDto["npcs"]) {
    return npcs.map((npc) => ({
      npcId: npc.id,
      name: npc.name,
      type: getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
      lvl: npc.lvl,
      icon: npc.icon,
      wt: npc.wt,
      margonemType: npc.type,
      prof: npc.prof ? getProfByShortname(npc.prof) : null,
    }));
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

  private invalidateCaches(
    organizationIds: string[],
  ): Effect.Effect<void, unknown> {
    return Effect.all(
      [
        ...this.getUniqueOrganizationIds(
          organizationIds.map((guildId) => ({ guildId })),
        ).map((guildId) =>
          this.cache.deleteByPattern(`loots:list:${guildId}:*`).pipe(
            Effect.catch((error) =>
              Effect.sync(() =>
                this.logger.warn("Failed to invalidate loots list cache", {
                  error,
                  guildId,
                }),
              ),
            ),
          ),
        ),
        organizationIds.length > 0
          ? this.lootStatsService.invalidateCache(organizationIds)
          : Effect.void,
      ],
      { concurrency: "unbounded" },
    ).pipe(Effect.asVoid);
  }

  private publishCreatedFacts(
    lootId: number,
    submissions: LootSubmissionData[],
    npcs: LootEventNpc[],
  ): Effect.Effect<void, unknown> {
    return Effect.all(
      submissions.map((submission) =>
        this.publisher.publish(
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
      { concurrency: "unbounded" },
    ).pipe(Effect.asVoid);
  }
}

export const makeLootSubmissionAcceptance = (
  repository: LootSubmissionAcceptancePersistence,
  publisher: LootSubmissionPublisher,
  lootStatsService: LootStatsInvalidator,
  cache: LootSubmissionCache,
  logger: Logger,
  lock: LootSubmissionLock,
): LootSubmissionAcceptance =>
  new LootSubmissionAcceptanceImplementation(
    repository,
    publisher,
    lootStatsService,
    cache,
    logger,
    lock,
  );
