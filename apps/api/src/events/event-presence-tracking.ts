import { randomUUID } from "node:crypto";
import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import { ExecutionError } from "redlock";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventMapToMemberTable,
  eventPresenceLogTable,
  eventTable,
  memberTable,
} from "#src/database/drizzle/schema";
import { RoutingKey } from "#src/enum/routing-key.enum";
import type { RedlockService } from "#src/lib/redlock/redlock.service";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { EventEmitter } from "./services/event-emitter.service.js";
import type { EventTimersPort } from "./services/event-timers.port.js";
import { getSyntheticNpcId } from "./utils/get-synthetic-npc-id.js";
import { buildTimerKey } from "#src/timers/utils/timer-key";

type GapType = typeof eventMapCoverageGapTable.$inferSelect.gapType;
const UNASSIGNED: GapType = "UNASSIGNED";
const UNCOVERED: GapType = "UNCOVERED";

export const makeEventPresenceTracking = (
  database: typeof ApiDatabase.Service,
  timers: EventTimersPort,
  redlockService: RedlockService,
  publisher: EventEmitter,
  logger: Logger,
) => {
  const redlock = redlockService.createInstance();
  const query = <A, E>(operation: string, effect: Effect.Effect<A, E>) =>
    effect.pipe(
      Effect.withSpan(operation, {
        attributes: { adapter: "events.presence.drizzle", retryCount: 0 },
      }),
    );
  const findOpenGap = (mapId: string, gapType: GapType) =>
    query(
      "events.presence.gap.find",
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
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
    );
  const openGap = (
    mapId: string,
    heroNpcId: string,
    gapType: GapType,
    startedAt = new Date(),
  ) =>
    Effect.gen(function* () {
      if (yield* findOpenGap(mapId, gapType)) return;
      yield* query(
        "events.presence.gap.open",
        database.insert(eventMapCoverageGapTable).values({
          id: randomUUID(),
          mapId,
          heroNpcId,
          gapType,
          startedAt,
        }),
      );
    });
  const closeGap = (mapId: string, gapType: GapType) =>
    Effect.gen(function* () {
      const gap = yield* findOpenGap(mapId, gapType);
      if (!gap) return;
      const endedAt = new Date();
      yield* query(
        "events.presence.gap.close",
        database
          .update(eventMapCoverageGapTable)
          .set({
            endedAt,
            durationSeconds: Math.round(
              (endedAt.getTime() - gap.startedAt.getTime()) / 1000,
            ),
          })
          .where(eq(eventMapCoverageGapTable.id, gap.id)),
      );
    });
  const openUnassignedGap = (
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ) => openGap(mapId, heroNpcId, UNASSIGNED, startedAt);
  const openUncoveredGap = (
    mapId: string,
    heroNpcId: string,
    startedAt?: Date,
  ) => openGap(mapId, heroNpcId, UNCOVERED, startedAt);
  const closeUncoveredGap = (mapId: string) => closeGap(mapId, UNCOVERED);
  const closeAllGapsForHero = (heroNpcId: string) =>
    Effect.gen(function* () {
      const gaps = yield* query(
        "events.presence.gap.listOpen",
        database
          .select()
          .from(eventMapCoverageGapTable)
          .where(
            and(
              eq(eventMapCoverageGapTable.heroNpcId, heroNpcId),
              isNull(eventMapCoverageGapTable.endedAt),
            ),
          ),
      );
      const endedAt = new Date();
      yield* query(
        "events.presence.gap.closeAll",
        database.transaction((transaction) =>
          Effect.forEach(
            gaps,
            (gap) =>
              transaction
                .update(eventMapCoverageGapTable)
                .set({
                  endedAt,
                  durationSeconds: Math.round(
                    (endedAt.getTime() - gap.startedAt.getTime()) / 1000,
                  ),
                })
                .where(eq(eventMapCoverageGapTable.id, gap.id)),
            { discard: true },
          ),
        ),
      );
    });

  const handleInternal = (
    guildId: string,
    mapName: string,
    discordId: string,
    hasPlayer: boolean,
    isAfk: boolean,
  ) =>
    Effect.gen(function* () {
      const referenceTime = new Date();
      const [memberRows, mapRows] = yield* Effect.all(
        [
          query(
            "events.presence.member",
            database
              .select()
              .from(memberTable)
              .where(
                and(
                  eq(memberTable.userId, discordId),
                  eq(memberTable.guildId, guildId),
                  eq(memberTable.active, true),
                ),
              )
              .limit(1),
          ),
          query(
            "events.presence.maps",
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
              .innerJoin(
                eventTable,
                eq(eventTable.id, eventHeroNpcTable.eventId),
              )
              .where(
                and(
                  eq(eventMapTable.mapName, mapName),
                  eq(eventTable.guildId, guildId),
                  or(
                    isNull(eventTable.startsAt),
                    lte(eventTable.startsAt, referenceTime),
                  ),
                  or(
                    isNull(eventTable.endsAt),
                    gt(eventTable.endsAt, referenceTime),
                  ),
                ),
              ),
          ),
        ],
        { concurrency: "unbounded" },
      );
      if (mapRows.length === 0) return;
      const mapIds = mapRows.map(({ map }) => map.id);
      const [assignmentRows, activeRows] = yield* Effect.all(
        [
          query(
            "events.presence.assignments",
            database
              .select({ mapId: eventMapToMemberTable.A })
              .from(eventMapToMemberTable)
              .where(inArray(eventMapToMemberTable.A, mapIds)),
          ),
          query(
            "events.presence.active",
            database
              .selectDistinct({
                mapId: eventPresenceLogTable.mapId,
                memberId: eventPresenceLogTable.memberId,
              })
              .from(eventPresenceLogTable)
              .where(
                and(
                  inArray(eventPresenceLogTable.mapId, mapIds),
                  isNull(eventPresenceLogTable.endedAt),
                  eq(eventPresenceLogTable.isAfk, false),
                ),
              ),
          ),
        ],
        { concurrency: "unbounded" },
      );
      const timerKeys = yield* timers.getActiveTimerKeys(
        mapRows.map(({ hero, event }) => ({
          guildId,
          world: event.world,
          npcId: hero.npcId ?? getSyntheticNpcId(hero.id),
          npcName: hero.npcName,
        })),
        referenceTime,
      );
      const member = memberRows[0] ?? null;
      yield* Effect.forEach(
        mapRows.filter(({ hero, event }) =>
          timerKeys.has(
            `${guildId}:${event.world}:${buildTimerKey(
              hero.npcId ?? getSyntheticNpcId(hero.id),
              hero.npcName,
            )}`,
          ),
        ),
        ({ map, hero, event }) =>
          Effect.gen(function* () {
            const assigned = assignmentRows.some(
              ({ mapId }) => mapId === map.id,
            );
            const nonAfk = new Set(
              activeRows
                .filter(({ mapId }) => mapId === map.id)
                .map(({ memberId }) => memberId),
            );
            if (member) {
              const endedAt = new Date();
              yield* query(
                "events.presence.close",
                database
                  .update(eventPresenceLogTable)
                  .set({ endedAt })
                  .where(
                    and(
                      eq(eventPresenceLogTable.mapId, map.id),
                      eq(eventPresenceLogTable.memberId, member.id),
                      isNull(eventPresenceLogTable.endedAt),
                    ),
                  ),
              );
              if (hasPlayer) {
                yield* query(
                  "events.presence.create",
                  database.insert(eventPresenceLogTable).values({
                    id: randomUUID(),
                    mapId: map.id,
                    memberId: member.id,
                    isAfk,
                  }),
                );
                if (isAfk) nonAfk.delete(member.id);
                else nonAfk.add(member.id);
              } else {
                nonAfk.delete(member.id);
              }
            }
            if (!assigned) return;
            if (nonAfk.size === 0) yield* openUncoveredGap(map.id, hero.id);
            else yield* closeUncoveredGap(map.id);
            yield* Effect.tryPromise({
              try: () =>
                publisher.emit(RoutingKey.EVENT_MAP_STATUS_UPDATE, {
                  guildId,
                  eventId: event.id,
                  mapId: map.id,
                  reason: "presence",
                }),
              catch: (cause) => cause,
            });
          }),
        { concurrency: "unbounded", discard: true },
      );
    }).pipe(Effect.withSpan("events.presence.handle"));

  return {
    closeAllGapsForHero,
    openUnassignedGap,
    handlePlayerPresenceChange(
      guildId: string,
      mapName: string,
      discordId: string,
      hasPlayer: boolean,
      isAfk = false,
    ) {
      const lockKey = `presence:lock:${guildId}:${mapName}:${discordId}`;
      return Effect.tryPromise({
        try: () =>
          redlock.using([lockKey], 5_000, () =>
            Effect.runPromise(
              handleInternal(guildId, mapName, discordId, hasPlayer, isAfk),
            ),
          ),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((error) => {
          if (!(error instanceof ExecutionError)) return Effect.fail(error);
          return Effect.sync(() =>
            logger.warn("Failed to acquire presence lock, skipping update", {
              guildId,
              mapName,
              discordId,
            }),
          );
        }),
        Effect.withSpan("events.presence.lock", {
          attributes: { adapter: "events.redlock", retryCount: 0 },
        }),
      );
    },
  };
};

export type EventPresenceTracking = ReturnType<
  typeof makeEventPresenceTracking
>;
