import { and, desc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { Capability } from "@lootlog/domain/access-policy";
import { canViewNpcTimer } from "@lootlog/domain/npc-permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  playerSnapshotTable,
  timerHistoryEntryTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { ErrorKey } from "#src/timers/error-key";
import { TimerHistoryAction } from "#src/timers/timers.types";
import { isLegacyNpcIdIdentifier } from "#src/timers/timer-key";
import { InvalidRequestError } from "#src/shared/http/http-errors";
import type { TimersGuildAccess } from "./timers.handlers.js";
import { toTimersDataFailure } from "./timer-errors.js";
import {
  mapTimerCharacter,
  mapTimerMember,
  mapTimerNpc,
  parseTimerNpc,
} from "./timer-response.js";

export const makeTimerHistory = (database: typeof ApiDatabase.Service) => {
  const read = (
    access: TimersGuildAccess,
    world: string,
    timerIdentifier: string | null,
    requestedLimit?: number,
  ) =>
    Effect.gen(function* () {
      const limit =
        requestedLimit && requestedLimit > 0 ? Math.min(requestedLimit, 20) : 5;
      let timerKey = timerIdentifier;
      if (timerIdentifier && isLegacyNpcIdIdentifier(timerIdentifier)) {
        const matches = yield* database
          .select({ timerKey: timerTable.timerKey })
          .from(timerTable)
          .where(
            and(
              eq(timerTable.guildId, access.guild.id),
              eq(timerTable.world, world),
              eq(timerTable.npcId, Number.parseInt(timerIdentifier, 10)),
            ),
          );
        if (matches.length > 1) {
          return yield* Effect.fail(
            new InvalidRequestError({
              message: ErrorKey.AMBIGUOUS_TIMER_IDENTIFIER,
            }),
          );
        }
        timerKey = matches[0]?.timerKey ?? timerIdentifier;
      }
      const condition = timerKey
        ? and(
            eq(timerHistoryEntryTable.guildId, access.guild.id),
            eq(timerHistoryEntryTable.world, world),
            eq(timerHistoryEntryTable.timerKey, timerKey),
          )
        : and(
            eq(timerHistoryEntryTable.guildId, access.guild.id),
            eq(timerHistoryEntryTable.world, world),
          );
      const rows = yield* database
        .select({
          entry: timerHistoryEntryTable,
          guildName: guildTable.name,
          actorMember: memberTable,
          actorCharacter: playerSnapshotTable,
        })
        .from(timerHistoryEntryTable)
        .innerJoin(
          guildTable,
          eq(guildTable.id, timerHistoryEntryTable.guildId),
        )
        .innerJoin(
          memberTable,
          eq(memberTable.id, timerHistoryEntryTable.actorMemberId),
        )
        .leftJoin(
          playerSnapshotTable,
          eq(
            playerSnapshotTable.id,
            timerHistoryEntryTable.actorCharacterSnapshotId,
          ),
        )
        .where(condition)
        .orderBy(desc(timerHistoryEntryTable.createdAt))
        .limit(limit);
      const administrative = access.accessPolicy.allows(Capability.ADMIN);
      return rows.flatMap(
        ({ entry, guildName, actorMember, actorCharacter }) => {
          if (
            !administrative &&
            !canViewNpcTimer(parseTimerNpc(entry.npc), access.roles)
          ) {
            return [];
          }
          return [
            {
              id: entry.id,
              guildId: entry.guildId,
              guildName,
              world: entry.world,
              timerKey: entry.timerKey,
              npcId: entry.npcId,
              npc: mapTimerNpc(entry.npc),
              action: entry.action,
              member: mapTimerMember(actorMember),
              actorCharacter: mapTimerCharacter(
                actorCharacter,
                entry.actorCharacterLvl,
              ),
              minSpawnTime: entry.minSpawnTime,
              maxSpawnTime: entry.maxSpawnTime,
              canRestore: entry.action === TimerHistoryAction.DELETE,
              createdAt: entry.createdAt,
            },
          ];
        },
      );
    }).pipe(Effect.mapError(toTimersDataFailure));

  return {
    getHistory: (
      access: TimersGuildAccess,
      world: string,
      timerIdentifier: string,
      limit?: number,
    ) => read(access, world, timerIdentifier, limit),
    getRecentHistory: (
      access: TimersGuildAccess,
      world: string,
      limit?: number,
    ) => read(access, world, null, limit),
  };
};
