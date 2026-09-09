import { and, eq, gt, isNull, lte, or } from "drizzle-orm";
import { Capability } from "@lootlog/domain/access-policy";
import { canViewNpcTimer } from "@lootlog/domain/npc-permissions";
import type { TimersGuildAccess } from "./timers.handlers.js";
import { timerNpcField, parseTimerNpc } from "#src/timers/timer-projection";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  eventHeroNpcTable,
  eventTable,
  timerTable,
} from "#src/database/drizzle/schema";
import { isLegacyNpcIdIdentifier } from "#src/timers/timer-key";

export const canViewTimer = (
  access: Pick<TimersGuildAccess, "accessPolicy" | "roles">,
  timer: Pick<typeof timerTable.$inferSelect, "npc">,
) =>
  access.accessPolicy.allows(Capability.ADMIN) ||
  canViewNpcTimer(parseTimerNpc(timer.npc), access.roles);

type TimerDatabase = Pick<typeof ApiDatabase.Service, "select">;

export const timerIdentifierCondition = (
  guildId: string,
  world: string,
  timerIdentifier: string,
) =>
  isLegacyNpcIdIdentifier(timerIdentifier)
    ? and(
        eq(timerTable.guildId, guildId),
        eq(timerTable.world, world),
        eq(timerTable.npcId, Number.parseInt(timerIdentifier, 10)),
      )
    : and(
        eq(timerTable.guildId, guildId),
        eq(timerTable.world, world),
        eq(timerTable.timerKey, timerIdentifier),
      );

export const findTimerMatches = (
  database: TimerDatabase,
  guildId: string,
  world: string,
  timerIdentifier: string,
) => {
  const timerCondition = timerIdentifierCondition(
    guildId,
    world,
    timerIdentifier,
  );
  return database.select().from(timerTable).where(timerCondition);
};

export const findActiveTimerEventHeroes = (
  database: TimerDatabase,
  guildId: string,
  world: string,
  timer: typeof timerTable.$inferSelect,
  now: Date,
) => {
  return database
    .select({ id: eventHeroNpcTable.id })
    .from(eventHeroNpcTable)
    .innerJoin(eventTable, eq(eventTable.id, eventHeroNpcTable.eventId))
    .where(
      and(
        eq(eventTable.guildId, guildId),
        eq(eventTable.world, world),
        or(
          eq(eventHeroNpcTable.npcId, timer.npcId),
          eq(
            eventHeroNpcTable.npcName,
            String(timerNpcField(timer.npc, "name") ?? ""),
          ),
        ),
        or(isNull(eventTable.startsAt), lte(eventTable.startsAt, now)),
        or(isNull(eventTable.endsAt), gt(eventTable.endsAt, now)),
      ),
    )
    .limit(1);
};
