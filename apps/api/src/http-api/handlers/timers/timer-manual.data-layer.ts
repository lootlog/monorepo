import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Clock, Effect } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  playerSnapshotTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { getProfByShortname } from "#src/shared/margonem/profession";
import { generateUniqueIntId } from "#src/shared/generate-unique-int-id";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import { buildTimerKey } from "#src/timers/timer-key";
import type { CreateManualTimerDto } from "../../contracts/timers/schemas.js";
import type { TimersGuildAccess } from "./timers.handlers.js";
import {
  TimersInvariantViolation,
  TimersMemberNotFound,
  toTimersDataFailure,
} from "./timer-errors.js";
import { mapTimerResponse } from "./timer-response.js";

export interface ManualTimerPorts {
  readonly invalidate: (pattern: string) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
}

const spawnWindow = (payload: CreateManualTimerDto, now: Date) => {
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
    payload: CreateManualTimerDto,
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

        let actorCharacter: typeof playerSnapshotTable.$inferSelect | null =
          null;
        const actor = payload.actorCharacter;
        if (actor) {
          const characterId = Number.parseInt(actor.characterId, 10);
          const accountId = Number.parseInt(actor.accountId, 10);
          if (!Number.isNaN(characterId) && !Number.isNaN(accountId)) {
            const prof = getProfByShortname(actor.prof ?? "");
            const icon = actor.icon ?? "";
            const snapshotHash = createHash("sha256")
              .update(`${actor.name}${actor.prof ?? ""}${icon}`)
              .digest("hex");
            const inserted = yield* transaction
              .insert(playerSnapshotTable)
              .values({
                world: payload.world,
                accountId,
                characterId,
                snapshotHash,
                name: actor.name,
                prof,
                icon,
              })
              .onConflictDoNothing()
              .returning();
            actorCharacter = inserted[0] ?? null;
            if (!actorCharacter) {
              const existing = yield* transaction
                .select()
                .from(playerSnapshotTable)
                .where(
                  and(
                    eq(playerSnapshotTable.world, payload.world),
                    eq(playerSnapshotTable.accountId, accountId),
                    eq(playerSnapshotTable.characterId, characterId),
                    eq(playerSnapshotTable.snapshotHash, snapshotHash),
                  ),
                )
                .limit(1);
              actorCharacter = existing[0] ?? null;
            }
          }
        }
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
            actorCharacterLvl: actor?.lvl ?? null,
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
  return (access: TimersGuildAccess, payload: CreateManualTimerDto) =>
    operation(access, payload).pipe(Effect.mapError(toTimersDataFailure));
};
