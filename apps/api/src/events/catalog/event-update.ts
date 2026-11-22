import {
  OperationError,
  withAdapterSpan,
} from "@lootlog/instrumentation/operation";
import {
  getEffectiveCapabilities,
  type AccessPolicy,
} from "@lootlog/domain/access-policy";
import { filterHeroesByLevel } from "@lootlog/domain/event-hero-visibility";
import { invalidateEventCache } from "#src/events/catalog/event-cache-invalidation";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringMode,
} from "@lootlog/domain/scoring";
import { and, eq, inArray } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapCoverageGapTable,
  eventMapTable,
  eventTable,
  userPinnedEventTable,
} from "#src/database/drizzle/event.schema";
import type { roleTable } from "#src/database/drizzle/organization.schema";
import type { RedisService } from "#src/redis/redis.service";
import { getEventWrappedCachePattern } from "#src/shared/cache";
import {
  InvalidRequestError,
  ResourceNotFoundError,
} from "@lootlog/protocol/http/errors";
import type { UpdateEventRequest } from "#src/contracts/events/schemas";
import type { EventsCatalogRead } from "#src/events/catalog/events-catalog-read";
import {
  attachComputedEventActive,
  isEventActiveAt,
} from "#src/events/monitoring/event-activity";

type ExistingHero = Pick<
  typeof eventHeroNpcTable.$inferSelect,
  "id" | "npcId" | "npcName"
>;

type ExistingMap = Pick<
  typeof eventMapTable.$inferSelect,
  "id" | "heroNpcId" | "mapId" | "mapName"
>;

type HeroDefinition = NonNullable<UpdateEventRequest["heroNpcs"]>[number];

type HeroListChanges = {
  heroNpcIds: Array<{ id: string; npcId: number }>;
  mapNames: Array<{ id: string; mapName: string }>;
  newHeroes: HeroDefinition[];
  newMaps: Array<{ heroNpcId: string; mapId: number; mapName: string }>;
};

const planHeroListUpdate = (
  existingHeroes: ReadonlyArray<ExistingHero>,
  existingMaps: ReadonlyArray<ExistingMap>,
  requested: ReadonlyArray<HeroDefinition>,
): HeroListChanges | InvalidRequestError => {
  const requestedByName = new Map(
    requested.map((hero) => [hero.npcName, hero]),
  );

  if (requestedByName.size !== requested.length) {
    return new InvalidRequestError("heroNpcs must not repeat a hero name");
  }

  if (
    requested.some(
      (hero) =>
        new Set(hero.maps.map((map) => map.mapId)).size !== hero.maps.length,
    )
  ) {
    return new InvalidRequestError("A hero must not repeat a map");
  }

  const changes: HeroListChanges = {
    heroNpcIds: [],
    mapNames: [],
    newHeroes: [],
    newMaps: [],
  };

  for (const hero of existingHeroes) {
    const requestedHero = requestedByName.get(hero.npcName);

    if (!requestedHero) {
      return new InvalidRequestError(
        "heroNpcs must list every existing hero; delete a hero through its own endpoint",
      );
    }

    if (
      requestedHero.npcId !== undefined &&
      requestedHero.npcId !== hero.npcId
    ) {
      changes.heroNpcIds.push({ id: hero.id, npcId: requestedHero.npcId });
    }

    const requestedMaps = new Map(
      requestedHero.maps.map((map) => [map.mapId, map]),
    );

    const heroMaps = existingMaps.filter((map) => map.heroNpcId === hero.id);

    for (const map of heroMaps) {
      const requestedMap = requestedMaps.get(map.mapId);

      if (!requestedMap) {
        return new InvalidRequestError(
          "heroNpcs must list every existing map; delete a map through its own endpoint",
        );
      }

      if (requestedMap.mapName !== map.mapName) {
        changes.mapNames.push({ id: map.id, mapName: requestedMap.mapName });
      }

      requestedMaps.delete(map.mapId);
    }

    for (const map of requestedMaps.values()) {
      changes.newMaps.push({ heroNpcId: hero.id, ...map });
    }

    requestedByName.delete(hero.npcName);
  }

  changes.newHeroes = [...requestedByName.values()];

  return changes;
};

const updatedDate = (value: string | null | undefined, current: Date | null) =>
  value === undefined ? current : value ? new Date(value) : null;

const updatedScoring = (
  currentRules: (typeof eventTable.$inferSelect)["scoringRules"],
  currentMode: (typeof eventTable.$inferSelect)["scoringMode"],
  requestedMode: EventScoringMode | undefined,
  requestedRules: UpdateEventRequest["scoringRules"],
) => {
  const mode = normalizeEventScoringMode(
    requestedMode ?? normalizeEventScoringMode(currentMode),
  );

  const rules =
    requestedMode === undefined && requestedRules === undefined
      ? undefined
      : mode === "ADVANCED"
        ? normalizeEventScoringRules(
            requestedRules ??
              currentRules ??
              DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          )
        : null;

  return { mode, rules };
};

export const makeEventUpdate =
  (
    database: typeof ApiDatabase.Service,
    redis: Pick<RedisService, "deleteByPattern" | "invalidateScopes">,
    catalogRead: Pick<EventsCatalogRead, "hydrateMutation">,
  ) =>
  (
    guild: { id: string },
    eventId: string,
    data: UpdateEventRequest,
    roles: Array<typeof roleTable.$inferSelect>,
    accessPolicy: AccessPolicy,
  ) =>
    Effect.gen(function* () {
      const rows = yield* database
        .select()
        .from(eventTable)
        .where(
          and(eq(eventTable.id, eventId), eq(eventTable.guildId, guild.id)),
        )
        .limit(1)
        .pipe(
          Effect.mapError(
            (cause) =>
              new OperationError({ operation: "events.update.find", cause }),
          ),
        );

      const event = rows[0];

      if (!event) {
        return yield* new ResourceNotFoundError("Event not found");
      }

      const {
        heroNpcs,
        startsAt,
        endsAt,
        assignmentTimeoutMinutes,
        participationConfirmationMinutes,
        basePointsPerKill,
        scoringMode,
        scoringRules,
        rulebookMarkdown,
        ...updateData
      } = data;

      const nextStart = updatedDate(startsAt, event.startsAt);
      const nextEnd = updatedDate(endsAt, event.endsAt);

      if (nextEnd && nextStart && nextEnd <= nextStart) {
        return yield* new InvalidRequestError(
          "End date must be after start date",
        );
      }

      const scoring = updatedScoring(
        event.scoringRules,
        event.scoringMode,
        scoringMode,
        scoringRules,
      );

      const referenceTime = new Date(yield* Clock.currentTimeMillis);

      const clearPins =
        !isEventActiveAt(event, referenceTime) ||
        !isEventActiveAt(
          {
            startsAt: nextStart,
            endsAt: nextEnd,
            createdAt: event.createdAt,
          },
          referenceTime,
        );

      yield* database
        .transaction((transaction) =>
          Effect.gen(function* () {
            if (clearPins) {
              yield* transaction
                .delete(userPinnedEventTable)
                .where(eq(userPinnedEventTable.eventId, eventId));
            }

            if (heroNpcs) {
              const existingHeroes = yield* transaction
                .select()
                .from(eventHeroNpcTable)
                .where(eq(eventHeroNpcTable.eventId, eventId))
                .for("share");

              if (
                filterHeroesByLevel(
                  existingHeroes,
                  roles,
                  getEffectiveCapabilities(accessPolicy),
                ).length !== existingHeroes.length
              ) {
                return yield* new ResourceNotFoundError("Hero not found");
              }

              const existingMaps =
                existingHeroes.length === 0
                  ? []
                  : yield* transaction
                      .select()
                      .from(eventMapTable)
                      .where(
                        inArray(
                          eventMapTable.heroNpcId,
                          existingHeroes.map((hero) => hero.id),
                        ),
                      );

              const changes = planHeroListUpdate(
                existingHeroes,
                existingMaps,
                heroNpcs,
              );

              if (changes instanceof InvalidRequestError) {
                return yield* changes;
              }

              const now = new Date(yield* Clock.currentTimeMillis);

              for (const { id, npcId } of changes.heroNpcIds) {
                yield* transaction
                  .update(eventHeroNpcTable)
                  .set({ npcId })
                  .where(eq(eventHeroNpcTable.id, id));
              }

              for (const { id, mapName } of changes.mapNames) {
                yield* transaction
                  .update(eventMapTable)
                  .set({ mapName, updatedAt: now })
                  .where(eq(eventMapTable.id, id));
              }

              const newHeroes = changes.newHeroes.map((hero) => ({
                ...hero,
                id: Bun.randomUUIDv7(),
              }));

              if (newHeroes.length > 0) {
                yield* transaction.insert(eventHeroNpcTable).values(
                  newHeroes.map((hero) => ({
                    id: hero.id,
                    eventId,
                    npcId: hero.npcId ?? null,
                    npcName: hero.npcName,
                  })),
                );
              }

              const addedMaps = changes.newMaps.map((map) => ({
                ...map,
                id: Bun.randomUUIDv7(),
              }));

              const newMaps = [
                ...addedMaps,
                ...newHeroes.flatMap((hero) =>
                  hero.maps.map((map) => ({
                    ...map,
                    id: Bun.randomUUIDv7(),
                    heroNpcId: hero.id,
                  })),
                ),
              ];

              if (newMaps.length > 0) {
                yield* transaction.insert(eventMapTable).values(
                  newMaps.map((map) => ({
                    id: map.id,
                    heroNpcId: map.heroNpcId,
                    mapId: map.mapId,
                    mapName: map.mapName,
                    updatedAt: now,
                  })),
                );
              }

              if (addedMaps.length > 0) {
                yield* transaction.insert(eventMapCoverageGapTable).values(
                  addedMaps.map((map) => ({
                    id: Bun.randomUUIDv7(),
                    mapId: map.id,
                    heroNpcId: map.heroNpcId,
                    gapType: "UNASSIGNED" as const,
                    startedAt: now,
                  })),
                );
              }
            }

            yield* transaction
              .update(eventTable)
              .set({
                ...updateData,
                ...(startsAt !== undefined && { startsAt: nextStart }),
                ...(endsAt !== undefined && { endsAt: nextEnd }),
                ...(assignmentTimeoutMinutes !== undefined && {
                  assignmentTimeoutMinutes,
                }),
                ...(participationConfirmationMinutes !== undefined && {
                  participationConfirmationMinutes,
                }),
                ...(basePointsPerKill !== undefined && { basePointsPerKill }),
                ...(scoringMode !== undefined && { scoringMode: scoring.mode }),
                ...(scoring.rules !== undefined && {
                  scoringRules: scoring.rules,
                }),
                ...(rulebookMarkdown !== undefined && {
                  rulebookMarkdown:
                    rulebookMarkdown.trim().length > 0
                      ? rulebookMarkdown.trim()
                      : null,
                }),
                updatedAt: new Date(yield* Clock.currentTimeMillis),
              })
              .where(eq(eventTable.id, eventId));
          }),
        )
        .pipe(
          Effect.mapError((cause) =>
            cause instanceof ResourceNotFoundError ||
            cause instanceof InvalidRequestError
              ? cause
              : new OperationError({
                  operation: "events.update.transaction",
                  cause,
                }),
          ),
          withAdapterSpan("events.update.transaction", "events.drizzle"),
        );

      const updated = yield* catalogRead.hydrateMutation(eventId);
      yield* invalidateEventCache(
        redis,
        guild.id,
        eventId,
        "Failed to invalidate event cache",
        getEventWrappedCachePattern(guild.id, eventId),
      );

      return attachComputedEventActive(
        {
          ...updated,
          heroNpcs: filterHeroesByLevel(
            updated.heroNpcs,
            roles,
            getEffectiveCapabilities(accessPolicy),
          ),
        },
        referenceTime,
      );
    }).pipe(Effect.withSpan("EventsController_updateEvent"));

export type EventUpdate = ReturnType<typeof makeEventUpdate>;
