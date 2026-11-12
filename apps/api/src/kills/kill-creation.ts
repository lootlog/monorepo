import { selectCharacterCatchingGuildIds } from "#src/members/character-catching-guilds";
import { requestApiKeyAccess } from "#src/runtime/auth/forward-auth-identity";
import {
  selectAccessibleGuilds,
  selectActiveGuildMembers,
} from "#src/members/member-access-query";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { mapValues } from "es-toolkit";
import { Clock, Effect, Schema } from "effect";
import { activityFeedNpcCategory } from "@lootlog/domain/activity-feed";
import { normalizeNpcIcon } from "@lootlog/domain/npc-icon";
import { getNpcType, isDropSourceBossType } from "@lootlog/domain/npc-type";
import {
  getKillLootRolls,
  type KillLootRolls,
} from "@lootlog/domain/loot-rolls";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  bossKillTable,
  guildKillActivityTable,
  guildKillBucketTable,
  guildKillTotalTable,
  memberKillBucketTable,
  memberKillTotalTable,
  userCharacterKillBucketTable,
  userKillBucketTable,
  userKillCharacterTable,
  userKillTotalTable,
} from "#src/database/drizzle/kill-statistics.schema";
import type { ApplicationLogger } from "#src/shared/application-logger";
import { getKillNpcId } from "#src/shared/margonem/npc-identity";
import type { CreateKillRequest } from "#src/contracts/kills/schemas";
import {
  buildBossKillDedupKey,
  buildGuildKillDedupKey,
  buildMemberKillDedupKey,
  buildUserKillDedupKey,
} from "./kill-dedup-key.js";
import { getKillStatsBucketStart } from "./kill-stats-period.js";

const DEDUP_TTL_SECONDS = 30;

export class KillCreationError extends TaggedErrorClass<KillCreationError>()(
  "KillCreationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface KillCreationCache {
  readonly invalidateScopes: (
    ...scopes: string[]
  ) => Effect.Effect<unknown, unknown>;
  readonly deleteIfValue: (
    key: string,
    value: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly setNx: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
  /** Sets a missing key; returns the value it already held, or null. */
  readonly setNxGet: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<string | null, unknown>;
}

type KillInput = {
  readonly userId: string;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
  readonly npcType: NpcType;
  readonly npcLvl: number;
  readonly npcProf: string | null;
  readonly npcIcon: string | null;
  readonly lastKilledAt: Date;
  /** Unknown when the Game client did not report the party. */
  readonly lootRolls: KillLootRolls | null;
};

type CharacterInput = {
  readonly characterId: string;
  readonly name: string | null;
  readonly level: number | null;
  readonly profession: string | null;
  readonly icon: string | null;
};

export const makeKillCreation = (
  database: typeof ApiDatabase.Service,
  cache: KillCreationCache,
  logger: ApplicationLogger,
  publishActivity: (
    input: KillInput & { readonly guildId: string },
  ) => Effect.Effect<void> = () => Effect.void,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new KillCreationError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "kills.drizzle", retryCount: 0 },
      }),
    );

  const invalidate = (scope: string) =>
    cache.invalidateScopes(scope).pipe(
      Effect.catch((error) =>
        Effect.sync(() =>
          logger.warn("Failed to invalidate kill stats cache", {
            error,
            scope,
          }),
        ),
      ),
    );

  type Transaction = Parameters<Parameters<typeof database.transaction>[0]>[0];

  type Write = (
    transaction: Transaction,
  ) => ReadonlyArray<Effect.Effect<unknown, unknown>>;

  interface Claim {
    readonly key: string;
    readonly token: string;
  }

  /** Takes the dedup claim for one destination; null when another report holds it. */
  const claim = Effect.fnUntraced(function* (key: string, operation: string) {
    const token = randomUUID();

    const acquired = yield* protect(
      operation,
      cache.setNx(key, token, DEDUP_TTL_SECONDS),
    );

    return acquired ? ({ key, token } satisfies Claim) : null;
  });

  const release = ({ key, token }: Claim) =>
    cache
      .deleteIfValue(key, token)
      .pipe(
        Effect.catch((error) =>
          Effect.sync(() =>
            logger.warn("Failed to release kill dedup claim", { error, key }),
          ),
        ),
      );

  const descriptive = (input: KillInput) => ({
    npcName: input.npcName,
    npcType: input.npcType,
    npcLvl: input.npcLvl,
    npcProf: input.npcProf,
    npcIcon: input.npcIcon,
    lastKilledAt: input.lastKilledAt,
  });

  /**
   * The account-wide and per-character rows change together, so a kill counts
   * for its character exactly when it counts for the account.
   */
  const incrementUser =
    (input: KillInput, character: CharacterInput, periodStart: Date): Write =>
    (transaction) => {
      const key = {
        discordUserId: input.userId,
        world: input.world,
        npcId: input.npcId,
      };

      const characterKey = { ...key, characterId: character.characterId };

      const characterDetails = {
        name: character.name,
        level: character.level,
        profession: character.profession,
        icon: character.icon,
      };

      const characterCount = {
        kills: sql`${userKillCharacterTable.kills} + 1`,
        lastKilledAt: input.lastKilledAt,
      };

      return [
        transaction
          .insert(userKillTotalTable)
          .values({ ...key, ...descriptive(input), kills: 1 })
          .onConflictDoUpdate({
            target: [
              userKillTotalTable.discordUserId,
              userKillTotalTable.world,
              userKillTotalTable.npcId,
            ],
            set: {
              kills: sql`${userKillTotalTable.kills} + 1`,
              ...descriptive(input),
            },
          }),
        transaction
          .insert(userKillBucketTable)
          .values({ ...key, periodStart, ...descriptive(input), kills: 1 })
          .onConflictDoUpdate({
            target: [
              userKillBucketTable.discordUserId,
              userKillBucketTable.world,
              userKillBucketTable.npcId,
              userKillBucketTable.periodStart,
            ],
            set: {
              kills: sql`${userKillBucketTable.kills} + 1`,
              ...descriptive(input),
            },
          }),
        transaction
          .insert(userCharacterKillBucketTable)
          .values({
            ...characterKey,
            periodStart,
            ...descriptive(input),
            kills: 1,
          })
          .onConflictDoUpdate({
            target: [
              userCharacterKillBucketTable.discordUserId,
              userCharacterKillBucketTable.world,
              userCharacterKillBucketTable.characterId,
              userCharacterKillBucketTable.npcId,
              userCharacterKillBucketTable.periodStart,
            ],
            set: {
              kills: sql`${userCharacterKillBucketTable.kills} + 1`,
              ...descriptive(input),
            },
          }),
        transaction
          .insert(userKillCharacterTable)
          .values({
            discordUserId: input.userId,
            world: input.world,
            characterId: character.characterId,
            ...characterDetails,
            kills: 1,
            firstKilledAt: input.lastKilledAt,
            lastKilledAt: input.lastKilledAt,
          })
          .onConflictDoUpdate({
            target: [
              userKillCharacterTable.discordUserId,
              userKillCharacterTable.world,
              userKillCharacterTable.characterId,
            ],
            // An older Game client reports only the id; keep the last
            // known details.
            set:
              character.name === null
                ? characterCount
                : { ...characterCount, ...characterDetails },
          }),
      ];
    };

  const incrementMember =
    (
      input: KillInput & {
        readonly guildId: string;
        readonly memberId: number;
      },
      periodStart: Date,
    ): Write =>
    (transaction) => {
      const key = {
        guildId: input.guildId,
        memberId: input.memberId,
        discordUserId: input.userId,
        world: input.world,
        npcId: input.npcId,
      };

      return [
        transaction
          .insert(memberKillTotalTable)
          .values({ ...key, ...descriptive(input), kills: 1 })
          .onConflictDoUpdate({
            target: [
              memberKillTotalTable.guildId,
              memberKillTotalTable.memberId,
              memberKillTotalTable.world,
              memberKillTotalTable.npcId,
            ],
            set: {
              kills: sql`${memberKillTotalTable.kills} + 1`,
              ...descriptive(input),
            },
          }),
        transaction
          .insert(memberKillBucketTable)
          .values({ ...key, periodStart, ...descriptive(input), kills: 1 })
          .onConflictDoUpdate({
            target: [
              memberKillBucketTable.guildId,
              memberKillBucketTable.memberId,
              memberKillBucketTable.world,
              memberKillBucketTable.npcId,
              memberKillBucketTable.periodStart,
            ],
            set: {
              kills: sql`${memberKillBucketTable.kills} + 1`,
              ...descriptive(input),
            },
          }),
      ];
    };

  const partyOf = ({ lootRolls }: KillInput) => ({
    lootRolls: lootRolls?.rolls ?? null,
    partyWarriors: lootRolls?.members.w ?? null,
    partyPaladins: lootRolls?.members.p ?? null,
    partyBladeDancers: lootRolls?.members.b ?? null,
    partyMages: lootRolls?.members.m ?? null,
    partyTrackers: lootRolls?.members.t ?? null,
    partyHunters: lootRolls?.members.h ?? null,
  });

  /**
   * Adds the Organization to the boss kill that every report of it shares.
   * Adding an Organization again changes nothing, so a retry or another
   * member's report cannot count the kill twice.
   */
  const recordBossKill =
    (input: KillInput & { readonly guildId: string }, killedAt: Date): Write =>
    (transaction) => {
      const table = bossKillTable;
      const party = partyOf(input);

      // The first report that named the party fills it in.
      const fillParty = mapValues(
        party,
        (value, key) => sql`coalesce(${table[key]}, ${value})`,
      );

      return [
        transaction
          .insert(table)
          .values({
            world: input.world,
            npcId: input.npcId,
            killedAt,
            npcName: input.npcName,
            npcType: input.npcType,
            guildIds: [input.guildId],
            ...party,
          })
          .onConflictDoUpdate({
            target: [table.world, table.npcId, table.killedAt],
            set: {
              guildIds: sql`case
                when ${input.guildId}::text = any(${table.guildIds}) then ${table.guildIds}
                else array_append(${table.guildIds}, ${input.guildId}::text)
              end`,
              ...fillParty,
            },
          }),
      ];
    };

  const incrementGuild =
    (
      input: KillInput & { readonly guildId: string },
      periodStart: Date,
    ): Write =>
    (transaction) => [
      transaction
        .insert(guildKillTotalTable)
        .values({
          guildId: input.guildId,
          world: input.world,
          npcId: input.npcId,
          ...descriptive(input),
          kills: 1,
        })
        .onConflictDoUpdate({
          target: [
            guildKillTotalTable.guildId,
            guildKillTotalTable.world,
            guildKillTotalTable.npcId,
          ],
          set: {
            kills: sql`${guildKillTotalTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
      transaction
        .insert(guildKillBucketTable)
        .values({
          periodStart,
          guildId: input.guildId,
          world: input.world,
          npcId: input.npcId,
          ...descriptive(input),
          kills: 1,
        })
        .onConflictDoUpdate({
          target: [
            guildKillBucketTable.guildId,
            guildKillBucketTable.world,
            guildKillBucketTable.npcId,
            guildKillBucketTable.periodStart,
          ],
          set: {
            kills: sql`${guildKillBucketTable.kills} + 1`,
            ...descriptive(input),
          },
        }),
      ...(activityFeedNpcCategory(input.npcType) !== "OTHER"
        ? [
            transaction.insert(guildKillActivityTable).values({
              id: Bun.randomUUIDv7(),
              guildId: input.guildId,
              world: input.world,
              npcId: input.npcId,
              npcName: input.npcName,
              npcType: input.npcType,
              npcLvl: input.npcLvl,
              npcProf: input.npcProf,
              npcIcon: input.npcIcon,
              occurredAt: input.lastKilledAt,
            }),
          ]
        : []),
    ];

  return Effect.fn("KillsController_createKill")(function* (
    discordId: string,
    data: CreateKillRequest,
  ) {
    const npcType = getNpcType(NpcType, {
      wt: data.npc.wt,
      prof: data.npc.prof,
      icon: data.npc.icon,
      isHeroFromEvent: data.npc.isHeroFromEvent,
    });

    const npcId = getKillNpcId(data.npc, npcType);
    const killedAt = new Date(yield* Clock.currentTimeMillis);
    const periodStart = getKillStatsBucketStart(killedAt);

    const input: KillInput = {
      userId: discordId,
      world: data.world,
      npcId,
      npcName: data.npc.name,
      npcType,
      npcLvl: data.npc.lvl,
      npcProf: data.npc.prof ?? null,
      npcIcon:
        data.npc.icon === undefined ? null : normalizeNpcIcon(data.npc.icon),
      lastKilledAt: killedAt,
      lootRolls: data.party
        ? getKillLootRolls({ npcType, world: data.world, party: data.party })
        : null,
    };

    const apiKey = yield* requestApiKeyAccess;

    // Every claim this request holds. All of them are released unless the one
    // transaction below commits, so a retry can write what a failure rolled back.
    const claims: Claim[] = [];

    const track = (acquired: Claim | null) => {
      if (acquired) claims.push(acquired);

      return acquired;
    };

    const releaseAll = Effect.forEach(claims, release, {
      concurrency: "unbounded",
      discard: true,
    });

    const writeKill = Effect.gen(function* () {
      // The personal claim and the Organization targets are independent; both
      // finish before the result is read, so neither interrupts the other, and
      // a personal dedup failure still prevents every guild write.
      const claimPersonal =
        !apiKey || apiKey.personalData
          ? claim(
              buildUserKillDedupKey(discordId, { world: data.world, npcId }),
              "kills.dedup.user",
            ).pipe(Effect.map(track))
          : Effect.succeed(null);

      const readTargets = Effect.gen(function* () {
        const [catchingGuildIds, writableGuildRows] = yield* protect(
          "kills.create.scope",
          Effect.all(
            [
              selectCharacterCatchingGuildIds(database, discordId, data),
              selectAccessibleGuilds(database, discordId, [
                Permission.LOOTLOG_LOOTS_WRITE,
              ]).pipe(
                Effect.map((rows) =>
                  rows.map(({ guild }) => ({ id: guild.id })),
                ),
              ),
            ],
            { concurrency: "unbounded" },
          ),
        );

        const writableGuildIds = new Set(writableGuildRows.map(({ id }) => id));

        const guildIds = catchingGuildIds.filter((guildId) =>
          writableGuildIds.has(guildId),
        );

        if (guildIds.length === 0) return { guildIds, members: [] };

        const members = yield* protect(
          "kills.create.members",
          selectActiveGuildMembers(database, discordId, guildIds),
        );

        return { guildIds, members };
      });

      const [personalResult, targetsResult] = yield* Effect.all(
        [claimPersonal, readTargets],
        { concurrency: "unbounded", mode: "result" },
      );

      const personalClaim = yield* Effect.fromResult(personalResult);
      const { guildIds, members } = yield* Effect.fromResult(targetsResult);

      const memberByGuild = new Map(
        members.map((member) => [member.guildId, member]),
      );

      // A failed guild claim must not stop the other Organizations.
      const claimGuilds = Effect.forEach(
        guildIds,
        (guildId) => {
          const member = memberByGuild.get(guildId);

          if (!member) return Effect.succeed(null);
          const killKey = { world: data.world, npcId };

          return Effect.gen(function* () {
            const memberClaim = track(
              yield* claim(
                buildMemberKillDedupKey(guildId, member.id, killKey),
                "kills.dedup.member",
              ),
            );

            if (!memberClaim) return null;

            const guildClaim = yield* claim(
              buildGuildKillDedupKey(guildId, killKey),
              "kills.dedup.guild",
            ).pipe(
              Effect.map(track),
              Effect.catch((error) =>
                Effect.sync(() => {
                  logger.error({
                    message: `Failed to claim guild kill for guildId ${guildId}`,
                    error,
                  });

                  return null;
                }),
              ),
            );

            return {
              guildId,
              memberId: member.id,
              countsGuild: guildClaim !== null,
            };
          }).pipe(
            Effect.catch((error) =>
              Effect.sync(() => {
                logger.error({
                  message: `Failed to claim kill stats for guildId ${guildId}`,
                  error,
                });

                return null;
              }),
            ),
          );
        },
        { concurrency: "unbounded" },
      );

      const targets = (yield* claimGuilds)
        .filter((target) => target !== null)
        .toSorted((a, b) => a.guildId.localeCompare(b.guildId));

      if (!personalClaim && targets.length === 0)
        return { deduplicated: true, updated: 0 };

      // Every report of one boss kill, from any Organization, carries the time
      // of the first, so the kill is recorded once for all of them.
      const bossKilledAt =
        isDropSourceBossType(npcType) && targets.some((t) => t.countsGuild)
          ? yield* cache
              .setNxGet(
                buildBossKillDedupKey({ world: data.world, npcId }),
                killedAt.toISOString(),
                DEDUP_TTL_SECONDS,
              )
              .pipe(
                Effect.map((first) =>
                  first === null ? killedAt : new Date(first),
                ),
                Effect.catch((error) =>
                  Effect.sync(() => {
                    logger.warn("Failed to claim boss kill", { error });

                    return null;
                  }),
                ),
              )
          : null;

      // The personal rows come first, then each Organization in id order. The
      // boss rows are shared between Organizations, so they come last: no
      // transaction holds one while waiting for rows another one holds.
      const writes: Write[] = [
        ...(personalClaim
          ? [
              incrementUser(
                input,
                {
                  characterId: data.characterId,
                  name: data.character?.name ?? null,
                  level: data.character?.lvl ?? null,
                  profession: data.character?.prof ?? null,
                  icon: data.character?.icon ?? null,
                },
                periodStart,
              ),
            ]
          : []),
        ...targets.flatMap(({ guildId, memberId, countsGuild }) => [
          incrementMember({ ...input, guildId, memberId }, periodStart),
          ...(countsGuild
            ? [incrementGuild({ ...input, guildId }, periodStart)]
            : []),
        ]),
        ...(bossKilledAt
          ? targets
              .filter(({ countsGuild }) => countsGuild)
              .map(({ guildId }) =>
                recordBossKill({ ...input, guildId }, bossKilledAt),
              )
          : []),
      ];

      const committed = yield* protect(
        "kills.create.write",
        database.transaction((transaction) =>
          Effect.all(
            writes.flatMap((write) => write(transaction)),
            { discard: true },
          ),
        ),
      ).pipe(
        Effect.as(true),
        Effect.catch((error) =>
          Effect.sync(() => {
            logger.error({ message: "Failed to upsert kill stats", error });
          }).pipe(Effect.andThen(releaseAll), Effect.as(false)),
        ),
      );

      if (!committed) return { updated: 0 };

      if (personalClaim) yield* invalidate(`kill-stats:user:${discordId}`);
      yield* Effect.forEach(
        targets,
        ({ guildId }) => invalidate(`kill-stats:guild:${guildId}`),
        { concurrency: "unbounded", discard: true },
      );
      yield* Effect.forEach(
        targets.filter(({ countsGuild }) => countsGuild),
        ({ guildId }) =>
          publishActivity({ ...input, guildId }).pipe(Effect.forkDetach),
        { discard: true },
      );

      return { updated: targets.length };
    });

    // A failure after the first claim rolls the whole kill back, so every
    // claim goes back and the next report writes it again.
    return yield* writeKill.pipe(Effect.onError(() => releaseAll));
  });
};
