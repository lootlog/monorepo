import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapAssignmentHistoryTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventMapToMemberTable,
  eventTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { RedisService } from "#src/redis/redis.service";
import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { EventTimersPort } from "./services/event-timers.port.js";
import { getSyntheticNpcId } from "./utils/get-synthetic-npc-id.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventMapAssignmentError extends Schema.TaggedError<EventMapAssignmentError>()(
  "EventMapAssignmentError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export interface EventAssignmentPublisher {
  readonly publish: (
    routingKey: RoutingKey,
    payload: unknown,
  ) => Effect.Effect<void, unknown>;
}

export const makeEventMapAssignments = (
  database: typeof ApiDatabase.Service,
  redis: RedisService,
  timers: EventTimersPort,
  publisher: EventAssignmentPublisher,
  logger: Logger,
) => {
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new EventMapAssignmentError({ operation, cause }),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.assignments.drizzle", retryCount: 0 },
      }),
    );

  const bestEffort = (
    effect: Effect.Effect<void, unknown>,
    operation: string,
  ) =>
    effect.pipe(
      Effect.catch((error) =>
        Effect.sync(() =>
          logger.warn("Failed to publish event assignment", {
            error,
            operation,
          }),
        ),
      ),
      Effect.withSpan(operation, {
        attributes: { adapter: "events.rabbitmq", retryCount: 0 },
      }),
    );

  const invalidate = (guildId: string, eventId: string) =>
    Effect.forEach(
      [
        `event-read:v2:${guildId}:guild:*`,
        `event-read:v2:${guildId}:${eventId}:*`,
      ],
      (pattern) =>
        Effect.tryPromise({
          try: () => redis.deleteByPattern(pattern),
          catch: (cause) => cause,
        }).pipe(
          Effect.catch((error) =>
            Effect.sync(() =>
              logger.warn("Failed to invalidate event read cache", {
                error,
                pattern,
              }),
            ),
          ),
        ),
      { concurrency: "unbounded", discard: true },
    );

  const scopedMap = (guildId: string, eventId: string, mapId: string) =>
    query(
      "events.assignments.scopedMap",
      database
        .select({
          map: eventMapTable,
          hero: eventHeroNpcTable,
          event: eventTable,
        })
        .from(eventMapTable)
        .innerJoin(
          eventHeroNpcTable,
          eq(eventHeroNpcTable.id, eventMapTable.heroNpcId),
        )
        .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
        .where(
          and(
            eq(eventMapTable.id, mapId),
            eq(eventTable.id, eventId),
            eq(eventTable.guildId, guildId),
          ),
        )
        .limit(1),
    ).pipe(Effect.map((rows) => rows[0] ?? null));

  const assignedMembers = (mapId: string) =>
    Effect.gen(function* () {
      const assignments = yield* query(
        "events.assignments.members",
        database
          .select({ member: memberTable })
          .from(eventMapToMemberTable)
          .innerJoin(memberTable, eq(memberTable.id, eventMapToMemberTable.B))
          .where(eq(eventMapToMemberTable.A, mapId)),
      );
      const memberIds = assignments.map(({ member }) => member.id);
      const roles =
        memberIds.length === 0
          ? []
          : yield* query(
              "events.assignments.roles",
              database
                .select({
                  memberId: memberToRoleTable.A,
                  position: roleTable.position,
                  color: roleTable.color,
                })
                .from(memberToRoleTable)
                .innerJoin(roleTable, eq(roleTable.id, memberToRoleTable.B))
                .where(inArray(memberToRoleTable.A, memberIds))
                .orderBy(desc(roleTable.position)),
            );
      return assignments.map(({ member }) => ({
        id: member.id,
        name: member.name,
        avatar: member.avatar,
        userId: member.userId,
        roles: roles
          .filter(({ memberId }) => memberId === member.id)
          .slice(0, 1)
          .map(({ position, color }) => ({ position, color })),
      }));
    });

  const hydratedMap = (mapId: string) =>
    query(
      "events.assignments.map",
      database
        .select()
        .from(eventMapTable)
        .where(eq(eventMapTable.id, mapId))
        .limit(1),
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0]
          ? assignedMembers(mapId).pipe(
              Effect.map((members) => ({
                ...rows[0],
                assignedMembers: members,
              })),
            )
          : Effect.succeed(null),
      ),
    );

  const closeGap = (
    mapId: string,
    gapType: "UNASSIGNED" | "UNCOVERED",
    now: Date,
  ) =>
    query(
      `events.assignments.close${gapType}`,
      database
        .select()
        .from(eventMapCoverageGapTable)
        .where(
          and(
            eq(eventMapCoverageGapTable.mapId, mapId),
            eq(eventMapCoverageGapTable.gapType, gapType),
            isNull(eventMapCoverageGapTable.endedAt),
          ),
        )
        .limit(1),
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0]
          ? query(
              `events.assignments.close${gapType}.update`,
              database
                .update(eventMapCoverageGapTable)
                .set({
                  endedAt: now,
                  durationSeconds: Math.round(
                    (now.getTime() - rows[0].startedAt.getTime()) / 1000,
                  ),
                })
                .where(eq(eventMapCoverageGapTable.id, rows[0].id)),
            ).pipe(Effect.asVoid)
          : Effect.void,
      ),
    );

  const openGap = (
    mapId: string,
    heroNpcId: string,
    gapType: "UNASSIGNED" | "UNCOVERED",
    now: Date,
  ) =>
    query(
      `events.assignments.find${gapType}`,
      database
        .select({ id: eventMapCoverageGapTable.id })
        .from(eventMapCoverageGapTable)
        .where(
          and(
            eq(eventMapCoverageGapTable.mapId, mapId),
            eq(eventMapCoverageGapTable.gapType, gapType),
            isNull(eventMapCoverageGapTable.endedAt),
          ),
        )
        .limit(1),
    ).pipe(
      Effect.flatMap((rows) =>
        rows[0]
          ? Effect.void
          : query(
              `events.assignments.open${gapType}`,
              database.insert(eventMapCoverageGapTable).values({
                id: randomUUID(),
                mapId,
                heroNpcId,
                gapType,
                startedAt: now,
              }),
            ).pipe(Effect.asVoid),
      ),
    );

  const publishStatus = (guildId: string, eventId: string, mapId: string) =>
    bestEffort(
      publisher.publish(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
        guildId,
        eventId,
        mapId,
      }),
      "events.assignments.publishStatus",
    );

  return {
    assignMember: (
      guild: { id: string },
      eventId: string,
      mapId: string,
      memberId: number,
    ) =>
      Effect.gen(function* () {
        const scoped = yield* scopedMap(guild.id, eventId, mapId);
        if (!scoped)
          return yield* Effect.fail(new NotFoundException("Map not found"));
        const members = yield* assignedMembers(mapId);
        if (members.some(({ id }) => id === memberId))
          return yield* hydratedMap(mapId);
        const memberRows = yield* query(
          "events.assignments.member",
          database
            .select({ id: memberTable.id })
            .from(memberTable)
            .where(
              and(
                eq(memberTable.id, memberId),
                eq(memberTable.guildId, guild.id),
              ),
            )
            .limit(1),
        );
        if (!memberRows[0])
          return yield* Effect.fail(new NotFoundException("Member not found"));
        const effectiveNpcId =
          scoped.hero.npcId ?? getSyntheticNpcId(scoped.hero.id);
        const timer = yield* timers.getEventRespawnTimer({
          guildId: guild.id,
          world: scoped.event.world,
          npcId: effectiveNpcId,
          npcName: scoped.hero.npcName,
        });
        if (!timer)
          return yield* Effect.fail(
            new BadRequestException(
              "Cannot assign members without an active respawn window",
            ),
          );
        const now = new Date();
        if (now >= new Date(timer.maxSpawnTime))
          return yield* Effect.fail(
            new BadRequestException(
              "Cannot assign members after the respawn window is overdue",
            ),
          );
        const enabledAt = new Date(
          new Date(timer.minSpawnTime).getTime() -
            scoped.event.assignmentTimeoutMinutes * 60 * 1000,
        );
        if (now < enabledAt)
          return yield* Effect.fail(
            new BadRequestException(
              "Cannot assign members before the assignment window opens",
            ),
          );
        const cap = scoped.event.mapAssignmentCap;
        if (cap && cap > 0 && members.length >= cap)
          return yield* Effect.fail(
            new BadRequestException(
              `Map assignment limit reached (${cap} members max)`,
            ),
          );
        const wasUnassigned = members.length === 0;
        yield* query(
          "events.assignments.assign.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction
                .insert(eventMapToMemberTable)
                .values({ A: mapId, B: memberId })
                .onConflictDoNothing();
              const openAssignments = yield* transaction
                .select({ id: eventMapAssignmentHistoryTable.id })
                .from(eventMapAssignmentHistoryTable)
                .where(
                  and(
                    eq(eventMapAssignmentHistoryTable.mapId, mapId),
                    eq(eventMapAssignmentHistoryTable.memberId, memberId),
                    isNull(eventMapAssignmentHistoryTable.unassignedAt),
                  ),
                )
                .limit(1);
              if (!openAssignments[0])
                yield* transaction
                  .insert(eventMapAssignmentHistoryTable)
                  .values({
                    id: randomUUID(),
                    mapId,
                    heroNpcId: scoped.hero.id,
                    memberId,
                    assignedAt: now,
                  });
            }),
          ),
        );
        if (wasUnassigned) {
          yield* closeGap(mapId, "UNASSIGNED", now);
          yield* openGap(mapId, scoped.hero.id, "UNCOVERED", now);
          yield* bestEffort(
            publisher.publish(RoutingKey.PRESENCE_CHECK_REQUEST, {
              guildId: guild.id,
              mapName: scoped.map.mapName,
            }),
            "events.assignments.publishPresenceCheck",
          );
        }
        const updated = yield* hydratedMap(mapId);
        yield* Effect.all(
          [
            invalidate(guild.id, eventId),
            publishStatus(guild.id, eventId, mapId),
          ],
          { concurrency: "unbounded", discard: true },
        );
        return updated;
      }).pipe(Effect.withSpan("EventsAssignmentController_assignMember")),

    unassignMember: (
      guild: { id: string },
      eventId: string,
      mapId: string,
      memberId?: number,
    ) =>
      Effect.gen(function* () {
        const scoped = yield* scopedMap(guild.id, eventId, mapId);
        if (!scoped)
          return yield* Effect.fail(new NotFoundException("Map not found"));
        const now = new Date();
        yield* query(
          "events.assignments.unassign.transaction",
          database.transaction((transaction) =>
            Effect.gen(function* () {
              yield* transaction
                .delete(eventMapToMemberTable)
                .where(
                  and(
                    eq(eventMapToMemberTable.A, mapId),
                    memberId === undefined
                      ? undefined
                      : eq(eventMapToMemberTable.B, memberId),
                  ),
                );
              yield* transaction
                .update(eventMapAssignmentHistoryTable)
                .set({ unassignedAt: now })
                .where(
                  and(
                    eq(eventMapAssignmentHistoryTable.mapId, mapId),
                    memberId === undefined
                      ? undefined
                      : eq(eventMapAssignmentHistoryTable.memberId, memberId),
                    isNull(eventMapAssignmentHistoryTable.unassignedAt),
                  ),
                );
            }),
          ),
        );
        const updated = yield* hydratedMap(mapId);
        if (updated && updated.assignedMembers.length === 0) {
          yield* openGap(mapId, scoped.hero.id, "UNASSIGNED", now);
          yield* closeGap(mapId, "UNCOVERED", now);
        }
        yield* Effect.all(
          [
            invalidate(guild.id, eventId),
            publishStatus(guild.id, eventId, mapId),
          ],
          { concurrency: "unbounded", discard: true },
        );
        return updated;
      }).pipe(Effect.withSpan("EventsAssignmentController_unassignMember")),
  };
};

export type EventMapAssignments = ReturnType<typeof makeEventMapAssignments>;
