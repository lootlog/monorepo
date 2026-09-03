import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { randomUUID } from "node:crypto";
import { and, arrayOverlaps, desc, eq, isNotNull, or, sql } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildKillSummaryBucketTable,
  guildKillSummaryTable,
  guildTable,
  memberTable,
  memberToRoleTable,
  npcKillStatsBucketTable,
  npcKillStatsTable,
  roleTable,
  userCharactersLootlogSettingsTable,
  userKillStatsBucketTable,
  userKillStatsTable,
} from "#src/database/drizzle/schema";
import type { ApplicationLogger } from "#src/shared/application-logger";
import { getStableNpcId } from "#src/shared/margonem/stable-npc-id";
import type { CreateKillDto } from "#src/http-api/contracts/kills/schemas";
import {
  buildGuildKillDedupKey,
  buildUserKillDedupKey,
} from "./kill-dedup-key.js";
import { getKillStatsBucketStart } from "./kill-stats-period.js";

const DEDUP_TTL_SECONDS = 30;
const STATS_CACHE_PREFIX = "kill-stats";

export class KillCreationError extends TaggedErrorClass<KillCreationError>()(
  "KillCreationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface KillCreationCache {
  readonly deleteByPattern: (
    pattern: string,
  ) => Effect.Effect<unknown, unknown>;
  readonly setNx: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
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
};

export const makeKillCreation = (
  database: typeof ApiDatabase.Service,
  cache: KillCreationCache,
  logger: ApplicationLogger,
) => {
  const protect = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError((cause) => new KillCreationError({ operation, cause })),
      Effect.withSpan(operation, {
        attributes: { adapter: "kills.drizzle", retryCount: 0 },
      }),
    );

  const invalidate = (pattern: string) =>
    cache.deleteByPattern(pattern).pipe(
      Effect.catch((error) =>
        Effect.sync(() =>
          logger.warn("Failed to invalidate kill stats cache", {
            error,
            pattern,
          }),
        ),
      ),
    );

  const incrementUser = (input: KillInput, periodStart: Date) =>
    protect(
      "kills.create.user",
      Effect.all(
        [
          database
            .insert(userKillStatsTable)
            .values({
              id: randomUUID(),
              ...input,
              totalKills: 1,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                userKillStatsTable.userId,
                userKillStatsTable.world,
                userKillStatsTable.npcId,
              ],
              set: {
                totalKills: sql`${userKillStatsTable.totalKills} + 1`,
                lastKilledAt: input.lastKilledAt,
                npcName: input.npcName,
                npcLvl: input.npcLvl,
                npcProf: input.npcProf,
                npcIcon: input.npcIcon,
                updatedAt: new Date(),
              },
            }),
          database
            .insert(userKillStatsBucketTable)
            .values({
              id: randomUUID(),
              ...input,
              periodStart,
              totalKills: 1,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                userKillStatsBucketTable.userId,
                userKillStatsBucketTable.world,
                userKillStatsBucketTable.npcId,
                userKillStatsBucketTable.periodStart,
              ],
              set: {
                totalKills: sql`${userKillStatsBucketTable.totalKills} + 1`,
                lastKilledAt: input.lastKilledAt,
                npcName: input.npcName,
                npcLvl: input.npcLvl,
                npcProf: input.npcProf,
                npcIcon: input.npcIcon,
                updatedAt: new Date(),
              },
            }),
        ],
        { discard: true },
      ),
    );

  const incrementMember = (
    input: KillInput & { readonly guildId: string; readonly memberId: number },
    periodStart: Date,
  ) =>
    protect(
      "kills.create.member",
      Effect.all(
        [
          database
            .insert(npcKillStatsTable)
            .values({
              id: randomUUID(),
              ...input,
              memberKills: 1,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                npcKillStatsTable.guildId,
                npcKillStatsTable.memberId,
                npcKillStatsTable.world,
                npcKillStatsTable.npcId,
              ],
              set: {
                memberKills: sql`${npcKillStatsTable.memberKills} + 1`,
                lastKilledAt: input.lastKilledAt,
                npcName: input.npcName,
                npcLvl: input.npcLvl,
                npcProf: input.npcProf,
                npcIcon: input.npcIcon,
                updatedAt: new Date(),
              },
            }),
          database
            .insert(npcKillStatsBucketTable)
            .values({
              id: randomUUID(),
              ...input,
              periodStart,
              memberKills: 1,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                npcKillStatsBucketTable.guildId,
                npcKillStatsBucketTable.memberId,
                npcKillStatsBucketTable.world,
                npcKillStatsBucketTable.npcId,
                npcKillStatsBucketTable.periodStart,
              ],
              set: {
                memberKills: sql`${npcKillStatsBucketTable.memberKills} + 1`,
                lastKilledAt: input.lastKilledAt,
                npcName: input.npcName,
                npcLvl: input.npcLvl,
                npcProf: input.npcProf,
                npcIcon: input.npcIcon,
                updatedAt: new Date(),
              },
            }),
        ],
        { discard: true },
      ),
    );

  const incrementGuild = (
    input: KillInput & { readonly guildId: string },
    periodStart: Date,
  ) => {
    const { userId: _userId, ...values } = input;
    return protect(
      "kills.create.guild",
      Effect.all(
        [
          database
            .insert(guildKillSummaryTable)
            .values({
              id: randomUUID(),
              ...values,
              uniqueKills: 1,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                guildKillSummaryTable.guildId,
                guildKillSummaryTable.world,
                guildKillSummaryTable.npcId,
              ],
              set: {
                uniqueKills: sql`${guildKillSummaryTable.uniqueKills} + 1`,
                lastKilledAt: input.lastKilledAt,
                npcName: input.npcName,
                npcLvl: input.npcLvl,
                npcProf: input.npcProf,
                npcIcon: input.npcIcon,
                updatedAt: new Date(),
              },
            }),
          database
            .insert(guildKillSummaryBucketTable)
            .values({
              id: randomUUID(),
              ...values,
              periodStart,
              uniqueKills: 1,
              updatedAt: new Date(),
            })
            .onConflictDoUpdate({
              target: [
                guildKillSummaryBucketTable.guildId,
                guildKillSummaryBucketTable.world,
                guildKillSummaryBucketTable.npcId,
                guildKillSummaryBucketTable.periodStart,
              ],
              set: {
                uniqueKills: sql`${guildKillSummaryBucketTable.uniqueKills} + 1`,
                lastKilledAt: input.lastKilledAt,
                npcName: input.npcName,
                npcLvl: input.npcLvl,
                npcProf: input.npcProf,
                npcIcon: input.npcIcon,
                updatedAt: new Date(),
              },
            }),
        ],
        { discard: true },
      ),
    );
  };

  return Effect.fn("KillsController_createKill")(function* (
    discordId: string,
    data: CreateKillDto,
  ) {
    const npcType = getNpcTypeByWt(NpcType, data.npc.wt, data.npc.prof);
    const npcId = getStableNpcId(data.npc.id, data.npc.name, npcType);
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
      npcIcon: data.npc.icon ?? null,
      lastKilledAt: killedAt,
    };
    const userDedupKey = buildUserKillDedupKey(discordId, {
      world: data.world,
      npcId,
    });
    const isNew = yield* cache
      .setNx(userDedupKey, "1", DEDUP_TTL_SECONDS)
      .pipe(
        Effect.mapError(
          (cause) =>
            new KillCreationError({ operation: "kills.dedup.user", cause }),
        ),
      );
    if (!isNew) return { deduplicated: true, updated: 0 };

    yield* incrementUser(input, periodStart).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          logger.error({ message: "Failed to upsert user kill stats", error });
        }),
      ),
    );

    const [configs, writableGuildRows] = yield* protect(
      "kills.create.scope",
      Effect.all(
        [
          database
            .select({
              catchingGuildIds:
                userCharactersLootlogSettingsTable.catchingGuildIds,
            })
            .from(userCharactersLootlogSettingsTable)
            .where(
              and(
                eq(userCharactersLootlogSettingsTable.userId, discordId),
                eq(
                  userCharactersLootlogSettingsTable.accountId,
                  data.accountId,
                ),
                eq(
                  userCharactersLootlogSettingsTable.characterId,
                  data.characterId,
                ),
              ),
            )
            .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
            .limit(1),
          database
            .selectDistinct({ id: guildTable.id })
            .from(guildTable)
            .leftJoin(
              memberTable,
              and(
                eq(memberTable.guildId, guildTable.id),
                eq(memberTable.userId, discordId),
                eq(memberTable.active, true),
                isNotNull(memberTable.globalUserId),
              ),
            )
            .leftJoin(
              memberToRoleTable,
              eq(memberToRoleTable.A, memberTable.id),
            )
            .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
            .where(
              and(
                eq(guildTable.active, true),
                or(
                  eq(guildTable.ownerId, discordId),
                  arrayOverlaps(roleTable.permissions, [
                    Permission.LOOTLOG_LOOTS_WRITE,
                  ]),
                ),
              ),
            ),
        ],
        { concurrency: "unbounded" },
      ),
    );

    yield* invalidate(`${STATS_CACHE_PREFIX}:user-*:${discordId}:*`);
    const writableGuildIds = new Set(writableGuildRows.map(({ id }) => id));
    const guildIds = (configs[0]?.catchingGuildIds ?? []).filter((guildId) =>
      writableGuildIds.has(guildId),
    );
    if (guildIds.length === 0) return { updated: 0 };

    const members = yield* protect(
      "kills.create.members",
      database
        .select({ id: memberTable.id, guildId: memberTable.guildId })
        .from(memberTable)
        .where(
          and(
            eq(memberTable.userId, discordId),
            eq(memberTable.active, true),
            isNotNull(memberTable.globalUserId),
            or(...guildIds.map((guildId) => eq(memberTable.guildId, guildId))),
          ),
        ),
    );
    const memberByGuild = new Map(
      members.map((member) => [member.guildId, member]),
    );

    const results = yield* Effect.forEach(
      guildIds,
      (guildId) => {
        const member = memberByGuild.get(guildId);
        if (!member) return Effect.succeed({ guildId, updated: false });
        const memberInput = { ...input, guildId, memberId: member.id };
        return Effect.gen(function* () {
          yield* incrementMember(memberInput, periodStart);
          const first = yield* cache
            .setNx(
              buildGuildKillDedupKey(guildId, {
                world: data.world,
                npcId,
              }),
              "1",
              DEDUP_TTL_SECONDS,
            )
            .pipe(
              Effect.mapError(
                (cause) =>
                  new KillCreationError({
                    operation: "kills.dedup.guild",
                    cause,
                  }),
              ),
            );
          if (first) yield* incrementGuild({ ...input, guildId }, periodStart);
          return { guildId, updated: true };
        }).pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              logger.error({
                message: `Failed to upsert kill stats for guildId ${guildId}`,
                error,
              });
              return { guildId, updated: false };
            }),
          ),
        );
      },
      { concurrency: "unbounded" },
    );
    yield* Effect.forEach(
      results,
      ({ guildId }) =>
        invalidate(`${STATS_CACHE_PREFIX}:guild-*:${guildId}:*`).pipe(
          Effect.andThen(
            invalidate(`${STATS_CACHE_PREFIX}:member-kills:${guildId}:*`),
          ),
        ),
      { concurrency: "unbounded", discard: true },
    );
    return { updated: results.filter(({ updated }) => updated).length };
  });
};
