import { isObjectRecord } from "@lootlog/schema/records";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { timerTable } from "#src/database/drizzle/schema";
import type { TimerNpcSearchQuery } from "#src/contracts/timers/schemas";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import {
  parseTimerNpc,
  timerNpcTemplateId,
} from "#src/timers/timer-projection";
import { canViewTimer } from "./timer-selection.js";
import type { TimersGuildAccess } from "./timers.handlers.js";
import { toTimersDataFailure } from "./timer-errors.js";

const DEFAULT_LIMIT = 10;

const identityCondition = (query: TimerNpcSearchQuery) => {
  const npcIds = query.npcIds ?? [];
  const templateIds = query.templateIds ?? [];

  if (npcIds.length === 0 && templateIds.length === 0) return undefined;

  return or(
    npcIds.length > 0 ? inArray(timerTable.npcId, [...npcIds]) : undefined,
    templateIds.length > 0
      ? inArray(sql`${timerTable.npc}->>'templateId'`, templateIds.map(String))
      : undefined,
  );
};

export const makeTimerSearch = (database: typeof ApiDatabase.Service) => {
  const operation = Effect.fn("searchTimersNpcs")(function* (
    access: TimersGuildAccess,
    query: TimerNpcSearchQuery,
  ) {
    // Every match is read so timers hidden from the caller never take a
    // visible result's place under the limit.
    const timers = yield* database
      .select({
        npc: timerTable.npc,
        npcId: timerTable.npcId,
        timerKey: timerTable.timerKey,
        world: timerTable.world,
        latestRespBaseSeconds: timerTable.latestRespBaseSeconds,
        latestRespawnRandomness: timerTable.latestRespawnRandomness,
      })
      .from(timerTable)
      .where(
        and(
          eq(timerTable.guildId, access.guild.id),
          query.world ? eq(timerTable.world, query.world) : undefined,
          isNull(timerTable.deletedAt),
          query.search
            ? sql`${timerTable.npc}->>'name' ILIKE ${`%${query.search}%`}`
            : undefined,
          identityCondition(query),
          sql`COALESCE(${timerTable.npc}->>'margonemType', '0') != ${String(TIMER_TYPES.CUSTOM_MANUAL)}`,
        ),
      )
      .orderBy(timerTable.world, timerTable.timerKey);

    const projectSearchTimer = (timer: (typeof timers)[number]) => {
      const npc = parseTimerNpc(timer.npc);

      if (!npc || !canViewTimer(access, timer)) return [];
      const source = isObjectRecord(timer.npc) ? timer.npc : {};

      return [
        {
          npcId: timer.npcId,
          templateId: timerNpcTemplateId(timer.npc),
          timerKey: timer.timerKey,
          world: timer.world,
          name: typeof source.name === "string" ? source.name : "",
          lvl: npc.lvl,
          type: npc.type,
          prof: typeof source.prof === "string" ? source.prof : "",
          location: typeof source.location === "string" ? source.location : "",
          wt:
            typeof source.wt === "string" || typeof source.wt === "number"
              ? source.wt
              : 0,
          icon: typeof source.icon === "string" ? source.icon : "",
          latestRespBaseSeconds: timer.latestRespBaseSeconds,
          latestRespawnRandomness: timer.latestRespawnRandomness,
        },
      ];
    };

    return timers
      .flatMap(projectSearchTimer)
      .slice(0, query.limit ?? DEFAULT_LIMIT);
  });

  return (access: TimersGuildAccess, query: TimerNpcSearchQuery) =>
    operation(access, query).pipe(Effect.mapError(toTimersDataFailure));
};
