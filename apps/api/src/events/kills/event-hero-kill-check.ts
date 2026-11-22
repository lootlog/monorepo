import { Effect } from "effect";
import { randomUUID } from "node:crypto";
import type { RedisService } from "#src/redis/redis.service";
import { withEventAdapterSpan } from "#src/events/event-adapter";
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

export const makeEventHeroKillCheck = (
  repository: Pick<EventKillStore, "updateHero">,
  activeEventHeroRepository: ActiveEventHeroStore,
  redis: RedisService,
  recordHeroKill: RecordHeroKill,
) => {
  const logContext = Effect.annotateLogs({ context: "EventKills" });

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
            redis.get(dedupKey).pipe(withEventAdapterSpan("redis.get")),
            recentDedupKey
              ? redis
                  .get(recentDedupKey)
                  .pipe(withEventAdapterSpan("redis.get"))
              : Effect.succeed(null),
          ],
          { concurrency: "unbounded" },
        );

      const [dedupHit, recentDedupHit] = yield* readDedupHits();

      if (dedupHit) {
        yield* Effect.logDebug({
          message: "Skipping duplicate event hero kill - dedup window active",
          guildId,
          world,
          npcId,
          npcName,
        }).pipe(logContext);

        return;
      }

      if (recentDedupHit) {
        yield* Effect.logDebug({
          message: "Skipping duplicate event hero kill - recent kill active",
          guildId,
          world,
          npcId,
          npcName,
        }).pipe(logContext);

        return;
      }

      const lockToken = randomUUID();

      const lockAcquired = yield* redis
        .setNX(lockKey, lockToken, EVENT_KILL_LOCK_TTL_SECONDS)
        .pipe(withEventAdapterSpan("redis.setNX"));

      if (!lockAcquired) {
        yield* Effect.logDebug({
          message: "Skipping duplicate event hero kill - lock already held",
          guildId,
          world,
          npcId,
          npcName,
        }).pipe(logContext);

        return;
      }

      const recordWhileLocked = Effect.gen(function* () {
        const [dedupHitAfterLock, recentDedupHitAfterLock] =
          yield* readDedupHits();

        if (dedupHitAfterLock) {
          yield* Effect.logDebug({
            message:
              "Skipping duplicate event hero kill - dedup window active after lock",
            guildId,
            world,
            npcId,
            npcName,
          }).pipe(logContext);

          return;
        }

        if (recentDedupHitAfterLock) {
          yield* Effect.logDebug({
            message:
              "Skipping duplicate event hero kill - recent kill active after lock",
            guildId,
            world,
            npcId,
            npcName,
          }).pipe(logContext);

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

              const heroDedupHit = yield* redis
                .get(heroDedupKey)
                .pipe(withEventAdapterSpan("redis.get"));

              if (heroDedupHit) {
                yield* Effect.logDebug({
                  message: "Skipping duplicate event hero kill for hero",
                  guildId,
                  world,
                  npcId,
                  heroId: eventHero.id,
                  eventId: event.id,
                }).pipe(logContext);

                return;
              }

              yield* Effect.logWarning({
                message: "Updating hero NPC ID based on timer data",
                guildId,
                world,
                newNpcId: npcId,
                oldHeroNpcId: eventHero.npcId,
              }).pipe(logContext);

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

                if (!updatedHero) return;

                eventHero = updatedHero;
                yield* Effect.logInfo({
                  message: "Hero NPC data updated",
                  heroId: eventHero.id,
                  npcId: eventHero.npcId,
                  npcIcon: eventHero.npcIcon,
                  npcLvl: eventHero.npcLvl,
                }).pipe(logContext);
              }

              yield* recordHeroKill(
                guildId,
                eventHero,
                event,
                timerData,
                isManualClose,
              );

              yield* redis
                .set(
                  heroDedupKey,
                  Date.now().toString(),
                  EVENT_KILL_DEDUP_TTL_SECONDS,
                )
                .pipe(withEventAdapterSpan("redis.set"));

              yield* Effect.logInfo({
                message: isManualClose
                  ? "Manual close recorded"
                  : "Hero kill recorded",
                guildId,
                eventId: event.id,
                heroId: eventHero.id,
                npcName: eventHero.npcName,
                isManualClose,
              }).pipe(logContext);
            }),
          { concurrency: "unbounded", discard: true },
        );

        yield* Effect.all(
          [
            redis
              .set(
                dedupKey,
                Date.now().toString(),
                EVENT_KILL_DEDUP_TTL_SECONDS,
              )
              .pipe(withEventAdapterSpan("redis.set")),
            recentDedupKey
              ? redis
                  .set(
                    recentDedupKey,
                    Date.now().toString(),
                    EVENT_KILL_RECENT_DEDUP_TTL_SECONDS,
                  )
                  .pipe(withEventAdapterSpan("redis.set"))
              : Effect.void,
          ],
          { concurrency: "unbounded", discard: true },
        );
      });

      yield* recordWhileLocked.pipe(
        Effect.ensuring(
          redis.deleteIfValue(lockKey, lockToken).pipe(
            withEventAdapterSpan("redis.deleteIfValue"),
            Effect.tapError((error) =>
              Effect.logError({
                message: "Failed to release event kill lock",
                lockKey,
                error: error instanceof Error ? error.message : error,
              }).pipe(logContext),
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
