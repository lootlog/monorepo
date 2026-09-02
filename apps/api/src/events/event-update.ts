import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
  type EventScoringMode,
} from "@lootlog/domain/scoring";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventTable,
  userPinnedEventTable,
} from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import { getEventWrappedCachePattern } from "#src/shared/constants/cache.constant";
import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { UpdateEventDto } from "./dto/update-event.dto.js";
import type { EventsCatalogRead } from "./events-catalog-read.js";
import {
  attachComputedEventActive,
  isEventActiveAt,
} from "./utils/event-activity.util.js";

// oxlint-disable-next-line unicorn/throw-new-error -- Schema.TaggedError is a class factory.
export class EventUpdateError extends Schema.TaggedError<EventUpdateError>()(
  "EventUpdateError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

const updatedDate = (value: string | null | undefined, current: Date | null) =>
  value === undefined ? current : value ? new Date(value) : null;

const updatedScoring = (
  currentRules: (typeof eventTable.$inferSelect)["scoringRules"],
  currentMode: unknown,
  requestedMode: EventScoringMode | undefined,
  requestedRules: UpdateEventDto["scoringRules"],
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
    redis: RedisService,
    catalogRead: EventsCatalogRead,
    logger: Logger,
  ) =>
  (guild: { id: string }, eventId: string, data: UpdateEventDto) =>
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
              new EventUpdateError({ operation: "events.update.find", cause }),
          ),
        );
      const event = rows[0];
      if (!event) {
        return yield* Effect.fail(new NotFoundException("Event not found"));
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
        return yield* Effect.fail(
          new BadRequestException("End date must be after start date"),
        );
      }
      const scoring = updatedScoring(
        event.scoringRules,
        event.scoringMode,
        scoringMode,
        scoringRules,
      );
      const referenceTime = new Date();
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
              yield* transaction
                .delete(eventHeroNpcTable)
                .where(eq(eventHeroNpcTable.eventId, eventId));
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
                updatedAt: new Date(),
              })
              .where(eq(eventTable.id, eventId));
            for (const hero of heroNpcs ?? []) {
              const heroId = randomUUID();
              yield* transaction.insert(eventHeroNpcTable).values({
                id: heroId,
                eventId,
                npcId: hero.npcId ?? null,
                npcName: hero.npcName,
              });
              if (hero.maps.length > 0) {
                yield* transaction.insert(eventMapTable).values(
                  hero.maps.map((map) => ({
                    id: randomUUID(),
                    heroNpcId: heroId,
                    mapId: map.mapId,
                    mapName: map.mapName,
                    updatedAt: new Date(),
                  })),
                );
              }
            }
          }),
        )
        .pipe(
          Effect.mapError(
            (cause) =>
              new EventUpdateError({
                operation: "events.update.transaction",
                cause,
              }),
          ),
          Effect.withSpan("events.update.transaction", {
            attributes: { adapter: "events.drizzle", retryCount: 0 },
          }),
        );

      const updated = yield* catalogRead.hydrateMutation(eventId);
      yield* Effect.forEach(
        [
          getEventWrappedCachePattern(guild.id, eventId),
          `event-read:v2:${guild.id}:guild:*`,
          `event-read:v2:${guild.id}:${eventId}:*`,
        ],
        (pattern) =>
          Effect.tryPromise({
            try: () => redis.deleteByPattern(pattern),
            catch: (cause) => cause,
          }).pipe(
            Effect.catch((error) =>
              Effect.sync(() =>
                logger.warn("Failed to invalidate event cache", {
                  error,
                  pattern,
                }),
              ),
            ),
          ),
        { concurrency: "unbounded", discard: true },
      );
      return attachComputedEventActive(updated, referenceTime);
    }).pipe(Effect.withSpan("EventsController_updateEvent"));

export type EventUpdate = ReturnType<typeof makeEventUpdate>;
