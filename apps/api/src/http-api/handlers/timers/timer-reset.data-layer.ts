import { createHash } from "node:crypto";
import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import { RabbitRoutingKey } from "@lootlog/protocol/rabbit/topology";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  memberTable,
  playerSnapshotTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { getProfByShortname } from "#src/shared/utils/get-prof-by-shortname";
import {
  BadRequestException,
  NotFoundException,
} from "#src/shared/http/http-errors";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { ErrorKey } from "#src/timers/enum/error-key.enum";
import { TimerHistoryAction } from "#src/timers/timers.types";
import { isLegacyNpcIdIdentifier } from "#src/timers/utils/timer-key";
import type { ResetTimerDto } from "../../lootlog-api.generated.js";
import {
  type TimersGuildAccess,
  TimersOperationError,
} from "./timers.handlers.js";
import { mapTimerResponse } from "./timer-response.js";

export interface ResetTimerPorts {
  readonly invalidate: (pattern: string) => Effect.Effect<unknown, unknown>;
  readonly publish: (
    routingKey:
      | typeof RabbitRoutingKey.GUILDS_TIMERS_UPDATE
      | typeof RabbitRoutingKey.NOTIFICATIONS_TIMER_UPDATED,
    payload: unknown,
  ) => Effect.Effect<unknown, unknown>;
  readonly withLock: <A, E>(
    key: string,
    effect: Effect.Effect<A, E>,
  ) => Effect.Effect<A, E | unknown>;
}

const npcField = (npc: unknown, key: string) =>
  npc && typeof npc === "object" && !Array.isArray(npc)
    ? (npc as Record<string, unknown>)[key]
    : undefined;

const upsertActorCharacter = (
  database: Pick<typeof ApiDatabase.Service, "insert" | "select">,
  world: string,
  actor: ResetTimerDto["actorCharacter"],
) =>
  Effect.gen(function* () {
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
        world,
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
          eq(playerSnapshotTable.world, world),
          eq(playerSnapshotTable.accountId, accountId),
          eq(playerSnapshotTable.characterId, characterId),
          eq(playerSnapshotTable.snapshotHash, snapshotHash),
        ),
      )
      .limit(1);
    return existing[0] ?? null;
  });

export const makeResetTimer = (
  database: typeof ApiDatabase.Service,
  ports: ResetTimerPorts,
) => {
  const operation = Effect.fn("resetTimerData")(function* (
    access: TimersGuildAccess,
    timerIdentifier: string,
    payload: ResetTimerDto,
  ) {
    const timerCondition = isLegacyNpcIdIdentifier(timerIdentifier)
      ? and(
          eq(timerTable.guildId, access.guild.id),
          eq(timerTable.world, payload.world),
          eq(timerTable.npcId, Number.parseInt(timerIdentifier, 10)),
        )
      : and(
          eq(timerTable.guildId, access.guild.id),
          eq(timerTable.world, payload.world),
          eq(timerTable.timerKey, timerIdentifier),
        );
    const matches = yield* database
      .select()
      .from(timerTable)
      .where(timerCondition);
    if (matches.length > 1) {
      throw new BadRequestException({
        message: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
      });
    }
    const resolved = matches[0];
    if (!resolved) {
      throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
    }
    const now = new Date();
    const activeEventHero = yield* database
      .select({ id: eventHeroNpcTable.id })
      .from(eventHeroNpcTable)
      .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
      .where(
        and(
          eq(eventTable.guildId, access.guild.id),
          eq(eventTable.world, payload.world),
          or(
            eq(eventHeroNpcTable.npcId, resolved.npcId),
            eq(
              eventHeroNpcTable.npcName,
              String(npcField(resolved.npc, "name") ?? ""),
            ),
          ),
          or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
          or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
        ),
      )
      .limit(1);
    if (activeEventHero.length > 0) {
      throw new BadRequestException({
        message: ErrorKey.EVENT_TIMER_CANNOT_BE_RESET,
      });
    }
    const projection = yield* ports.withLock(
      `timer:lock:${access.guild.id}:${payload.world}:${resolved.timerKey}`,
      database.transaction((transaction) =>
        Effect.gen(function* () {
          const currentRows = yield* transaction
            .select()
            .from(timerTable)
            .where(
              and(
                eq(timerTable.guildId, access.guild.id),
                eq(timerTable.world, payload.world),
                eq(timerTable.timerKey, resolved.timerKey),
              ),
            )
            .limit(1);
          const current = currentRows[0];
          if (!current) {
            throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
          }
          const respawnMilliseconds = current.latestRespBaseSeconds * 1000;
          const variance = Math.round(
            respawnMilliseconds * (current.latestRespawnRandomness / 100),
          );
          const minSpawnTime = new Date(
            now.getTime() + respawnMilliseconds - variance,
          );
          const maxSpawnTime = new Date(
            now.getTime() + respawnMilliseconds + variance,
          );
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
          if (!member) throw new Error("Timer member was not found");
          const actor = payload.actorCharacter;
          const actorCharacter = yield* upsertActorCharacter(
            transaction,
            payload.world,
            actor,
          );
          const actorUpdate = actor
            ? {
                actorCharacterSnapshotId: actorCharacter?.id ?? null,
                actorCharacterLvl: actor.lvl ?? null,
              }
            : {};
          const updatedRows = yield* transaction
            .update(timerTable)
            .set({
              createdById: member.id,
              minSpawnTime,
              maxSpawnTime,
              wasReset: true,
              deletedAt: null,
              updatedAt: now,
              ...actorUpdate,
            })
            .where(
              and(
                eq(timerTable.guildId, access.guild.id),
                eq(timerTable.world, payload.world),
                eq(timerTable.timerKey, resolved.timerKey),
              ),
            )
            .returning();
          const updated = updatedRows[0];
          if (!updated) {
            throw new NotFoundException({ message: ErrorKey.TIMER_NOT_FOUND });
          }
          const manual =
            Number(npcField(updated.npc, "margonemType")) ===
            TIMER_TYPES.CUSTOM_MANUAL;
          if (!manual) {
            yield* transaction.insert(timerHistoryEntryTable).values({
              guildId: access.guild.id,
              world: payload.world,
              timerKey: updated.timerKey,
              npcId: updated.npcId,
              npc: updated.npc,
              action: TimerHistoryAction.RESET,
              actorMemberId: member.id,
              actorCharacterSnapshotId: actorCharacter?.id,
              actorCharacterLvl: actor?.lvl,
              minSpawnTime,
              maxSpawnTime,
              latestRespBaseSeconds: updated.latestRespBaseSeconds,
              latestRespawnRandomness: updated.latestRespawnRandomness,
              wasReset: updated.wasReset,
              windowOpenedAt: updated.windowOpenedAt,
              timerCreatedById: updated.createdById,
              timerActorCharacterSnapshotId: updated.actorCharacterSnapshotId,
              timerActorCharacterLvl: updated.actorCharacterLvl,
            });
            const stale = yield* transaction
              .select({ id: timerHistoryEntryTable.id })
              .from(timerHistoryEntryTable)
              .where(
                and(
                  eq(timerHistoryEntryTable.guildId, access.guild.id),
                  eq(timerHistoryEntryTable.world, payload.world),
                  eq(timerHistoryEntryTable.timerKey, updated.timerKey),
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
          }
          return { ...updated, member, actorCharacter };
        }),
      ),
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
  return (
    access: TimersGuildAccess,
    timerIdentifier: string,
    payload: ResetTimerDto,
  ) =>
    operation(access, timerIdentifier, payload).pipe(
      Effect.mapError((cause) => new TimersOperationError({ cause })),
    );
};
