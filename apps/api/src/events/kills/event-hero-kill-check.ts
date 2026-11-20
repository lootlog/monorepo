import type { Logger } from "#src/shared/application-logger";
import { Effect } from "effect";
import { randomUUID } from "node:crypto";
import type { RedisService } from "#src/redis/redis.service";
import { runPromiseAdapter } from "#src/events/event-adapter";
import type { KillTimerData } from "#src/events/respawn/kill-timer-data";
import {
  buildEventHeroKillDedupKey,
  buildEventHeroKillHeroDedupKey,
  buildEventHeroKillRecentDedupKey,
  getEventHeroKillWindowKey,
} from "#src/events/kills/event-hero-kill-job";
import { findActiveEventHeroesByNpc as findActiveEventHeroMatchesByNpc } from "#src/events/kills/find-active-event-heroes-by-npc";
import type { ActiveEventHeroStore } from "#src/events/kills/active-event-hero.repository";
import type { RecordHeroKill } from "#src/events/kills/event-hero-kill-recording";
import type { EventKillStore } from "#src/events/kills/event-kill.repository";

const EVENT_KILL_LOCK_TTL_SECONDS = 30;

const EVENT_KILL_DEDUP_TTL_SECONDS = 120;

const EVENT_KILL_RECENT_DEDUP_TTL_SECONDS = 30;

/** Lets one of several concurrent reports of a hero kill record it for each matching active event hero. */
export const makeEventHeroKillCheck = (
  repository: Pick<EventKillStore, "updateHero">,
  activeEventHeroRepository: ActiveEventHeroStore,
  redis: RedisService,
  recordHeroKill: RecordHeroKill,
  logger: Logger,
) => {
  function checkAndRecordEventHeroKill(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
    npcIcon: string,
    timerData: KillTimerData,
    isManualClose = false,
    npcLvl?: number,
  ) {
    return Effect.gen(function* () {
      const lockKey = getEventKillLockKey(guildId, world, npcId);
      const windowKey = getEventHeroKillWindowKey(timerData);

      const dedupKey = getEventKillDedupKey(
        guildId,
        world,
        npcId,
        windowKey,
        isManualClose,
      );

      const recentDedupKey = isManualClose
        ? null
        : getEventKillRecentDedupKey(guildId, world, npcId);

      const readDedupHits = () =>
        Effect.all(
          [
            runPromiseAdapter("redis.get", () => redis.get(dedupKey)),
            recentDedupKey
              ? runPromiseAdapter("redis.get", () => redis.get(recentDedupKey))
              : Effect.succeed(null),
          ],
          { concurrency: "unbounded" },
        );

      const [dedupHit, recentDedupHit] = yield* readDedupHits();

      if (dedupHit) {
        logger.debug({
          message: "Skipping duplicate event hero kill - dedup window active",
          guildId,
          world,
          npcId,
          npcName,
        });

        return;
      }

      if (recentDedupHit) {
        logger.debug({
          message: "Skipping duplicate event hero kill - recent kill active",
          guildId,
          world,
          npcId,
          npcName,
        });

        return;
      }

      // Try to acquire lock - if another request already has it, silently return
      const lockToken = randomUUID();

      const lockAcquired = yield* runPromiseAdapter("redis.setNX", () =>
        redis.setNX(lockKey, lockToken, EVENT_KILL_LOCK_TTL_SECONDS),
      );

      if (!lockAcquired) {
        logger.debug({
          message: "Skipping duplicate event hero kill - lock already held",
          guildId,
          world,
          npcId,
          npcName,
        });

        return;
      }

      const recordWhileLocked = Effect.gen(function* () {
        const [dedupHitAfterLock, recentDedupHitAfterLock] =
          yield* readDedupHits();

        if (dedupHitAfterLock) {
          logger.debug({
            message:
              "Skipping duplicate event hero kill - dedup window active after lock",
            guildId,
            world,
            npcId,
            npcName,
          });

          return;
        }

        if (recentDedupHitAfterLock) {
          logger.debug({
            message:
              "Skipping duplicate event hero kill - recent kill active after lock",
            guildId,
            world,
            npcId,
            npcName,
          });

          return;
        }

        const matches = yield* findActiveEventHeroesByNpc(
          guildId,
          world,
          npcId,
          npcName,
        );

        if (matches.length === 0) {
          return;
        }

        yield* Effect.forEach(
          matches,
          (match) =>
            Effect.gen(function* () {
              let { eventHero } = match;
              const { event } = match;

              const heroDedupKey = getEventKillHeroDedupKey(
                guildId,
                world,
                npcId,
                eventHero.id,
                windowKey,
                isManualClose,
              );

              const heroDedupHit = yield* runPromiseAdapter("redis.get", () =>
                redis.get(heroDedupKey),
              );

              if (heroDedupHit) {
                logger.debug({
                  message: "Skipping duplicate event hero kill for hero",
                  guildId,
                  world,
                  npcId,
                  heroId: eventHero.id,
                  eventId: event.id,
                });

                return;
              }

              logger.warn({
                message: "Updating hero NPC ID based on timer data",
                guildId,
                world,
                newNpcId: npcId,
                oldHeroNpcId: eventHero.npcId,
              });

              const updateData = {
                ...((eventHero.npcId === null || eventHero.npcId !== npcId) && {
                  npcId,
                }),
                ...(eventHero.npcIcon === null && { npcIcon }),
                ...(eventHero.npcLvl === null &&
                  npcLvl !== undefined && { npcLvl }),
              };

              if (Object.keys(updateData).length > 0) {
                const updatedHero = yield* repository.updateHero(
                  eventHero.id,
                  updateData,
                );

                // The hero was removed from the event since it was matched.
                if (!updatedHero) return;

                eventHero = updatedHero;
                logger.log({
                  message: "Hero NPC data updated",
                  heroId: eventHero.id,
                  npcId: eventHero.npcId,
                  npcIcon: eventHero.npcIcon,
                  npcLvl: eventHero.npcLvl,
                });
              }

              yield* recordHeroKill(
                guildId,
                eventHero,
                event,
                timerData,
                isManualClose,
              );

              yield* runPromiseAdapter("redis.set", () =>
                redis.set(
                  heroDedupKey,
                  Date.now().toString(),
                  EVENT_KILL_DEDUP_TTL_SECONDS,
                ),
              );

              logger.log({
                message: isManualClose
                  ? "Manual close recorded"
                  : "Hero kill recorded",
                guildId,
                eventId: event.id,
                heroId: eventHero.id,
                npcName: eventHero.npcName,
                isManualClose,
              });
            }),
          { concurrency: "unbounded", discard: true },
        );

        yield* Effect.all(
          [
            runPromiseAdapter("redis.set", () =>
              redis.set(
                dedupKey,
                Date.now().toString(),
                EVENT_KILL_DEDUP_TTL_SECONDS,
              ),
            ),
            recentDedupKey
              ? runPromiseAdapter("redis.set", () =>
                  redis.set(
                    recentDedupKey,
                    Date.now().toString(),
                    EVENT_KILL_RECENT_DEDUP_TTL_SECONDS,
                  ),
                )
              : Effect.void,
          ],
          { concurrency: "unbounded", discard: true },
        );
      });

      yield* recordWhileLocked.pipe(
        Effect.ensuring(
          // A lock that expired mid-write may belong to another request now.
          runPromiseAdapter("redis.deleteIfValue", () =>
            redis.deleteIfValue(lockKey, lockToken),
          ).pipe(
            Effect.tapError((error) =>
              Effect.sync(() =>
                logger.error({
                  message: "Failed to release event kill lock",
                  lockKey,
                  error: error instanceof Error ? error.message : error,
                }),
              ),
            ),
            Effect.ignore,
          ),
        ),
      );
    }).pipe(Effect.withSpan("events.kills.checkAndRecord"));
  }

  function findActiveEventHeroesByNpc(
    guildId: string,
    world: string,
    npcId: number,
    npcName: string,
  ) {
    return findActiveEventHeroMatchesByNpc(
      activeEventHeroRepository,
      guildId,
      world,
      npcId,
      npcName,
    );
  }

  function getEventKillLockKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return `event:hero:kill:lock:${guildId}:${world}:${npcId}`;
  }

  function getEventKillDedupKey(
    guildId: string,
    world: string,
    npcId: number,
    windowKey: string,
    isManualClose: boolean,
  ): string {
    return buildEventHeroKillDedupKey({
      guildId,
      world,
      npcId,
      windowKey,
      isManualClose,
    });
  }

  function getEventKillHeroDedupKey(
    guildId: string,
    world: string,
    npcId: number,
    heroId: string,
    windowKey: string,
    isManualClose: boolean,
  ): string {
    return buildEventHeroKillHeroDedupKey({
      guildId,
      world,
      npcId,
      heroId,
      windowKey,
      isManualClose,
    });
  }

  function getEventKillRecentDedupKey(
    guildId: string,
    world: string,
    npcId: number,
  ): string {
    return buildEventHeroKillRecentDedupKey({ guildId, world, npcId });
  }

  return checkAndRecordEventHeroKill;
};
