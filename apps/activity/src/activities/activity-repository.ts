import {
  encodeActivityCursor,
  parseActivityCursor,
} from "./activity-cursor.js";
import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  and,
  asc,
  count,
  desc,
  eq,
  exists,
  gt,
  ilike,
  inArray,
  lt,
  lte,
  gte,
  ne,
  or,
  sql as drizzleSql,
  type SQL,
} from "drizzle-orm";
import {
  Clock,
  Context,
  Effect,
  Function,
  Layer,
  Number as Num,
  Option,
  Schema,
} from "effect";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import {
  ActivityDatabase,
  type ActivityDatabaseFailure,
} from "#src/database/database";
import {
  activities,
  activityActorSnapshots,
  ActivityType,
  memberActivitySessions,
  memberActivityStats,
} from "#src/database/schema";
import type { CreateActivity, QueryActivities } from "./activity-model.js";

export class ActivityNotFound extends TaggedErrorClass<
  ActivityNotFound,
  { readonly brand: unique symbol }
>()("ActivityNotFound", { id: Schema.String }) {}

/** A stored activity with its actor as it was when the activity happened. */
export type ActivityRecord = ReturnType<typeof mapActivityRow>;

export type MemberActivityStatsRecord = typeof memberActivityStats.$inferSelect;

export interface ActivityRepositoryValue {
  /** Stores the activity once per idempotency key and answers with that row. */
  readonly create: (
    dto: CreateActivity,
  ) => Effect.Effect<
    ActivityRecord | typeof activities.$inferSelect,
    ActivityDatabaseFailure
  >;
  readonly clearActiveSessionsForMember: (member: {
    guildId: string;
    discordId: string;
  }) => Effect.Effect<void, ActivityDatabaseFailure>;
  readonly findMany: (
    query: QueryActivities,
  ) => Effect.Effect<
    { data: ActivityRecord[]; nextCursor?: string; hasMore: boolean },
    ActivityDatabaseFailure
  >;
  readonly findOne: (
    id: string,
    guildId: string,
  ) => Effect.Effect<
    ActivityRecord,
    ActivityDatabaseFailure | ActivityNotFound
  >;
  readonly deleteOne: (
    id: string,
    guildId: string,
  ) => Effect.Effect<number, ActivityDatabaseFailure | ActivityNotFound>;
  readonly memberStats: (
    guildId: string,
  ) => Effect.Effect<MemberActivityStatsRecord[], ActivityDatabaseFailure>;
  readonly suggestActorNames: (
    guildId: string,
    search?: string,
    limit?: number,
  ) => Effect.Effect<string[], ActivityDatabaseFailure>;
  readonly suggestWorlds: (
    guildId: string,
    search?: string,
    limit?: number,
  ) => Effect.Effect<string[], ActivityDatabaseFailure>;
  readonly suggestClanNames: (
    guildId: string,
    search?: string,
    limit?: number,
  ) => Effect.Effect<string[], ActivityDatabaseFailure>;
}

const detailsString = (dto: CreateActivity, key: string) => {
  const value = dto.details?.[key];

  return Option.getOrUndefined(
    Schema.decodeUnknownOption(Schema.NonEmptyString)(value),
  );
};

const mapDetails = Function.compose(
  Schema.decodeUnknownOption(Schema.Record(Schema.String, Schema.Json)),
  Option.getOrUndefined,
);

const mapActivityRow = ({
  activity,
  actorSnapshot,
}: {
  activity: typeof activities.$inferSelect;
  actorSnapshot: typeof activityActorSnapshots.$inferSelect | null;
}) => ({
  ...activity,
  details: mapDetails(activity.details),
  actorSnapshot: actorSnapshot ?? undefined,
});

// A JavaScript Date keeps milliseconds and "createdAt" keeps microseconds, so
// the cursor reads the timestamp as PostgreSQL text.
const CURSOR_TIMESTAMP_FORMAT = 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"';

const cursorCreatedAt = drizzleSql<string>`to_char(${activities.createdAt} AT TIME ZONE 'UTC', ${CURSOR_TIMESTAMP_FORMAT})`;

// How far a Gateway clock may run ahead of the database before a redelivery
// can be stored twice. A day costs nothing: chunks that recent are never
// compressed, so the lookup stays on the B-tree index.
const IDEMPOTENCY_CLOCK_SKEW_MS = 86_400_000;

/**
 * The earliest "createdAt" an earlier delivery of this key can have. The
 * Gateway ends the key with its publication time in milliseconds and the row is
 * stamped when it is inserted, so it cannot be older than the key by more than
 * the clock skew. The bound keeps the lookup out of older chunks, which are
 * compressed and have no index on the key. A key without that suffix is looked
 * up in every chunk.
 */
const idempotencyLowerBound = (idempotencyKey: string, now: number) => {
  const publishedAt = /_(\d{13})$/.exec(idempotencyKey)?.[1];

  return publishedAt === undefined
    ? undefined
    : new Date(Math.min(Number(publishedAt), now) - IDEMPOTENCY_CLOCK_SKEW_MS);
};

export class ActivityRepository extends Context.Service<
  ActivityRepository,
  ActivityRepositoryValue
>()("@lootlog/activity/ActivityRepository") {
  static readonly layer = Layer.effect(
    ActivityRepository,
    Effect.gen(function* () {
      const db = yield* ActivityDatabase;

      const snapshotId = Effect.fn("ActivityRepository.snapshotId")(function* (
        dto: CreateActivity,
      ) {
        if (!dto.actorSnapshot) return undefined;
        const snapshot = dto.actorSnapshot;

        if (
          snapshot.accountId === undefined ||
          snapshot.characterId === undefined ||
          snapshot.name === undefined ||
          snapshot.icon === undefined ||
          snapshot.lvl === undefined ||
          snapshot.prof === undefined
        )
          // decodeCreateActivity rejects such a snapshot before it gets here.
          return yield* Effect.die(
            new Error("Actor snapshot is missing a database-required field"),
          );

        const snapshotFields = {
          accountId: snapshot.accountId,
          characterId: snapshot.characterId,
          clanName: snapshot.clanName,
          clanId: snapshot.clanId,
          name: snapshot.name,
          icon: snapshot.icon,
          lvl: snapshot.lvl,
          prof: snapshot.prof,
          source: dto.source,
        };

        const fingerprint = createHash("sha256")
          .update(JSON.stringify(snapshotFields))
          .digest("hex");

        const findExisting = () =>
          db
            .select({ id: activityActorSnapshots.id })
            .from(activityActorSnapshots)
            .where(eq(activityActorSnapshots.fingerprint, fingerprint))
            .limit(1);

        const existing = (yield* findExisting())[0];

        if (existing) return existing.id;

        const rows = yield* db
          .insert(activityActorSnapshots)
          .values({
            id: Bun.randomUUIDv7(),
            ...snapshotFields,
            fingerprint,
          })
          .onConflictDoNothing({
            target: activityActorSnapshots.fingerprint,
          })
          .returning({ id: activityActorSnapshots.id });

        // A concurrent insert may commit after our first read. A separate query
        // sees that winner even when it was invisible to the INSERT's snapshot.
        const row = rows[0] ?? (yield* findExisting())[0];

        if (!row)
          return yield* Effect.die(
            new Error("Actor snapshot resolution did not return an identifier"),
          );

        return row.id;
      });

      const create = Effect.fn("ActivityRepository.create")(function* (
        dto: CreateActivity,
      ) {
        const actorSnapshotId = yield* snapshotId(dto);

        const createdSince = idempotencyLowerBound(
          dto.idempotencyKey,
          yield* Clock.currentTimeMillis,
        );

        return yield* db.transaction((tx) =>
          Effect.gen(function* () {
            yield* tx.execute(
              drizzleSql`select pg_advisory_xact_lock(hashtextextended(${dto.idempotencyKey}, 0))`,
            );

            const existing = yield* tx
              .select({
                activity: activities,
                actorSnapshot: activityActorSnapshots,
              })
              .from(activities)
              .leftJoin(
                activityActorSnapshots,
                eq(activities.actorSnapshotId, activityActorSnapshots.id),
              )
              .where(
                and(
                  eq(activities.idempotencyKey, dto.idempotencyKey),
                  createdSince
                    ? gte(activities.createdAt, createdSince)
                    : undefined,
                ),
              )
              .limit(1);

            if (existing[0]) {
              return mapActivityRow(existing[0]);
            }

            const createdRows = yield* tx
              .insert(activities)
              .values({
                id: Bun.randomUUIDv7(),
                userId: dto.userId,
                guildId: dto.guildId,
                discordId: dto.discordId,
                type: dto.type,
                source: dto.source,
                idempotencyKey: dto.idempotencyKey,
                world: dto.world,
                details: dto.details,
                actorSnapshotId,
              })
              .returning();

            const created = createdRows[0];

            if (!created)
              return yield* Effect.die(
                new Error("Activity insert did not return a row"),
              );

            const sessionId = detailsString(dto, "sessionId");

            // decodeCreateActivity requires it for every activity type.
            if (!sessionId)
              return yield* Effect.die(
                new Error("Activity session identifier is missing"),
              );

            const countActiveSessions = () =>
              tx
                .select({ value: count() })
                .from(memberActivitySessions)
                .where(
                  and(
                    eq(memberActivitySessions.guildId, dto.guildId),
                    eq(memberActivitySessions.discordId, dto.discordId),
                    eq(memberActivitySessions.source, dto.source),
                  ),
                )
                .pipe(Effect.map((rows) => rows[0]?.value ?? 0));

            if (dto.type === ActivityType.CONNECT_EVENT) {
              const now = new Date(yield* Clock.currentTimeMillis);

              const inserted = yield* tx
                .insert(memberActivitySessions)
                .values({
                  guildId: dto.guildId,
                  discordId: dto.discordId,
                  source: dto.source,
                  sessionId,
                  userId: dto.userId,
                  userAgent: detailsString(dto, "userAgent"),
                  world: dto.world,
                  lastSeenAt: now,
                })
                .onConflictDoNothing()
                .returning({ sessionId: memberActivitySessions.sessionId });

              const active = yield* countActiveSessions();

              yield* tx
                .insert(memberActivityStats)
                .values({
                  guildId: dto.guildId,
                  discordId: dto.discordId,
                  source: dto.source,
                  lastSeenAt: now,
                  visitCount: inserted.length,
                  activeSessionCount: active,
                  updatedAt: now,
                })
                .onConflictDoUpdate({
                  target: [
                    memberActivityStats.guildId,
                    memberActivityStats.discordId,
                    memberActivityStats.source,
                  ],
                  set: {
                    lastSeenAt: now,
                    visitCount: drizzleSql`${memberActivityStats.visitCount} + ${inserted.length}`,
                    activeSessionCount: active,
                    updatedAt: now,
                  },
                });
            } else {
              yield* tx
                .delete(memberActivitySessions)
                .where(
                  and(
                    eq(memberActivitySessions.guildId, dto.guildId),
                    eq(memberActivitySessions.discordId, dto.discordId),
                    eq(memberActivitySessions.source, dto.source),
                    eq(memberActivitySessions.sessionId, sessionId),
                  ),
                );

              const active = yield* countActiveSessions();

              yield* tx
                .update(memberActivityStats)
                .set({
                  activeSessionCount: active,
                  updatedAt: new Date(yield* Clock.currentTimeMillis),
                })
                .where(
                  and(
                    eq(memberActivityStats.guildId, dto.guildId),
                    eq(memberActivityStats.discordId, dto.discordId),
                    eq(memberActivityStats.source, dto.source),
                  ),
                );
            }

            return created;
          }),
        );
      });

      const clearActiveSessionsForMember = Effect.fn(
        "ActivityRepository.clearSessions",
      )(function* (member: { guildId: string; discordId: string }) {
        yield* db.transaction((tx) =>
          Effect.gen(function* () {
            yield* tx
              .delete(memberActivitySessions)
              .where(
                and(
                  eq(memberActivitySessions.guildId, member.guildId),
                  eq(memberActivitySessions.discordId, member.discordId),
                ),
              );
            yield* tx
              .update(memberActivityStats)
              .set({
                activeSessionCount: 0,
                updatedAt: new Date(yield* Clock.currentTimeMillis),
              })
              .where(
                and(
                  eq(memberActivityStats.guildId, member.guildId),
                  eq(memberActivityStats.discordId, member.discordId),
                  gt(memberActivityStats.activeSessionCount, 0),
                ),
              );
          }),
        );
      });

      const findMany = Effect.fn("ActivityRepository.findMany")(function* (
        query: QueryActivities,
      ) {
        const position =
          query.cursor === undefined
            ? undefined
            : Option.getOrUndefined(parseActivityCursor(query.cursor));

        // The query schema admits only cursors that parse.
        if (query.cursor !== undefined && position === undefined)
          return yield* Effect.die("Activity cursor did not parse");

        const cursor = position && {
          createdAt: drizzleSql`${position.createdAt}::timestamptz`,
          id: position.id,
        };

        const conditions = [
          query.userId ? eq(activities.userId, query.userId) : undefined,
          query.guildId ? eq(activities.guildId, query.guildId) : undefined,
          query.type?.length ? inArray(activities.type, query.type) : undefined,
          query.source?.length
            ? inArray(activities.source, query.source)
            : undefined,
          query.world ? ilike(activities.world, `%${query.world}%`) : undefined,
          query.startDate
            ? gte(activities.createdAt, new Date(query.startDate))
            : undefined,
          query.endDate
            ? lte(activities.createdAt, new Date(query.endDate))
            : undefined,
          cursor
            ? or(
                lt(activities.createdAt, cursor.createdAt),
                and(
                  eq(activities.createdAt, cursor.createdAt),
                  lt(activities.id, cursor.id),
                ),
              )
            : undefined,
          query.playerName
            ? ilike(activityActorSnapshots.name, `%${query.playerName}%`)
            : undefined,
          query.clanName
            ? ilike(activityActorSnapshots.clanName, `%${query.clanName}%`)
            : undefined,
        ].filter((value) => value !== undefined);

        const statement = db
          .select({
            activity: activities,
            actorSnapshot: activityActorSnapshots,
            cursorCreatedAt,
          })
          .from(activities)
          .leftJoin(
            activityActorSnapshots,
            eq(activities.actorSnapshotId, activityActorSnapshots.id),
          )
          .where(and(...conditions))
          .orderBy(desc(activities.createdAt), desc(activities.id))
          .limit(query.limit + 1);

        const rows = yield* statement;
        const hasMore = rows.length > query.limit;
        const page = hasMore ? rows.slice(0, query.limit) : rows;
        const lastRow = page.at(-1);

        return {
          data: page.map(mapActivityRow),
          nextCursor:
            hasMore && lastRow
              ? encodeActivityCursor({
                  createdAt: lastRow.cursorCreatedAt,
                  id: lastRow.activity.id,
                })
              : undefined,
          hasMore,
        };
      });

      const findOne = Effect.fn("ActivityRepository.findOne")(function* (
        id: string,
        guildId: string,
      ) {
        const rows = yield* db
          .select({
            activity: activities,
            actorSnapshot: activityActorSnapshots,
          })
          .from(activities)
          .leftJoin(
            activityActorSnapshots,
            eq(activities.actorSnapshotId, activityActorSnapshots.id),
          )
          .where(and(eq(activities.id, id), eq(activities.guildId, guildId)))
          .limit(1);

        if (!rows[0]) return yield* new ActivityNotFound({ id });

        return mapActivityRow(rows[0]);
      });

      const deleteOne = Effect.fn("ActivityRepository.deleteOne")(function* (
        id: string,
        guildId: string,
      ) {
        // One statement, so the stored microsecond "createdAt" never travels
        // through a millisecond Date. The Organization is the segment key of
        // compressed chunks: naming it decompresses one batch instead of
        // probing every Organization's.
        const deleted = yield* db
          .delete(activities)
          .where(and(eq(activities.guildId, guildId), eq(activities.id, id)))
          .returning({ id: activities.id });

        if (!deleted.length) return yield* new ActivityNotFound({ id });

        return deleted.length;
      });

      const memberStats = (guildId: string) =>
        db
          .select()
          .from(memberActivityStats)
          .where(eq(memberActivityStats.guildId, guildId))
          .orderBy(
            desc(memberActivityStats.activeSessionCount),
            desc(memberActivityStats.lastSeenAt),
            asc(memberActivityStats.source),
          );

      const normalize = (limit = 10) =>
        Num.clamp(limit, { minimum: 1, maximum: 50 });

      const dedupe = (rows: Array<string | null>, limit: number) => {
        const byKey = new Map<string, string>();

        for (const v of rows) {
          if (!v?.trim()) continue;
          byKey.set(v.toLowerCase(), v.trim());
        }

        return [...byKey.values()].slice(0, limit);
      };

      const snapshotHasGuildActivity = (guildId: string) =>
        exists(
          db
            .select({ value: drizzleSql`1` })
            .from(activities)
            .where(
              and(
                eq(activities.actorSnapshotId, activityActorSnapshots.id),
                eq(activities.guildId, guildId),
              ),
            ),
        );

      const suggestSnapshotNames = Effect.fnUntraced(function* (
        column:
          | typeof activityActorSnapshots.name
          | typeof activityActorSnapshots.clanName,
        guildId: string,
        search: string | undefined,
        limit: number,
        extraCondition?: SQL,
      ) {
        const n = normalize(limit);

        const rows = yield* db
          .select({ value: column })
          .from(activityActorSnapshots)
          .where(
            and(
              snapshotHasGuildActivity(guildId),
              extraCondition,
              search?.trim() ? ilike(column, `%${search.trim()}%`) : undefined,
            ),
          )
          .orderBy(desc(activityActorSnapshots.createdAt))
          .limit(n * 2);

        return dedupe(
          rows.map((r) => r.value),
          n,
        );
      });

      const suggestActorNames = Effect.fn("ActivityRepository.suggestActors")(
        function* (guildId: string, search?: string, limit = 10) {
          return yield* suggestSnapshotNames(
            activityActorSnapshots.name,
            guildId,
            search,
            limit,
          );
        },
      );

      const suggestWorlds = Effect.fn("ActivityRepository.suggestWorlds")(
        function* (guildId: string, search?: string, limit = 20) {
          const n = normalize(limit);

          const rows = yield* db
            .selectDistinct({ value: activities.world })
            .from(activities)
            .where(
              and(
                eq(activities.guildId, guildId),
                ne(activities.world, ""),
                search?.trim()
                  ? ilike(activities.world, `%${search.trim()}%`)
                  : undefined,
              ),
            )
            .orderBy(asc(activities.world))
            .limit(n);

          return dedupe(
            rows.map((r) => r.value),
            n,
          );
        },
      );

      const suggestClanNames = Effect.fn("ActivityRepository.suggestClans")(
        function* (guildId: string, search?: string, limit = 10) {
          return yield* suggestSnapshotNames(
            activityActorSnapshots.clanName,
            guildId,
            search,
            limit,
            ne(activityActorSnapshots.clanName, ""),
          );
        },
      );

      return ActivityRepository.of({
        create,
        clearActiveSessionsForMember,
        findMany,
        findOne,
        deleteOne,
        memberStats,
        suggestActorNames,
        suggestWorlds,
        suggestClanNames,
      });
    }),
  );
}
