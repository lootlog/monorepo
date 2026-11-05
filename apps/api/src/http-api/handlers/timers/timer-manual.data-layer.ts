import { upsertActorCharacter } from "./timer-actor-snapshot.js";

import { findActiveGuildMember } from "#src/members/member-access-query";
import { Clock, Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { timerTable } from "#src/database/drizzle/timer.schema";

import { InvalidRequestError } from "#src/shared/http/http-errors";
import { respawnFromSpawnWindow } from "@lootlog/domain/timers";
import { newManualTimerNpcId } from "#src/shared/margonem/npc-identity";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import { buildTimerKey } from "#src/timers/timer-key";
import type { CreateManualTimerRequest } from "#src/contracts/timers/schemas";
import type { TimersGuildAccess } from "./timers.handlers.js";
import {
  TimersInvariantViolation,
  TimersMemberNotFound,
  toTimersDataFailure,
} from "./timer-errors.js";
import {
  publishTimerUpdate,
  type TimerUpdatePorts,
} from "./timer-update-publication.js";

// A reset repeats the window as entered, counted from the reset.
const withRespawn = (minSpawnTime: Date, maxSpawnTime: Date, now: Date) => {
  const respawn = respawnFromSpawnWindow(
    (minSpawnTime.getTime() - now.getTime()) / 1000,
    (maxSpawnTime.getTime() - now.getTime()) / 1000,
  );

  return {
    minSpawnTime,
    maxSpawnTime,
    latestRespBaseSeconds: respawn.respBaseSeconds,
    latestRespawnRandomness: respawn.respawnRandomness,
  };
};

const MANUAL_TIMER_INSERT_ATTEMPTS = 3;

const spawnWindow = (payload: CreateManualTimerRequest, now: Date) => {
  if (payload.customMinSpawnTime && payload.customMaxSpawnTime) {
    return withRespawn(
      new Date(payload.customMinSpawnTime),
      new Date(payload.customMaxSpawnTime),
      now,
    );
  }

  if (payload.minSeconds && payload.maxSeconds) {
    return withRespawn(
      new Date(now.getTime() + payload.minSeconds * 1000),
      new Date(now.getTime() + payload.maxSeconds * 1000),
      now,
    );
  }

  throw new InvalidRequestError({
    message:
      "Either minSeconds/maxSeconds or customMinSpawnTime/customMaxSpawnTime must be provided",
  });
};

export const makeManualTimer = (
  database: typeof ApiDatabase.Service,
  ports: TimerUpdatePorts,
) => {
  const operation = Effect.fn("createManualTimerData")(function* (
    access: TimersGuildAccess,
    payload: CreateManualTimerRequest,
  ) {
    const now = new Date(yield* Clock.currentTimeMillis);

    const window = yield* Effect.try({
      try: () => spawnWindow(payload, now),
      catch: (cause) =>
        cause instanceof InvalidRequestError
          ? cause
          : new InvalidRequestError({ message: "Invalid timer window" }),
    });

    const projection = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const member = yield* findActiveGuildMember(
          transaction,
          access.discordId,
          access.guild.id,
        );

        if (!member)
          return yield* Effect.die(
            new TimersMemberNotFound({
              guildId: access.guild.id,
              discordId: access.discordId,
            }),
          );

        const actorCharacter = yield* upsertActorCharacter(
          transaction,
          payload.world,
          payload.actorCharacter,
        );

        let timer: typeof timerTable.$inferSelect | undefined;

        // A fresh id only collides with a manual timer of the same name.
        for (
          let attempt = 0;
          !timer && attempt < MANUAL_TIMER_INSERT_ATTEMPTS;
          attempt++
        ) {
          const npcId = newManualTimerNpcId();

          [timer] = yield* transaction
            .insert(timerTable)
            .values({
              createdById: member.id,
              guildId: access.guild.id,
              npcId,
              timerKey: buildTimerKey(npcId, payload.name),
              world: payload.world,
              ...window,
              wasReset: false,
              npc: {
                id: npcId,
                templateId: null,
                name: payload.name,
                prof: payload.prof ?? "",
                location: "",
                wt: "",
                lvl: payload.lvl ?? 0,
                type: payload.type ?? "",
                icon: "",
                margonemType: TIMER_TYPES.CUSTOM_MANUAL,
              },
              actorCharacterSnapshotId: actorCharacter?.id ?? null,
              actorCharacterLvl: payload.actorCharacter?.lvl ?? null,
              deletedAt: null,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoNothing()
            .returning();
        }

        if (!timer)
          return yield* Effect.die(
            new TimersInvariantViolation({ code: "MANUAL_INSERT_NO_ROW" }),
          );

        return { ...timer, member, actorCharacter };
      }),
    );

    return yield* publishTimerUpdate(ports, access.guild.id, projection);
  });

  return (access: TimersGuildAccess, payload: CreateManualTimerRequest) =>
    operation(access, payload).pipe(Effect.mapError(toTimersDataFailure));
};
