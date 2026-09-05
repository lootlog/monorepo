import { upsertActorCharacter } from "./timer-actor-snapshot.js";

import { and, eq } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import { memberTable, timerTable } from "#src/database/drizzle/schema";

import { generateUniqueIntId } from "#src/shared/generate-unique-int-id";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import { buildTimerKey } from "#src/timers/timer-key";
import type { CreateManualTimerRequest } from "#src/contracts/timers/schemas";
import type { TimersGuildAccess } from "./timers.handlers.js";
import {
  TimersInvariantViolation,
  TimersMemberNotFound,
  toTimersDataFailure,
} from "./timer-errors.js";
import { mapTimerResponse } from "#src/timers/timer-projection";

export interface ManualTimerPorts {
  readonly invalidate: (pattern: string) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
}

const spawnWindow = (payload: CreateManualTimerRequest, now: Date) => {
  if (payload.customMinSpawnTime && payload.customMaxSpawnTime) {
    const minSpawnTime = new Date(payload.customMinSpawnTime);
    const maxSpawnTime = new Date(payload.customMaxSpawnTime);
    const midpointSeconds = Math.round(
      (maxSpawnTime.getTime() - minSpawnTime.getTime()) / 2000,
    );
    return {
      minSpawnTime,
      maxSpawnTime,
      latestRespBaseSeconds: midpointSeconds,
      latestRespawnRandomness: midpointSeconds > 0 ? 100 : 0,
    };
  }
  if (payload.minSeconds && payload.maxSeconds) {
    const averageSeconds = Math.round(
      (payload.minSeconds + payload.maxSeconds) / 2,
    );
    const varianceSeconds = payload.maxSeconds - averageSeconds;
    return {
      minSpawnTime: new Date(now.getTime() + payload.minSeconds * 1000),
      maxSpawnTime: new Date(now.getTime() + payload.maxSeconds * 1000),
      latestRespBaseSeconds: averageSeconds,
      latestRespawnRandomness:
        averageSeconds > 0
          ? Math.round((varianceSeconds / averageSeconds) * 100)
          : 0,
    };
  }
  throw new InvalidRequestError({
    message:
      "Either minSeconds/maxSeconds or customMinSpawnTime/customMaxSpawnTime must be provided",
  });
};

export const makeManualTimer = (
  database: typeof ApiDatabase.Service,
  ports: ManualTimerPorts,
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
    const npcId = generateUniqueIntId();
    const timerKey = buildTimerKey(npcId, payload.name);
    const projection = yield* database.transaction((transaction) =>
      Effect.gen(function* () {
        const members = yield* transaction
          .select()
          .from(memberTable)
          .where(
            and(
              eq(memberTable.userId, access.discordId),
              eq(memberTable.guildId, access.guild.id),
            ),
          )
          .limit(1);
        const member = members[0];
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
        const insertedTimers = yield* transaction
          .insert(timerTable)
          .values({
            createdById: member.id,
            guildId: access.guild.id,
            npcId,
            timerKey,
            world: payload.world,
            ...window,
            wasReset: false,
            npc: {
              id: npcId,
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
          .returning();
        const timer = insertedTimers[0];
        if (!timer)
          return yield* Effect.die(
            new TimersInvariantViolation({ code: "MANUAL_INSERT_NO_ROW" }),
          );
        return { ...timer, member, actorCharacter };
      }),
    );
    const response = mapTimerResponse(projection);
    yield* ports.invalidate(`timer:list:${access.guild.id}:*`);
    yield* ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response);
    yield* ports.publish(
      RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
      response,
    );
    return response;
  });
  return (access: TimersGuildAccess, payload: CreateManualTimerRequest) =>
    operation(access, payload).pipe(Effect.mapError(toTimersDataFailure));
};
