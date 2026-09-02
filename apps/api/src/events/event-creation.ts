import { TaggedError as TaggedErrorClass } from "effect/Schema";
import {
  DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  normalizeEventScoringMode,
  normalizeEventScoringRules,
} from "@lootlog/domain/scoring";
import { randomUUID } from "node:crypto";
import { Effect, Schema } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventMapTable,
  eventTable,
} from "#src/database/drizzle/schema";
import type { RedisService } from "#src/redis/redis.service";
import { BadRequestException } from "#src/shared/http/http-errors";
import type { ApplicationLogger as Logger } from "#src/shared/logging/application-logger";
import type { CreateEventDto } from "./dto/create-event.dto.js";
import { attachComputedEventActive } from "./utils/event-activity.util.js";

export class EventCreationError extends TaggedErrorClass<EventCreationError>()(
  "EventCreationError",
  { operation: Schema.String, cause: Schema.Defect() },
) {}

export const makeEventCreation =
  (database: typeof ApiDatabase.Service, redis: RedisService, logger: Logger) =>
  (data: CreateEventDto, guild: { id: string }) => {
    const normalized = Effect.try({
      try: () => {
        const {
          startsAt,
          endsAt,
          heroNpcs,
          world,
          scoringMode,
          scoringRules,
          rulebookMarkdown,
          ...eventData
        } = data;
        const normalizedWorld = world.trim().toLowerCase();
        if (!normalizedWorld)
          throw new BadRequestException("World is required");
        const startDate = startsAt ? new Date(startsAt) : new Date();
        const endDate = endsAt ? new Date(endsAt) : null;
        if (endDate && endDate <= startDate) {
          throw new BadRequestException("End date must be after start date");
        }
        const normalizedScoringMode = normalizeEventScoringMode(scoringMode);
        const trimmedRulebook = rulebookMarkdown?.trim();
        return {
          eventData,
          startDate,
          endDate,
          heroNpcs: heroNpcs ?? [],
          world: normalizedWorld,
          scoringMode: normalizedScoringMode,
          scoringRules:
            normalizedScoringMode === "ADVANCED"
              ? normalizeEventScoringRules(
                  scoringRules ?? DEFAULT_ADVANCED_EVENT_SCORING_RULES,
                )
              : null,
          rulebookMarkdown:
            trimmedRulebook && trimmedRulebook.length > 0
              ? trimmedRulebook
              : null,
        };
      },
      catch: (cause) =>
        cause instanceof BadRequestException
          ? cause
          : new EventCreationError({
              operation: "events.create.normalize",
              cause,
            }),
    });

    return Effect.gen(function* () {
      const input = yield* normalized;
      const eventId = randomUUID();
      const created = yield* database
        .transaction((transaction) =>
          Effect.gen(function* () {
            const eventRows = yield* transaction
              .insert(eventTable)
              .values({
                ...input.eventData,
                id: eventId,
                guildId: guild.id,
                world: input.world,
                startsAt: input.startDate,
                endsAt: input.endDate,
                scoringMode: input.scoringMode,
                scoringRules: input.scoringRules,
                rulebookMarkdown: input.rulebookMarkdown,
                updatedAt: new Date(),
              })
              .returning();
            const event = eventRows[0];
            if (!event) {
              return yield* Effect.fail(
                new EventCreationError({
                  operation: "events.create.insert",
                  cause: new Error("Event was not returned"),
                }),
              );
            }
            const heroes = [];
            for (const hero of input.heroNpcs) {
              const heroId = randomUUID();
              const heroRows = yield* transaction
                .insert(eventHeroNpcTable)
                .values({
                  id: heroId,
                  eventId,
                  npcId: hero.npcId ?? null,
                  npcName: hero.npcName,
                })
                .returning();
              const createdHero = heroRows[0];
              if (!createdHero) continue;
              const maps =
                hero.maps.length === 0
                  ? []
                  : yield* transaction
                      .insert(eventMapTable)
                      .values(
                        hero.maps.map((map) => ({
                          id: randomUUID(),
                          heroNpcId: heroId,
                          mapId: map.mapId,
                          mapName: map.mapName,
                          updatedAt: new Date(),
                        })),
                      )
                      .returning();
              heroes.push({
                ...createdHero,
                maps: maps.map((map) => ({ ...map, assignedMembers: [] })),
              });
            }
            return { ...event, heroNpcs: heroes };
          }),
        )
        .pipe(
          Effect.mapError((cause) =>
            cause instanceof EventCreationError
              ? cause
              : new EventCreationError({
                  operation: "events.create.transaction",
                  cause,
                }),
          ),
          Effect.withSpan("events.create.transaction", {
            attributes: { adapter: "events.drizzle", retryCount: 0 },
          }),
        );
      yield* Effect.tryPromise({
        try: () => redis.deleteByPattern(`event-read:v2:${guild.id}:*`),
        catch: (cause) => cause,
      }).pipe(
        Effect.catch((error) =>
          Effect.sync(() =>
            logger.warn("Failed to invalidate event read cache", error),
          ),
        ),
      );
      return attachComputedEventActive(created, new Date());
    }).pipe(Effect.withSpan("EventsController_createEvent"));
  };

export type EventCreation = ReturnType<typeof makeEventCreation>;
