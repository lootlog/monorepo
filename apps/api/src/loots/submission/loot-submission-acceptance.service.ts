import { capturesMapPlayers } from "@lootlog/domain/loot-draw";
import type { MapPlayersSnapshot } from "@lootlog/protocol/loot-summary";
import { Clock, Effect } from "effect";
import { getNpcType, MIN_LOOT_NPC_WT } from "@lootlog/domain/npc-type";
import { resolveLootAcceptance } from "@lootlog/domain/loot-acceptance";
import {
  InvalidRequestError,
  PermissionDeniedError,
} from "#src/shared/http/http-errors";
import { createHash } from "node:crypto";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import type {
  CreateLootRequest,
  CreateLootResponse,
} from "#src/contracts/loots/schemas";
import { ErrorKey } from "#src/loots/error-key";
import { parseCharacterIdentity } from "#src/shared/margonem/player-snapshot.persistence";

import type { LootPublication } from "./loot-publication-outbox.js";
import type {
  AcceptedNpcSnapshot,
  LootSubmissionAcceptancePersistence,
} from "#src/loots/submission/loot-submission-acceptance.repository";
import { inferInitialAllocation } from "./loot-submission-allocation.js";
import {
  getItemStats,
  LEGACY_ID,
  mapLootItemsToPersistence,
  mapLootNpcsToPersistence,
  mapLootPlayersToPersistence,
  processNpcs,
} from "./loot-submission-normalization.js";
import {
  createResponse,
  getNewSubmissions,
  mapRejectedGuilds,
  resolveAcceptanceOutcome,
  type AcceptanceOutcome,
  type LootSubmissionData,
} from "./loot-submission-outcome.js";
import {
  createdPublications,
  mapNpcEvents,
  newLootPublications,
} from "./loot-submission-publications.js";

interface LootSubmissionLock {
  readonly withLock: <A, E>(
    resource: string,
    ttlMilliseconds: number,
    options: typeof LOOT_LOCK_RETRY_OPTIONS,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, unknown>;
}

const LOOT_LOCK_TTL_MS = 30_000;

const LOOT_LOCK_RETRY_OPTIONS = {
  retryCount: 100,
  retryDelay: 100,
  retryJitter: 50,
} as const;

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
      const { existingLootId, guilds, characterConfig } = yield* Effect.all(
        {
          existingLootId: this.repository.findLootIdByUniqueId(
            options.uniqueId,
          ),
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
            code: ErrorKey.NO_GUILDS_ON_THE_CHARACTER_WHITELIST,
            details: {
              submittedGuilds: [],
              rejectedGuilds: mapRejectedGuilds(
                guildById,
                whitelisted.rejected,
              ),
            },
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

      if (
        options.submission.players.some(
          (player) =>
            !parseCharacterIdentity(player.id, player.accountId, LEGACY_ID),
        )
      ) {
        return yield* Effect.fail(new InvalidRequestError("Invalid player id"));
      }

      const npcData = yield* Effect.try({
        try: () => processNpcs(options.submission.npcs),
        catch: (error) =>
          error instanceof InvalidRequestError
            ? error
            : new InvalidRequestError({ code: ErrorKey.NPC_WT_TOO_LOW }),
      });

      if (npcData.primary.wt < MIN_LOOT_NPC_WT) {
        return yield* Effect.fail(
          new InvalidRequestError({ code: ErrorKey.NPC_WT_TOO_LOW }),
        );
      }

      const primaryNpcType = getNpcType(NpcType, npcData.primary);

      const outcome = resolveAcceptanceOutcome({
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
            code: ErrorKey.NO_GUILD_CONFIG_ACCEPTS_THIS_LOOT,
            details: {
              submittedGuilds: [],
              rejectedGuilds: outcome.rejectedGuilds,
            },
          }),
        );
      }

      const mapPlayersSnapshot = capturesMapPlayers({
        source: options.submission.source,
        rarities: options.submission.loots.map(
          (item) => getItemStats(item).rarity,
        ),
      })
        ? (options.submission.mapPlayersSnapshot ?? null)
        : null;

      if (existingLootId !== null) {
        yield* this.acceptExistingLoot(
          existingLootId,
          outcome.submissionData,
          mapPlayersSnapshot,
        );

        return createResponse(existingLootId, outcome);
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
          newLootPublications({
            lootId,
            npcs,
            observedAt,
            outcome,
            submission: options.submission,
          }),
      });

      return createResponse(lootId, outcome);
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

      const newSubmissions = getNewSubmissions(
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
          createdPublications(lootId, organizationIds, mapNpcEvents(npcs)),
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
      const initialAllocation = yield* inferInitialAllocation(
        this.repository,
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
          items: mapLootItemsToPersistence(
            options.submission.loots,
            options.submission.gameVersion,
          ),
          players: mapLootPlayersToPersistence(
            options.submission.players,
            options.submission.world,
          ),
          npcs: mapLootNpcsToPersistence(options.submission.npcs),
          submissions: options.outcome.submissionData,
        },
        options.publications,
      );

      yield* this.signalPublications;

      return lootId;
    });
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
}

export const makeLootSubmissionAcceptance = (
  repository: LootSubmissionAcceptancePersistence,
  lock: LootSubmissionLock,
  signalPublications: Effect.Effect<void>,
): LootSubmissionAcceptance =>
  new LootSubmissionAcceptanceImplementation(
    repository,
    lock,
    signalPublications,
  );
