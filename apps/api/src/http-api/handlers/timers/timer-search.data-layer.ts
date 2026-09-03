import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import {
  NpcTypeEnum as NpcType,
  NpcTypeSchema,
} from "@lootlog/schema/npc-type";
import { ApiDatabase } from "#src/database/drizzle/database";
import { timerTable } from "#src/database/drizzle/schema";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { TimersOperationError } from "./timers.handlers.js";

const parseNpc = (
  npc: unknown,
): { readonly lvl: number; readonly type: NpcType } | null => {
  if (!npc) return null;
  const schema = Schema.Struct({ lvl: Schema.Number, type: NpcTypeSchema });
  return Schema.decodeUnknownSync(
    typeof npc === "string" ? Schema.fromJsonString(schema) : schema,
  )(npc);
};

export const makeTimerSearch = (database: typeof ApiDatabase.Service) => {
  const operation = Effect.fn("searchTimersNpcs")(function* (
    guildId: string,
    world: string,
    search: string,
    limit = 10,
  ) {
    const boundedLimit = Number(limit) || 10;
    const timers = yield* database
      .selectDistinctOn([timerTable.timerKey], {
        npc: timerTable.npc,
        npcId: timerTable.npcId,
        timerKey: timerTable.timerKey,
        latestRespBaseSeconds: timerTable.latestRespBaseSeconds,
        latestRespawnRandomness: timerTable.latestRespawnRandomness,
      })
      .from(timerTable)
      .where(
        and(
          eq(timerTable.guildId, guildId),
          eq(timerTable.world, world),
          isNull(timerTable.deletedAt),
          sql`${timerTable.npc}->>'name' ILIKE ${`%${search}%`}`,
          sql`COALESCE(${timerTable.npc}->>'margonemType', '0') != ${String(TIMER_TYPES.CUSTOM_MANUAL)}`,
        ),
      )
      .orderBy(timerTable.timerKey, desc(timerTable.updatedAt))
      .limit(boundedLimit);
    return timers.flatMap((timer) => {
      const npc = parseNpc(timer.npc);
      if (!npc) return [];
      const source = timer.npc as Record<string, unknown>;
      return [
        {
          npcId: timer.npcId,
          timerKey: timer.timerKey,
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
    });
  });
  return (guildId: string, world: string, search: string, limit?: number) =>
    operation(guildId, world, search, limit).pipe(
      Effect.mapError((cause) => new TimersOperationError({ cause })),
    );
};
