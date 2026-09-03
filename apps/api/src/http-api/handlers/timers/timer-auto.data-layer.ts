import { createHash, randomUUID } from "node:crypto";
import {
  and,
  arrayOverlaps,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import { decodeJsonUnknown } from "#src/shared/schema/json";
import { getNpcTypeByWt } from "@lootlog/domain/npc-type";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { NpcTypeEnum as NpcType } from "@lootlog/schema/npc-type";
import { Permission } from "@lootlog/schema/permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  guildTable,
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  timerHistoryEntryTable,
  timerTable,
  userCharactersLootlogSettingsTable,
} from "#src/database/drizzle/schema";
import { getSyntheticNpcId } from "#src/events/utils/get-synthetic-npc-id";
import { getProfByShortname } from "#src/shared/utils/get-prof-by-shortname";
import {
  InvalidRequestError,
  ResourceConflictError,
  PermissionDeniedError,
} from "#src/shared/http/http-errors";
import { DEFAULT_RESPAWN_RANDOMNESS } from "#src/timers/constants/respawn";
import { TIMER_LIMITS } from "#src/timers/constants/timer-limits";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import { TimerHistoryAction } from "#src/timers/timers.types";
import { buildTimerKey } from "#src/timers/utils/timer-key";
import type { CreateTimerFromGameClientDto } from "../../lootlog-api.js";
import {
  type TimersIdentity,
  TimersOperationError,
} from "./timers.handlers.js";
import {
  CachedTimerProjectionSchema,
  mapTimerResponse,
} from "./timer-response.js";

const DEDUP_TTL_SECONDS = 30;
const RELEASE_DEDUP_LOCK_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

type EventHeroCheck = {
  readonly guildId: string;
  readonly world: string;
  readonly npcId: number;
  readonly npcName: string;
  readonly npcIcon: string;
  readonly npcLvl: number;
  readonly timerData: {
    readonly minSpawnTime: Date;
    readonly maxSpawnTime: Date;
    readonly memberId: number;
    readonly previousMinSpawnTime: Date | null;
    readonly previousMaxSpawnTime: Date | null;
    readonly windowOpenedAt: Date | null;
  };
};

export interface AutoTimerPorts {
  readonly enqueueEventHeroCheck: (
    check: EventHeroCheck,
  ) => Effect.Effect<unknown, unknown>;
  readonly get: (key: string) => Effect.Effect<string | null, unknown>;
  readonly invalidate: (pattern: string) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_TIMERS_DELETE
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
  readonly releaseDedup: (
    script: string,
    key: string,
    token: string,
  ) => Effect.Effect<unknown, never>;
  readonly set: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
  readonly setNx: (
    key: string,
    value: string,
    ttlSeconds: number,
  ) => Effect.Effect<boolean, unknown>;
  readonly withLock: <A, E>(
    key: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | unknown>;
}

const calculateSpawnWindow = (
  payload: CreateTimerFromGameClientDto,
  now: Date,
) => {
  if (payload.customMinSpawnTime && payload.customMaxSpawnTime) {
    const minSpawnTime = new Date(payload.customMinSpawnTime);
    const maxSpawnTime = new Date(payload.customMaxSpawnTime);
    if (maxSpawnTime <= minSpawnTime) {
      throw new InvalidRequestError({
        message: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
      });
    }
    if (minSpawnTime < now) {
      throw new InvalidRequestError({ message: ErrorKey.SPAWN_TIME_IN_PAST });
    }
    if (
      maxSpawnTime.getTime() - minSpawnTime.getTime() >
      TIMER_LIMITS.MAX_SPAWN_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ) {
      throw new InvalidRequestError({
        message: ErrorKey.SPAWN_WINDOW_TOO_LARGE,
      });
    }
    return { minSpawnTime, maxSpawnTime };
  }
  const milliseconds = payload.respBaseSeconds * 1000;
  const randomness = payload.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS;
  return {
    minSpawnTime: new Date(
      now.getTime() +
        Math.round(milliseconds - milliseconds * (randomness / 100)),
    ),
    maxSpawnTime: new Date(
      now.getTime() +
        Math.round(milliseconds + milliseconds * (randomness / 100)),
    ),
  };
};

const makeNpc = (payload: CreateTimerFromGameClientDto) => ({
  id: payload.npc.id,
  name: payload.npc.name,
  prof: getProfByShortname(payload.npc.prof ?? ""),
  location: payload.npc.location,
  wt: String(payload.npc.wt),
  lvl: payload.npc.lvl,
  type: getNpcTypeByWt(
    NpcType,
    payload.npc.wt,
    payload.npc.prof ?? "",
    payload.npc.type,
  ),
  icon: payload.npc.icon,
  margonemType: String(payload.npc.type),
});

const upsertActor = (
  database: Pick<typeof ApiDatabase.Service, "insert" | "select">,
  payload: CreateTimerFromGameClientDto,
) =>
  Effect.gen(function* () {
    const actor = payload.actorCharacter;
    if (!actor) return null;
    const characterId = Number.parseInt(actor.characterId, 10);
    const accountId = Number.parseInt(actor.accountId, 10);
    if (Number.isNaN(characterId) || Number.isNaN(accountId)) return null;
    const icon = actor.icon ?? "";
    const snapshotHash = createHash("sha256")
      .update(`${actor.name}${actor.prof ?? ""}${icon}`)
      .digest("hex");
    const inserted = yield* database
      .insert(playerSnapshotTable)
      .values({
        world: payload.world,
        accountId,
        characterId,
        snapshotHash,
        name: actor.name,
        prof: getProfByShortname(actor.prof ?? ""),
        icon,
      })
      .onConflictDoNothing()
      .returning();
    if (inserted[0]) return inserted[0];
    const existing = yield* database
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
    return existing[0] ?? null;
  });

const migrateSyntheticTimer = (
  database: Pick<typeof ApiDatabase.Service, "delete" | "select">,
  options: {
    readonly guildId: string;
    readonly world: string;
    readonly npcId: number;
    readonly npcName: string;
  },
) =>
  Effect.gen(function* () {
    const now = new Date(yield* Clock.currentTimeMillis);
    const heroes = yield* database
      .select({ hero: eventHeroNpcTable })
      .from(eventHeroNpcTable)
      .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
      .where(
        and(
          eq(eventTable.guildId, options.guildId),
          eq(eventTable.world, options.world),
          eq(eventHeroNpcTable.npcName, options.npcName),
          or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
          or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
        ),
      )
      .limit(1);
    const hero = heroes[0]?.hero;
    if (hero?.npcId !== null) return null;
    const syntheticNpcId = getSyntheticNpcId(hero.id);
    if (syntheticNpcId === options.npcId) return null;
    const syntheticTimerKey = buildTimerKey(syntheticNpcId, options.npcName);
    const syntheticRows = yield* database
      .select()
      .from(timerTable)
      .where(
        and(
          eq(timerTable.guildId, options.guildId),
          eq(timerTable.world, options.world),
          eq(timerTable.timerKey, syntheticTimerKey),
        ),
      )
      .limit(1);
    const timer = syntheticRows[0];
    if (!timer) return null;
    yield* database
      .delete(timerTable)
      .where(
        and(
          eq(timerTable.guildId, options.guildId),
          eq(timerTable.world, options.world),
          eq(timerTable.timerKey, syntheticTimerKey),
        ),
      );
    return { timer, syntheticNpcId, syntheticTimerKey };
  });

const projectionFromCache = (value: string) =>
  Effect.try({
    try: () =>
      mapTimerResponse(
        Schema.decodeUnknownSync(CachedTimerProjectionSchema)(
          decodeJsonUnknown(value),
        ),
      ),
    catch: (cause) => new Error("Invalid cached timer projection", { cause }),
  });

const badRequest = (message: ErrorKey, rejectedGuilds: unknown[]) =>
  new InvalidRequestError({
    message,
    submittedGuilds: [],
    rejectedGuilds,
  });

export const makeAutoTimer = (
  database: typeof ApiDatabase.Service,
  ports: AutoTimerPorts,
) => {
  const writeGuildTimer = (
    identity: TimersIdentity,
    guildId: string,
    payload: CreateTimerFromGameClientDto,
  ) => {
    const timerKey = buildTimerKey(payload.npc.id, payload.npc.name);
    const dedupKey = `timer:dedup:${guildId}:${payload.world}:${timerKey}`;
    const dedupLockKey = `${dedupKey}:lock`;
    const startedAt = new Date();

    const persist = ports.withLock(
      `timer:lock:${guildId}:${payload.world}:${timerKey}`,
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const window = yield* Effect.try({
            try: () => calculateSpawnWindow(payload, startedAt),
            catch: (cause) =>
              cause instanceof InvalidRequestError
                ? cause
                : new InvalidRequestError({
                    message: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
                  }),
          });
          const npc = makeNpc(payload);
          const members = yield* transaction
            .select()
            .from(memberTable)
            .where(
              and(
                eq(memberTable.userId, identity.discordId),
                eq(memberTable.guildId, guildId),
              ),
            )
            .limit(1);
          const member = members[0];
          if (!member)
            return yield* Effect.fail(new Error("Timer member was not found"));
          const actorCharacter = yield* upsertActor(transaction, payload);
          const existingRows = yield* transaction
            .select()
            .from(timerTable)
            .where(
              and(
                eq(timerTable.guildId, guildId),
                eq(timerTable.world, payload.world),
                eq(timerTable.timerKey, timerKey),
              ),
            )
            .limit(1);
          let previousTimer = existingRows[0] ?? null;
          let migratedSyntheticNpcId: number | null = null;
          let migratedSyntheticTimerKey: string | null = null;
          if (!previousTimer) {
            const migrated = yield* migrateSyntheticTimer(transaction, {
              guildId,
              world: payload.world,
              npcId: payload.npc.id,
              npcName: payload.npc.name,
            });
            if (migrated) {
              previousTimer = migrated.timer;
              migratedSyntheticNpcId = migrated.syntheticNpcId;
              migratedSyntheticTimerKey = migrated.syntheticTimerKey;
            }
          }
          const now = new Date(yield* Clock.currentTimeMillis);
          const timerRows = yield* transaction
            .insert(timerTable)
            .values({
              createdById: member.id,
              guildId,
              world: payload.world,
              npcId: payload.npc.id,
              timerKey,
              ...window,
              latestRespBaseSeconds: payload.respBaseSeconds,
              latestRespawnRandomness:
                payload.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
              wasReset: false,
              npc,
              windowOpenedAt: now,
              actorCharacterSnapshotId: actorCharacter?.id ?? null,
              actorCharacterLvl: payload.actorCharacter?.lvl ?? null,
              deletedAt: null,
              createdAt: now,
              updatedAt: now,
            })
            .onConflictDoUpdate({
              target: [
                timerTable.guildId,
                timerTable.world,
                timerTable.timerKey,
              ],
              set: {
                createdById: member.id,
                ...window,
                latestRespBaseSeconds: payload.respBaseSeconds,
                latestRespawnRandomness:
                  payload.respawnRandomness ?? DEFAULT_RESPAWN_RANDOMNESS,
                wasReset: false,
                npc,
                windowOpenedAt: now,
                actorCharacterSnapshotId: actorCharacter?.id ?? null,
                actorCharacterLvl: payload.actorCharacter?.lvl ?? null,
                deletedAt: null,
                updatedAt: now,
              },
            })
            .returning();
          const timer = timerRows[0];
          if (!timer)
            return yield* Effect.fail(
              new Error("Automatic timer upsert returned no row"),
            );
          yield* transaction.insert(timerHistoryEntryTable).values({
            guildId,
            world: payload.world,
            timerKey,
            npcId: payload.npc.id,
            npc,
            action: TimerHistoryAction.CREATE,
            actorMemberId: member.id,
            actorCharacterSnapshotId: actorCharacter?.id,
            actorCharacterLvl: payload.actorCharacter?.lvl,
            minSpawnTime: window.minSpawnTime,
            maxSpawnTime: window.maxSpawnTime,
            latestRespBaseSeconds: timer.latestRespBaseSeconds,
            latestRespawnRandomness: timer.latestRespawnRandomness,
            wasReset: timer.wasReset,
            windowOpenedAt: timer.windowOpenedAt,
            timerCreatedById: timer.createdById,
            timerActorCharacterSnapshotId: timer.actorCharacterSnapshotId,
            timerActorCharacterLvl: timer.actorCharacterLvl,
          });
          const stale = yield* transaction
            .select({ id: timerHistoryEntryTable.id })
            .from(timerHistoryEntryTable)
            .where(
              and(
                eq(timerHistoryEntryTable.guildId, guildId),
                eq(timerHistoryEntryTable.world, payload.world),
                eq(timerHistoryEntryTable.timerKey, timerKey),
              ),
            )
            .orderBy(
              desc(timerHistoryEntryTable.createdAt),
              desc(timerHistoryEntryTable.id),
            )
            .offset(5);
          if (stale.length > 0) {
            yield* transaction.delete(timerHistoryEntryTable).where(
              inArray(
                timerHistoryEntryTable.id,
                stale.map(({ id }) => id),
              ),
            );
          }
          return {
            projection: { ...timer, member, actorCharacter },
            previousTimer,
            migratedSyntheticNpcId,
            migratedSyntheticTimerKey,
          };
        }),
      ),
    );

    return Effect.gen(function* () {
      if (payload.npc.wt < TIMER_LIMITS.MIN_NPC_WT_FOR_TIMERS) {
        return yield* Effect.fail(
          new InvalidRequestError({ message: ErrorKey.WT_TOO_LOW }),
        );
      }
      const cached = yield* ports.get(dedupKey);
      if (cached) return yield* projectionFromCache(cached);
      const token = randomUUID();
      let acquired = yield* ports.setNx(dedupLockKey, token, DEDUP_TTL_SECONDS);
      const waitedForOwner = !acquired;
      if (!acquired) {
        for (let attempt = 0; attempt < 100; attempt += 1) {
          yield* Effect.sleep("50 millis");
          const result = yield* ports.get(dedupKey);
          if (result) return yield* projectionFromCache(result);
          acquired = yield* ports.setNx(dedupLockKey, token, DEDUP_TTL_SECONDS);
          if (acquired) break;
        }
        if (!acquired) {
          return yield* Effect.fail(
            new ResourceConflictError({
              message: ErrorKey.TIMER_RACE_CONDITION,
            }),
          );
        }
      }
      return yield* Effect.ensuring(
        Effect.gen(function* () {
          const cachedAfterLock = yield* ports.get(dedupKey);
          if (cachedAfterLock)
            return yield* projectionFromCache(cachedAfterLock);
          if (waitedForOwner) {
            const completedRows = yield* database
              .select()
              .from(timerTable)
              .where(
                and(
                  eq(timerTable.guildId, guildId),
                  eq(timerTable.world, payload.world),
                  eq(timerTable.timerKey, timerKey),
                  gte(timerTable.updatedAt, startedAt),
                ),
              )
              .limit(1);
            const completed = completedRows[0];
            if (completed) return mapTimerResponse(completed);
          }
          const result = yield* persist;
          const response = mapTimerResponse(result.projection);
          yield* ports.set(
            dedupKey,
            JSON.stringify(result.projection),
            DEDUP_TTL_SECONDS,
          );
          yield* ports.invalidate(`timer:list:${guildId}:*`);
          if (result.migratedSyntheticNpcId !== null) {
            const deletion = {
              guildId,
              world: payload.world,
              npcId: result.migratedSyntheticNpcId,
              timerKey: result.migratedSyntheticTimerKey ?? undefined,
              routing: {
                tier: getNpcRoutingTier(makeNpc(payload)),
                npcLevel: payload.npc.lvl,
              },
            };
            yield* ports.publish(
              RabbitRoutingKey.GUILDS_TIMERS_DELETE,
              deletion,
            );
            yield* ports.publish(
              RabbitRoutingKey.NOTIFICATIONS_TIMER_DELETED,
              deletion,
            );
          }
          yield* ports.publish(RabbitRoutingKey.GUILDS_TIMERS_UPDATE, response);
          yield* ports.publish(
            RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
            response,
          );
          yield* ports
            .enqueueEventHeroCheck({
              guildId,
              world: payload.world,
              npcId: payload.npc.id,
              npcName: payload.npc.name,
              npcIcon: payload.npc.icon,
              npcLvl: payload.npc.lvl,
              timerData: {
                minSpawnTime: result.projection.minSpawnTime,
                maxSpawnTime: result.projection.maxSpawnTime,
                memberId: result.projection.createdById,
                previousMinSpawnTime:
                  result.previousTimer?.minSpawnTime ?? null,
                previousMaxSpawnTime:
                  result.previousTimer?.maxSpawnTime ?? null,
                windowOpenedAt: result.previousTimer?.windowOpenedAt ?? null,
              },
            })
            .pipe(Effect.ignore);
          return response;
        }),
        ports.releaseDedup(RELEASE_DEDUP_LOCK_SCRIPT, dedupLockKey, token),
      );
    });
  };

  const operation = Effect.fn("createAutoTimerData")(function* (
    identity: TimersIdentity,
    payload: CreateTimerFromGameClientDto,
  ) {
    if (payload.npc.wt < TIMER_LIMITS.MIN_NPC_WT_FOR_TIMERS) {
      return yield* Effect.fail(
        new InvalidRequestError({ message: ErrorKey.WT_TOO_LOW }),
      );
    }
    yield* Effect.try({
      try: () => calculateSpawnWindow(payload, new Date()),
      catch: (cause) =>
        cause instanceof InvalidRequestError
          ? cause
          : new InvalidRequestError({
              message: ErrorKey.INVALID_CUSTOM_SPAWN_TIME,
            }),
    });
    const guildRows = yield* database
      .selectDistinct({ guild: guildTable })
      .from(guildTable)
      .leftJoin(
        memberTable,
        and(
          eq(memberTable.guildId, guildTable.id),
          eq(memberTable.userId, identity.discordId),
          eq(memberTable.active, true),
          isNotNull(memberTable.globalUserId),
        ),
      )
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(
          eq(guildTable.active, true),
          or(
            eq(guildTable.ownerId, identity.discordId),
            arrayOverlaps(roleTable.permissions, [
              Permission.LOOTLOG_TIMERS_WRITE,
            ]),
          ),
        ),
      );
    if (guildRows.length === 0)
      return yield* Effect.fail(new PermissionDeniedError());
    const configs = yield* database
      .select({
        catchingGuildIds: userCharactersLootlogSettingsTable.catchingGuildIds,
      })
      .from(userCharactersLootlogSettingsTable)
      .where(
        and(
          eq(userCharactersLootlogSettingsTable.userId, identity.discordId),
          eq(userCharactersLootlogSettingsTable.accountId, payload.accountId),
          eq(
            userCharactersLootlogSettingsTable.characterId,
            payload.characterId,
          ),
        ),
      )
      .orderBy(desc(userCharactersLootlogSettingsTable.createdAt))
      .limit(1);
    const catching = new Set(configs[0]?.catchingGuildIds ?? []);
    const targets = guildRows.filter(({ guild }) => catching.has(guild.id));
    const rejectedGuilds: Array<{
      guildId: string;
      guildName: string;
      reason: "NOT_ON_CATCHING_WHITELIST" | "TIMER_CREATE_FAILED";
    }> = guildRows
      .filter(({ guild }) => !catching.has(guild.id))
      .map(({ guild }) => ({
        guildId: guild.id,
        guildName: guild.name,
        reason: "NOT_ON_CATCHING_WHITELIST" as const,
      }));
    if (targets.length === 0) {
      return yield* Effect.fail(
        badRequest(
          ErrorKey.NO_GUILDS_ON_THE_CATCHING_WHITELIST,
          rejectedGuilds,
        ),
      );
    }
    const submittedGuilds: Array<{ guildId: string; guildName: string }> = [];
    for (const { guild } of targets) {
      const result = yield* writeGuildTimer(identity, guild.id, payload).pipe(
        Effect.map(() => ({ _tag: "Right" as const })),
        Effect.catch((error) =>
          Effect.succeed({ _tag: "Left" as const, error }),
        ),
      );
      if (result._tag === "Right") {
        submittedGuilds.push({ guildId: guild.id, guildName: guild.name });
      } else {
        rejectedGuilds.push({
          guildId: guild.id,
          guildName: guild.name,
          reason: "TIMER_CREATE_FAILED",
        });
      }
    }
    if (submittedGuilds.length === 0) {
      return yield* Effect.fail(
        badRequest(ErrorKey.NO_GUILD_ACCEPTS_THIS_TIMER, rejectedGuilds),
      );
    }
    return { submittedGuilds, rejectedGuilds };
  });
  return (identity: TimersIdentity, payload: CreateTimerFromGameClientDto) =>
    operation(identity, payload).pipe(
      Effect.mapError((cause) => new TimersOperationError({ cause })),
    );
};
