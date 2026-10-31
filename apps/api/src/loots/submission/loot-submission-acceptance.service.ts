import type { MapPlayersSnapshot } from "@lootlog/protocol/loot-summary";
import {
  createItemSnapshotHash,
  createItemStatsHash,
} from "@lootlog/database/snapshot-hash";
import { parseItemStats, splitItemStat } from "@lootlog/database/item-stat";
import { Clock, Effect, Schema } from "effect";
import { once } from "es-toolkit";
import {
  DROP_SOURCE_BOSS_TYPES,
  getNpcTypeByWt,
  MIN_LOOT_NPC_WT,
} from "@lootlog/domain/npc-type";
import {
  resolveLootAcceptance,
  type LootAcceptance,
} from "@lootlog/domain/loot-acceptance";
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
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ItemRaritySchema } from "@lootlog/schema/item-rarity";
import type {
  FactionWarAward,
  FactionWarPoints,
} from "#src/faction-wars/faction-war-points";
import { LootShareSourceEnum as LootShareSource } from "@lootlog/schema/loot";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { NpcIdentityNamespace } from "@lootlog/schema/npc-identity";
import { Permission } from "@lootlog/schema/permissions";
import type {
  guildTable,
  lootlogConfigNpcTable,
} from "#src/database/drizzle/schema";
import type {
  CreateLootRequest,
  CreateLootResponse,
} from "#src/contracts/loots/schemas";
import { ErrorKey } from "#src/loots/error-key";
import { getItemTypeByCl } from "@lootlog/domain/item-type";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import type { GameVersion } from "@lootlog/schema/game-version";
import { getProfByShortname } from "@lootlog/domain/profession";
import { parseRequiredProfessions } from "#src/loots/required-professions";
import {
  LootPublicationPayload,
  type LootPublication,
} from "./loot-publication-outbox.js";
import type { LootShare } from "#src/loots/loot-response.schema";
import type {
  AcceptedNpcSnapshot,
  LootSubmissionAcceptancePersistence,
} from "#src/loots/submission/loot-submission-acceptance.repository";

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

interface LootSubmissionLock {
  readonly withLock: <A, E>(
    resource: string,
    ttlMilliseconds: number,
    options: typeof LOOT_LOCK_RETRY_OPTIONS,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, unknown>;
}

/**
 * The catalog identity stored for a looted NPC. A reported template wins; a
 * spawn without one stays in the runtime namespace instead of posing as a
 * template. Clients that send only the overloaded `id` keep `legacy`.
 */
const lootNpcIdentity = (npc: CreateLootRequest["npcs"][number]) => {
  if (npc.templateId !== undefined && npc.templateId !== null) {
    return {
      identityNamespace: NpcIdentityNamespace.TEMPLATE,
      npcId: npc.templateId,
    };
  }

  if (npc.runtimeId !== undefined) {
    return {
      identityNamespace: NpcIdentityNamespace.RUNTIME,
      npcId: npc.runtimeId,
    };
  }

  return { identityNamespace: NpcIdentityNamespace.LEGACY, npcId: npc.id };
};

const dropSourceBossTypes: ReadonlySet<string> = new Set(
  DROP_SOURCE_BOSS_TYPES,
);

const LOOT_LOCK_TTL_MS = 30_000;

const LOOT_LOCK_RETRY_OPTIONS = {
  retryCount: 100,
  retryDelay: 100,
  retryJitter: 50,
} as const;

type AwardFactionWarLoot = (
  loot: Parameters<FactionWarPoints["awardLoot"]>[0],
) => Effect.Effect<FactionWarAward | null, unknown>;

export interface LootSubmissionAcceptance {
  readonly accept: (options: {
    discordId: string;
    submission: CreateLootRequest;
  }) => Effect.Effect<CreateLootResponse, unknown>;
}

class LootSubmissionAcceptanceImplementation implements LootSubmissionAcceptance {
  constructor(
    private readonly repository: LootSubmissionAcceptancePersistence,
    private readonly lock: LootSubmissionLock,
    private readonly signalPublications: Effect.Effect<void>,
    private readonly awardFactionWarLoot: AwardFactionWarLoot,
  ) {}

  accept(options: {
    discordId: string;
    submission: CreateLootRequest;
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
        this.acceptWithLock({
          discordId: options.discordId,
          submission: options.submission,
          uniqueId,
        }),
      )
      .pipe(
        Effect.withSpan("LootSubmissionAcceptance.accept", {
          attributes: { adapter: "loot-submission", retryCount: 0 },
        }),
      );
  }

  private acceptWithLock(options: {
    discordId: string;
    submission: CreateLootRequest;
    uniqueId: string;
  }): Effect.Effect<CreateLootResponse, unknown> {
    return Effect.gen({ self: this }, function* () {
      const existingLootId = yield* this.repository.findLootIdByUniqueId(
        options.uniqueId,
      );

      const { guilds, characterConfig } = yield* Effect.all(
        {
          guilds: this.repository.findGuildsForPermissions(options.discordId, [
            Permission.LOOTLOG_LOOTS_WRITE,
          ]),
          characterConfig: this.repository.findCharacterConfig(
            options.discordId,
            options.submission.accountId,
            options.submission.characterId,
          ),
        },
        { concurrency: "unbounded" },
      );

      if (guilds.length === 0) {
        return yield* Effect.fail(new PermissionDeniedError());
      }

      const guildById = new Map(guilds.map((guild) => [guild.id, guild]));
      const organizationIds = guilds.map((guild) => guild.id);
      const catchingGuildIds = characterConfig?.catchingGuildIds ?? [];

      const whitelisted = resolveLootAcceptance({
        organizationIds,
        catchingGuildIds,
      });

      const filteredGuildIds = whitelisted.accepted.map(
        ({ organizationId }) => organizationId,
      );

      if (filteredGuildIds.length === 0) {
        return yield* Effect.fail(
          new InvalidRequestError({
            message: ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
            submittedGuilds: [],
            rejectedGuilds: this.mapRejectedGuilds(
              guildById,
              whitelisted.rejected,
            ),
          }),
        );
      }

      const { lootlogConfigs, members } = yield* Effect.all(
        {
          lootlogConfigs: this.repository.findLootlogConfigs(filteredGuildIds),
          members: this.repository.findMembers(
            options.discordId,
            filteredGuildIds,
          ),
        },
        { concurrency: "unbounded" },
      );

      const npcData = yield* Effect.try({
        try: () => this.processNpcs(options.submission.npcs),
        catch: (error) =>
          error instanceof InvalidRequestError
            ? error
            : new InvalidRequestError(ErrorKey.NPC_WT_TOO_LOW),
      });

      if (npcData.primary.wt < MIN_LOOT_NPC_WT) {
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

      const outcome = this.resolveAcceptanceOutcome({
        catchingGuildIds,
        guildById,
        lootlogConfigs,
        members,
        organizationIds,
        primaryNpcType,
        submission: options.submission,
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

      const mapPlayersSnapshot =
        options.submission.source === "FIGHT" &&
        primaryNpcType === NpcType.ELITE2 &&
        options.submission.loots.some(
          (item) => this.getItemStats(item).rarity === "LEGENDARY",
        )
          ? (options.submission.mapPlayersSnapshot ?? null)
          : null;

      if (existingLootId !== null) {
        yield* this.acceptExistingLoot(
          existingLootId,
          outcome.submissionData,
          mapPlayersSnapshot,
        );

        // Retries reach here once the loot exists, so a failed award gets
        // another chance; the war's ledger still pays each player once.
        const award = yield* this.awardLootPoints(
          options.discordId,
          existingLootId,
          options.submission,
        );

        return this.createResponse(existingLootId, outcome, award);
      }

      const observedAt = new Date(yield* Clock.currentTimeMillis);

      const lootId = yield* this.createNewLoot({
        mapPlayersSnapshot,
        npcData,
        outcome,
        primaryNpcType,
        submission: options.submission,
        uniqueId: options.uniqueId,
        publications: (lootId, npcs) =>
          this.newLootPublications({
            lootId,
            npcs,
            observedAt,
            outcome,
            submission: options.submission,
          }),
      });

      const award = yield* this.awardLootPoints(
        options.discordId,
        lootId,
        options.submission,
      );

      return this.createResponse(lootId, outcome, award);
    });
  }

  /**
   * Pays the whole party in the faction war and returns the submitter's part.
   * Logged, never failed: an accepted loot must not be rejected for points.
   */
  private awardLootPoints(
    discordId: string,
    lootId: number,
    submission: CreateLootRequest,
  ): Effect.Effect<FactionWarAward | null> {
    return this.awardFactionWarLoot({
      submitterDiscordId: discordId,
      lootId,
      rarities: submission.loots.map((item) => this.getItemStats(item).rarity),
      party: submission.players.map((player) => {
        const { accountId, characterId } = this.normalizeCharacterAndAccount(
          player.id,
          player.accountId,
        );

        return {
          accountId: String(accountId),
          characterId: String(characterId),
        };
      }),
    }).pipe(
      Effect.catch((error) =>
        Effect.logError("Failed to award faction war loot points", error).pipe(
          Effect.as(null),
        ),
      ),
    );
  }

  private resolveAcceptanceOutcome(options: {
    catchingGuildIds: readonly string[];
    guildById: ReadonlyMap<string, Guild>;
    lootlogConfigs: Array<{ id: string; npcs: LootlogConfigNpc[] }>;
    members: Array<{ id: number; guildId: string }>;
    organizationIds: readonly string[];
    primaryNpcType: NpcType;
    submission: CreateLootRequest;
  }): AcceptanceOutcome {
    const acceptance = resolveLootAcceptance({
      organizationIds: options.organizationIds,
      catchingGuildIds: options.catchingGuildIds,
      configs: new Map(
        options.lootlogConfigs.map((config) => [config.id, config]),
      ),
      members: new Map(
        options.members.map((member) => [member.guildId, member]),
      ),
      loot: {
        npcType: options.primaryNpcType,
        rarities: once(() =>
          options.submission.loots.map(
            (item) => this.getItemStats(item).rarity,
          ),
        ),
      },
    });

    const outcome: AcceptanceOutcome = {
      submissionData: [],
      submittedGuilds: [],
      rejectedGuilds: this.mapRejectedGuilds(
        options.guildById,
        acceptance.rejected,
      ),
    };

    for (const { organizationId, member } of acceptance.accepted) {
      const guild = options.guildById.get(organizationId);

      if (!guild || !member) continue;

      outcome.submissionData.push({
        guildId: guild.id,
        guildName: guild.name,
        memberId: member.id,
      });
      outcome.submittedGuilds.push({
        guildId: guild.id,
        guildName: guild.name,
      });
    }

    return outcome;
  }

  private mapRejectedGuilds(
    guildById: ReadonlyMap<string, Guild>,
    rejected: LootAcceptance<unknown>["rejected"],
  ): CreateLootRejectedGuild[] {
    return rejected.flatMap(({ organizationId, reason }) => {
      const guild = guildById.get(organizationId);

      return guild ? [this.createRejectedGuild(guild, reason)] : [];
    });
  }

  private acceptExistingLoot(
    lootId: number,
    submissions: LootSubmissionData[],
    mapPlayersSnapshot: MapPlayersSnapshot | null,
  ): Effect.Effect<void, unknown> {
    return Effect.gen({ self: this }, function* () {
      const existingRecords = yield* this.repository.findExistingRecords(
        lootId,
        submissions.map(({ guildId }) => guildId),
      );

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

      if (newSubmissions.length === 0 && mapPlayersSnapshot === null) {
        return;
      }

      yield* this.repository.appendSubmissions(
        lootId,
        newSubmissions,
        (organizationIds, npcs) =>
          this.createdPublications(
            lootId,
            organizationIds,
            this.mapNpcEvents(npcs),
          ),
        mapPlayersSnapshot === null
          ? undefined
          : {
              guildIds: submissions.map(({ guildId }) => guildId),
              players: mapPlayersSnapshot,
            },
      );
      yield* this.signalPublications;
    });
  }

  private createNewLoot(options: {
    mapPlayersSnapshot: MapPlayersSnapshot | null;
    npcData: { primary: CreateLootRequest["npcs"][number] };
    outcome: AcceptanceOutcome;
    primaryNpcType: NpcType;
    submission: CreateLootRequest;
    uniqueId: string;
    publications: (
      lootId: number,
      npcs: AcceptedNpcSnapshot[],
    ) => LootPublication[];
  }): Effect.Effect<number, unknown> {
    return Effect.gen({ self: this }, function* () {
      const initialAllocation = yield* this.inferInitialAllocation(
        options.submission,
        options.npcData.primary,
        options.primaryNpcType,
      );

      const lootId = yield* this.repository.createNewLoot(
        {
          mapPlayersSnapshot: options.mapPlayersSnapshot,
          uniqueId: options.uniqueId,
          world: options.submission.world,
          gameVersion: options.submission.gameVersion,
          source: options.submission.source,
          location: options.submission.location,
          lootShare: initialAllocation.share,
          lootShareSource: initialAllocation.source,
          items: this.mapLootItemsToPersistence(
            options.submission.loots,
            options.submission.gameVersion,
          ),
          players: this.mapLootPlayersToPersistence(
            options.submission.players,
            options.submission.world,
          ),
          npcs: this.mapLootNpcsToPersistence(options.submission.npcs),
          submissions: options.outcome.submissionData,
        },
        options.publications,
      );

      yield* this.signalPublications;

      return lootId;
    });
  }

  private newLootPublications(options: {
    lootId: number;
    npcs: AcceptedNpcSnapshot[];
    /** When the API accepted the loot; the catalog keeps the earliest. */
    observedAt: Date;
    outcome: AcceptanceOutcome;
    submission: CreateLootRequest;
  }): LootPublication[] {
    const organizationIds = this.getUniqueOrganizationIds(
      options.outcome.submissionData,
    );

    const intents = this.createdPublications(
      options.lootId,
      organizationIds,
      this.mapNpcEvents(options.npcs),
    );

    const rabbit = (
      routingKey: Extract<
        LootPublication["payload"],
        { kind: "rabbit" }
      >["routingKey"],
      data: unknown,
    ) => {
      intents.push({
        organizationIds,
        payload: Schema.decodeUnknownSync(LootPublicationPayload)({
          kind: "rabbit",
          routingKey,
          data,
        }),
      });
    };

    rabbit(
      RabbitRoutingKey.SEARCH_PLAYERS_INDEX,
      this.mapPlayers(options.submission.players).map((player) => ({
        ...player,
        world: options.submission.world,
      })),
    );

    const searchNpc = (npc: AcceptedNpcSnapshot) => ({
      id: npc.npcId,
      identityNamespace: npc.identityNamespace,
      name: npc.name,
      lvl: npc.lvl,
      prof: npc.prof ?? "",
      icon: npc.icon,
      wt: npc.wt,
      type: npc.type,
      margonemType: npc.margonemType,
      gameVersion: npc.gameVersion,
    });

    const observedAt = options.observedAt.toISOString();
    const dropSource = this.findDropSource(options.npcs, options.submission);

    rabbit(
      RabbitRoutingKey.SEARCH_NPCS_INDEX,
      options.npcs.map((npc) => ({
        ...searchNpc(npc),
        // Search keeps the latest observation of a catalog entry; loot ids
        // order observations even when deliveries arrive out of order.
        lootId: options.lootId,
        snapshotHash: npc.snapshotHash ?? undefined,
        location: options.submission.location,
        world: options.submission.world,
        observedAt,
      })),
    );
    const items = this.mapItems(options.submission.loots);

    if (items.length > 0)
      rabbit(
        RabbitRoutingKey.SEARCH_ITEMS_INDEX,
        items.map((item) => ({
          id: item.id,
          name: item.name,
          icon: item.icon,
          // The search catalog describes revisions, not looted instances.
          stat: splitItemStat(item.stat).revision,
          lvl: item.lvl,
          rarity: item.rarity,
          type: item.type,
          world: options.submission.world,
          gameVersion: options.submission.gameVersion,
          observedAt,
          droppedBy: dropSource && searchNpc(dropSource),
        })),
      );
    rabbit(RabbitRoutingKey.NOTIFICATIONS_LOOT_CREATED, {
      version: 2,
      lootId: options.lootId,
      world: options.submission.world,
      guildIds: organizationIds,
      itemIds: items.map((item) => item.id),
      itemNames: items.map((item) => item.name),
      npcs: options.npcs.map((npc) => ({
        type: npc.type ?? null,
        lvl: npc.lvl ?? null,
      })),
    } satisfies LootCreatedNotificationEventV2);

    return intents;
  }

  private createUniqueLootId(
    loots: CreateLootRequest["loots"],
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
    submission: CreateLootRequest,
    primaryNpc: CreateLootRequest["npcs"][number],
    primaryNpcType: NpcType,
  ) {
    if (primaryNpcType !== NpcType.COLOSSUS) {
      return Effect.succeed({
        share: {},
        source: LootShareSource.NONE,
      });
    }

    return this.repository.hasAmbiguousNpcVariant(primaryNpc.name).pipe(
      Effect.map((ambiguous) => {
        if (ambiguous) {
          return {
            share: {},
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
              share: {},
              source: LootShareSource.NONE,
            };
      }),
    );
  }

  private mapItemOwnerAllocation(
    loots: CreateLootRequest["loots"],
    players: CreateLootRequest["players"],
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

  private processNpcs(npcs: CreateLootRequest["npcs"]) {
    const sorted = [...npcs].sort((left, right) => right.wt - left.wt);
    const primary = sorted[0];

    if (!primary) {
      throw new InvalidRequestError(ErrorKey.NPC_WT_TOO_LOW);
    }

    return { primary };
  }

  /**
   * The NPC a fight's items dropped from, by `DROP_SOURCE_BOSS_TYPES`.
   * Other sources, such as a lootbox, have none.
   */
  private findDropSource(
    npcs: AcceptedNpcSnapshot[],
    submission: CreateLootRequest,
  ): AcceptedNpcSnapshot | undefined {
    if (submission.source !== "FIGHT") return undefined;

    if (npcs.length === 1) return npcs[0];

    const bosses = npcs.filter(
      (npc) => npc.type !== null && dropSourceBossTypes.has(npc.type),
    );

    return bosses.length === 1 ? bosses[0] : undefined;
  }

  private mapNpcEvents(npcs: AcceptedNpcSnapshot[]): GuildLootEventNpc[] {
    return [...npcs]
      .sort((left, right) => (right.wt ?? 0) - (left.wt ?? 0))
      .map(({ lvl, prof, type, wt }) => ({ lvl, prof, type, wt }));
  }

  private getItemStats(item: CreateLootRequest["loots"][number]) {
    const parsedStats = parseItemStats(item.stat);
    const lvl = parsedStats["lvl"] ? Number(parsedStats["lvl"]) : 0;
    const rawRarity = parsedStats["rarity"]?.toUpperCase();

    const rarity =
      rawRarity === undefined
        ? undefined
        : Schema.decodeUnknownSync(ItemRaritySchema)(rawRarity);

    const prof = parseRequiredProfessions(parsedStats["reqp"]);

    return { lvl, rarity, prof, type: getItemTypeByCl(item.cl) };
  }

  private mapItems(items: CreateLootRequest["loots"]) {
    return items.map((item) => ({ ...item, ...this.getItemStats(item) }));
  }

  private mapPlayers(players: CreateLootRequest["players"]) {
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

  private mapLootItemsToPersistence(
    items: CreateLootRequest["loots"],
    gameVersion: GameVersion,
  ) {
    return items.map((item) => {
      const { lvl, rarity, type } = this.getItemStats(item);
      const { revision, instance } = splitItemStat(item.stat);

      return {
        itemId: item.id,
        gameVersion,
        statsHash: createItemStatsHash(revision),
        snapshotHash: createItemSnapshotHash({
          gameVersion,
          itemId: item.id,
          name: item.name,
          icon: item.icon,
          itemType: type,
          stat: revision,
        }),
        name: item.name,
        icon: item.icon,
        lvl,
        rarity,
        itemType: type,
        statRaw: revision,
        statsSnapshot: parseItemStats(revision),
        hid: item.hid,
        instanceStat: instance,
      };
    });
  }

  private mapLootPlayersToPersistence(
    players: CreateLootRequest["players"],
    world: string,
  ) {
    return players.map((player) => {
      const prof = getProfByShortname(player.prof) ?? null;

      const { accountId, characterId } = this.normalizeCharacterAndAccount(
        player.id,
        player.accountId,
      );

      return {
        lvl: player.lvl,
        world,
        accountId,
        characterId,
        name: player.name,
        prof,
        icon: player.icon,
      };
    });
  }

  private normalizeCharacterAndAccount(
    id: string | number,
    accountId: string | number,
  ) {
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

  private mapLootNpcsToPersistence(npcs: CreateLootRequest["npcs"]) {
    return npcs.map((npc) => ({
      ...lootNpcIdentity(npc),
      runtimeNpcId: npc.runtimeId ?? null,
      name: npc.name,
      type: getNpcTypeByWt(NpcType, npc.wt, npc.prof, npc.type),
      lvl: npc.lvl,
      // Senders may report the rendered CDN URL of the graphic; a revision
      // must not depend on which form a sender chose.
      icon: normalizeNpcIcon(npc.icon),
      wt: npc.wt,
      margonemType: npc.type,
      prof: getProfByShortname(npc.prof ?? "") ?? null,
    }));
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
    factionWar: FactionWarAward | null,
  ): CreateLootResponse {
    return {
      id,
      submittedGuilds: outcome.submittedGuilds,
      rejectedGuilds: outcome.rejectedGuilds,
      ...(factionWar && factionWar.points > 0 && { factionWar }),
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

  private createdPublications(
    lootId: number,
    organizationIds: string[],
    npcs: GuildLootEventNpc[],
  ): LootPublication[] {
    return organizationIds.flatMap((guildId): LootPublication[] => [
      { organizationIds: [guildId], payload: { kind: "cache" } },
      {
        organizationIds: [guildId],
        payload: {
          kind: "rabbit",
          routingKey: RabbitRoutingKey.GUILDS_LOOTS_CREATE,
          data: {
            version: 2,
            guildId,
            lootId,
            npcs,
          } satisfies GuildLootCreatedEventV2,
        },
      },
    ]);
  }
}

export const makeLootSubmissionAcceptance = (
  repository: LootSubmissionAcceptancePersistence,
  lock: LootSubmissionLock,
  signalPublications: Effect.Effect<void>,
  awardFactionWarLoot: AwardFactionWarLoot = () => Effect.succeed(null),
): LootSubmissionAcceptance =>
  new LootSubmissionAcceptanceImplementation(
    repository,
    lock,
    signalPublications,
    awardFactionWarLoot,
  );
