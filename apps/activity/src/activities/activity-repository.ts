import { TaggedError as TaggedErrorClass } from "effect/Schema";
import { createId } from "@paralleldrive/cuid2";
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
  sql as drizzleSql,
} from "drizzle-orm";
import { Clock, Context, Effect, Layer, Schema } from "effect";
import { createHash } from "node:crypto";
import { ActivityDatabase } from "#src/database/database";
import {
  activities,
  activityActorSnapshots,
  ActivityType,
  memberActivitySessions,
  memberActivityStats,
} from "#src/database/schema";
import type { CreateActivity, QueryActivities } from "./activity-model.js";

export class ActivityNotFound extends TaggedErrorClass<ActivityNotFound>()(
  "ActivityNotFound",
  { id: Schema.String },
) {}
export interface ActivityRepositoryValue {
  readonly create: (dto: CreateActivity) => Effect.Effect<unknown, unknown>;
  readonly clearActiveSessionsForMember: (member: {
    guildId: string;
    discordId: string;
  }) => Effect.Effect<void, unknown>;
  readonly findMany: (
    query: QueryActivities,
  ) => Effect.Effect<
    { data: unknown[]; nextCursor?: string; hasMore: boolean },
    unknown
  >;
  readonly findOne: (
    id: string,
    guildId: string,
  ) => Effect.Effect<unknown, unknown | ActivityNotFound>;
  readonly deleteOne: (
    id: string,
    guildId: string,
  ) => Effect.Effect<number, unknown | ActivityNotFound>;
  readonly memberStats: (guildId: string) => Effect.Effect<unknown[], unknown>;
  readonly suggestActorNames: (
    guildId: string,
    search?: string,
    limit?: number,
  ) => Effect.Effect<string[], unknown>;
  readonly suggestWorlds: (
    guildId: string,
    search?: string,
    limit?: number,
  ) => Effect.Effect<string[], unknown>;
  readonly suggestClanNames: (
    guildId: string,
    search?: string,
    limit?: number,
  ) => Effect.Effect<string[], unknown>;
}

const detailsString = (dto: CreateActivity, key: string) => {
  const value = dto.details?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
};
const mapDetails = (details: unknown): Record<string, unknown> | undefined =>
  details !== null && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : undefined;
const isUniqueViolation = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  return "cause" in error && isUniqueViolation(error.cause);
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
          return yield* Effect.fail(
            new Error("Actor snapshot is missing a database-required field"),
          );
        const fingerprint = createHash("sha256")
          .update(
            JSON.stringify({
              accountId: snapshot.accountId,
              characterId: snapshot.characterId,
              clanName: snapshot.clanName,
              clanId: snapshot.clanId,
              name: snapshot.name,
              icon: snapshot.icon,
              lvl: snapshot.lvl,
              prof: snapshot.prof,
              source: dto.source,
            }),
          )
          .digest("hex");
        const id = createId();
        const rows = yield* db
          .insert(activityActorSnapshots)
          .values({
            id,
            accountId: snapshot.accountId,
            characterId: snapshot.characterId,
            name: snapshot.name,
            clanName: snapshot.clanName,
            clanId: snapshot.clanId,
            icon: snapshot.icon,
            lvl: snapshot.lvl,
            prof: snapshot.prof,
            source: dto.source,
            fingerprint,
          })
          .onConflictDoUpdate({
            target: activityActorSnapshots.fingerprint,
            set: { fingerprint },
          })
          .returning({ id: activityActorSnapshots.id });
        const row = rows[0];
        if (!row)
          return yield* Effect.fail(
            new Error("Actor snapshot upsert did not return an identifier"),
          );
        return row.id;
      });
      const create = Effect.fn("ActivityRepository.create")(function* (
        dto: CreateActivity,
      ) {
        const actorSnapshotId = yield* snapshotId(dto);
        const persist = db.transaction((tx) =>
          Effect.gen(function* () {
            const createdRows = yield* tx
              .insert(activities)
              .values({
                id: createId(),
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
              return yield* Effect.fail(
                new Error("Activity insert did not return a row"),
              );
            if (dto.type === ActivityType.CONNECT_EVENT) {
              const sessionId = detailsString(dto, "sessionId");
              if (!sessionId)
                return yield* Effect.fail(
                  new Error("Activity session identifier is missing"),
                );
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
              const active =
                (yield* tx
                  .select({ value: count() })
                  .from(memberActivitySessions)
                  .where(
                    and(
                      eq(memberActivitySessions.guildId, dto.guildId),
                      eq(memberActivitySessions.discordId, dto.discordId),
                      eq(memberActivitySessions.source, dto.source),
                    ),
                  ))[0]?.value ?? 0;
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
              const sessionId = detailsString(dto, "sessionId");
              if (!sessionId)
                return yield* Effect.fail(
                  new Error("Activity session identifier is missing"),
                );
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
              const active =
                (yield* tx
                  .select({ value: count() })
                  .from(memberActivitySessions)
                  .where(
                    and(
                      eq(memberActivitySessions.guildId, dto.guildId),
                      eq(memberActivitySessions.discordId, dto.discordId),
                      eq(memberActivitySessions.source, dto.source),
                    ),
                  ))[0]?.value ?? 0;
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
        return yield* persist.pipe(
          Effect.catchIf(isUniqueViolation, () =>
            Effect.gen(function* () {
              const existing = yield* db
                .select({
                  activity: activities,
                  actorSnapshot: activityActorSnapshots,
                })
                .from(activities)
                .leftJoin(
                  activityActorSnapshots,
                  eq(activities.actorSnapshotId, activityActorSnapshots.id),
                )
                .where(eq(activities.idempotencyKey, dto.idempotencyKey))
                .limit(1);
              if (!existing[0])
                return yield* Effect.fail(
                  new Error(
                    "Idempotency conflict did not resolve to an activity",
                  ),
                );
              return {
                ...existing[0].activity,
                details: mapDetails(existing[0].activity.details),
                actorSnapshot: existing[0].actorSnapshot ?? undefined,
              };
            }),
          ),
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
          query.cursor ? lt(activities.id, query.cursor) : undefined,
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
          })
          .from(activities)
          .leftJoin(
            activityActorSnapshots,
            eq(activities.actorSnapshotId, activityActorSnapshots.id),
          )
          .where(and(...conditions))
          .orderBy(desc(activities.createdAt))
          .limit(query.limit + 1);
        const rows = yield* statement;
        const hasMore = rows.length > query.limit;
        const page = hasMore ? rows.slice(0, query.limit) : rows;
        return {
          data: page.map(({ activity, actorSnapshot }) => ({
            ...activity,
            details: mapDetails(activity.details),
            actorSnapshot: actorSnapshot ?? undefined,
          })),
          nextCursor: hasMore ? page.at(-1)?.activity.id : undefined,
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
        return {
          ...rows[0].activity,
          details: mapDetails(rows[0].activity.details),
          actorSnapshot: rows[0].actorSnapshot ?? undefined,
        };
      });
      const deleteOne = Effect.fn("ActivityRepository.deleteOne")(function* (
        id: string,
        guildId: string,
      ) {
        const row = yield* db
          .select({ id: activities.id, createdAt: activities.createdAt })
          .from(activities)
          .where(and(eq(activities.id, id), eq(activities.guildId, guildId)))
          .limit(1);
        if (!row[0]) return yield* new ActivityNotFound({ id });
        yield* db
          .delete(activities)
          .where(
            and(
              eq(activities.id, id),
              eq(activities.createdAt, row[0].createdAt),
            ),
          );
        return 1;
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
      const normalize = (limit = 10) => Math.min(Math.max(limit, 1), 50);
      const dedupe = (rows: Array<string | null>, limit: number) =>
        [
          ...new Map(
            rows
              .filter((v): v is string => !!v?.trim())
              .map((v) => [v.toLowerCase(), v.trim()]),
          ).values(),
        ].slice(0, limit);
      const suggestActorNames = Effect.fn("ActivityRepository.suggestActors")(
        function* (guildId: string, search?: string, limit = 10) {
          const n = normalize(limit);
          const hasGuildActivity = db
            .select({ value: drizzleSql`1` })
            .from(activities)
            .where(
              and(
                eq(activities.actorSnapshotId, activityActorSnapshots.id),
                eq(activities.guildId, guildId),
              ),
            );
          const rows = yield* db
            .select({ value: activityActorSnapshots.name })
            .from(activityActorSnapshots)
            .where(
              and(
                exists(hasGuildActivity),
                search?.trim()
                  ? ilike(activityActorSnapshots.name, `%${search.trim()}%`)
                  : undefined,
              ),
            )
            .orderBy(desc(activityActorSnapshots.createdAt))
            .limit(n * 2);
          return dedupe(
            rows.map((r) => r.value),
            n,
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
          const n = normalize(limit);
          const hasGuildActivity = db
            .select({ value: drizzleSql`1` })
            .from(activities)
            .where(
              and(
                eq(activities.actorSnapshotId, activityActorSnapshots.id),
                eq(activities.guildId, guildId),
              ),
            );
          const rows = yield* db
            .select({ value: activityActorSnapshots.clanName })
            .from(activityActorSnapshots)
            .where(
              and(
                exists(hasGuildActivity),
                ne(activityActorSnapshots.clanName, ""),
                search?.trim()
                  ? ilike(activityActorSnapshots.clanName, `%${search.trim()}%`)
                  : undefined,
              ),
            )
            .orderBy(desc(activityActorSnapshots.createdAt))
            .limit(n * 2);
          return dedupe(
            rows.map((r) => r.value),
            n,
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
