import { expect, it } from "bun:test";
import { Effect } from "effect";
import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { makeAllTimerList } from "./timer-list.data-layer.js";

it.each([Permission.ADMIN, Permission.LOOTLOG_TIMERS_READ])(
  "applies all-organization timer visibility for %s",
  async (permission) => {
    let organizationCondition: SQL | undefined;
    const guild = { id: "organization", ownerId: "other-user" };
    const role = {
      permissions: [permission],
      lvlRangeFrom: 200,
      lvlRangeTo: 500,
    };
    const timer = {
      guildId: guild.id,
      npcId: 105,
      timerKey: "105:npc",
      world: "world",
      npc: { id: 105, lvl: 105, type: "HERO", name: "NPC" },
      minSpawnTime: new Date(),
      maxSpawnTime: new Date(Date.now() + 60_000),
      wasReset: false,
      actorCharacterLvl: null,
      deletedAt: null,
      updatedAt: new Date(),
    };
    const query = (rows: unknown[], capture = false) => {
      const result = Object.assign(Effect.succeed(rows), {
        from: () => result,
        leftJoin: () => result,
        where: (condition: SQL) => {
          if (capture) organizationCondition = condition;
          return result;
        },
        orderBy: () => result,
      });
      return result;
    };
    // Model the external database result sets while exercising the actual
    // authorization SQL construction and timer response filtering.
    const database = {
      selectDistinct: () => query([{ guild }], true),
      select: (selection: { timer?: unknown }) =>
        query(
          selection.timer
            ? [{ timer, member: null, actorCharacter: null }]
            : [{ member: { guildId: guild.id }, role }],
        ),
    } as unknown as typeof ApiDatabase.Service;
    const timers = await Effect.runPromise(
      makeAllTimerList(database)({
        userId: "user",
        discordId: "discord",
      }),
    );
    expect(timers.map((entry) => entry.npcId)).toEqual(
      permission === Permission.ADMIN ? [105] : [],
    );
    if (!organizationCondition)
      throw new Error("Missing organization predicate");
    const parameters = new PgDialect().sqlToQuery(organizationCondition).params;
    const permissionParameter = parameters.find(Array.isArray);
    expect(permissionParameter).toContain(permission);
  },
);
