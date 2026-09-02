import { Injectable } from "@nestjs/common";
import { and, desc, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";
import { Effect } from "effect";
import { ApiDatabase } from "#src/database/drizzle/database";
import { DrizzleDatabaseRuntime } from "#src/database/drizzle/runtime";
import {
  eventHeroNpcTable,
  eventTable,
  userPinnedEventTable,
} from "#src/database/drizzle/schema";

const activeEventCondition = (referenceTime: Date) =>
  and(
    or(isNull(eventTable.startsAt), lte(eventTable.startsAt, referenceTime)),
    or(isNull(eventTable.endsAt), gt(eventTable.endsAt, referenceTime)),
  );

@Injectable()
export class PinnedEventsRepository {
  constructor(private readonly databaseRuntime: DrizzleDatabaseRuntime) {}

  removeInactive(userId: string, guildId: string, referenceTime: Date) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database.delete(userPinnedEventTable).where(
          and(
            eq(userPinnedEventTable.userId, userId),
            inArray(
              userPinnedEventTable.eventId,
              database
                .select({ id: eventTable.id })
                .from(eventTable)
                .where(
                  and(
                    eq(eventTable.guildId, guildId),
                    or(
                      gt(eventTable.startsAt, referenceTime),
                      lte(eventTable.endsAt, referenceTime),
                    ),
                  ),
                ),
            ),
          ),
        ),
      ),
    );
  }

  async findActive(userId: string, guildId: string, referenceTime: Date) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            pinnedAt: userPinnedEventTable.pinnedAt,
            event: eventTable,
          })
          .from(userPinnedEventTable)
          .innerJoin(
            eventTable,
            eq(eventTable.id, userPinnedEventTable.eventId),
          )
          .where(
            and(
              eq(userPinnedEventTable.userId, userId),
              eq(eventTable.guildId, guildId),
              activeEventCondition(referenceTime),
            ),
          )
          .orderBy(desc(userPinnedEventTable.pinnedAt)),
      ),
    );
    const heroNpcs = await this.findHeroes(rows.map(({ event }) => event.id));
    return rows.map(({ event, pinnedAt }) => ({
      pinnedAt,
      event: { ...event, heroNpcs: heroNpcs.get(event.id) ?? [] },
    }));
  }

  async findEvent(eventId: string, guildId: string) {
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select()
          .from(eventTable)
          .where(
            and(eq(eventTable.id, eventId), eq(eventTable.guildId, guildId)),
          )
          .limit(1),
      ),
    );
    const event = rows[0];
    if (!event) return null;
    const heroNpcs = await this.findHeroes([event.id]);
    return { ...event, heroNpcs: heroNpcs.get(event.id) ?? [] };
  }

  remove(userId: string, eventId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(userPinnedEventTable)
          .where(
            and(
              eq(userPinnedEventTable.userId, userId),
              eq(userPinnedEventTable.eventId, eventId),
            ),
          ),
      ),
    );
  }

  async pin(userId: string, eventId: string) {
    await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .insert(userPinnedEventTable)
          .values({ userId, eventId })
          .onConflictDoNothing({
            target: [userPinnedEventTable.userId, userPinnedEventTable.eventId],
          }),
      ),
    );
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({ pinnedAt: userPinnedEventTable.pinnedAt })
          .from(userPinnedEventTable)
          .where(
            and(
              eq(userPinnedEventTable.userId, userId),
              eq(userPinnedEventTable.eventId, eventId),
            ),
          )
          .limit(1),
      ),
    );
    return rows[0] ?? null;
  }

  removeFromGuild(userId: string, guildId: string, eventId: string) {
    return this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .delete(userPinnedEventTable)
          .where(
            and(
              eq(userPinnedEventTable.userId, userId),
              eq(userPinnedEventTable.eventId, eventId),
              inArray(
                userPinnedEventTable.eventId,
                database
                  .select({ id: eventTable.id })
                  .from(eventTable)
                  .where(eq(eventTable.guildId, guildId)),
              ),
            ),
          ),
      ),
    );
  }

  private async findHeroes(eventIds: string[]) {
    if (eventIds.length === 0) {
      return new Map<
        string,
        Array<{
          id: string;
          npcId: number | null;
          npcName: string;
          npcIcon: string | null;
          npcLvl: number | null;
        }>
      >();
    }
    const rows = await this.databaseRuntime.runPromise(
      Effect.flatMap(ApiDatabase, (database) =>
        database
          .select({
            eventId: eventHeroNpcTable.eventId,
            id: eventHeroNpcTable.id,
            npcId: eventHeroNpcTable.npcId,
            npcName: eventHeroNpcTable.npcName,
            npcIcon: eventHeroNpcTable.npcIcon,
            npcLvl: eventHeroNpcTable.npcLvl,
          })
          .from(eventHeroNpcTable)
          .where(inArray(eventHeroNpcTable.eventId, eventIds)),
      ),
    );
    const byEventId = new Map<
      string,
      Omit<(typeof rows)[number], "eventId">[]
    >();
    for (const { eventId, ...hero } of rows) {
      const heroes = byEventId.get(eventId) ?? [];
      heroes.push(hero);
      byEventId.set(eventId, heroes);
    }
    return byEventId;
  }
}
