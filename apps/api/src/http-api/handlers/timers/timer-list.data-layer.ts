import {
  accessibleGuildsQuery,
  activeGuildMemberJoin,
} from "#src/members/member-access-query";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
  sql,
} from "drizzle-orm";
import { Clock, Effect } from "effect";
import { canViewTimer } from "./timer-selection.js";
import {
  canViewNpcTimer,
  type RolePermissionData,
} from "@lootlog/domain/npc-permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  timerTable,
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import { TIMER_TYPES } from "#src/timers/timer-limits";
import { Permission } from "@lootlog/schema/permissions";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import type { TimersGuildAccess } from "./timers.handlers.js";
import { toTimersDataFailure } from "./timer-errors.js";
import {
  type CachedTimerProjection,
  mapTimerResponse,
  parseTimerNpc,
} from "#src/timers/timer-projection";

export interface TimerListCache {
  readonly getOrSet: (
    key: string,
    guildId: string,
    load: Effect.Effect<ReadonlyArray<CachedTimerProjection>, unknown>,
  ) => Effect.Effect<ReadonlyArray<CachedTimerProjection>, unknown>;
}

const selectedTimerKeysQuery = (
  database: typeof ApiDatabase.Service,
  userId: string,
  world: string,
) => {
  const configured = sql`${userSettingDocumentTable.overrides}->'alwaysVisibleExpiredTimers'->${world}`;

  const selectedKey = sql`selected_timer_key.value`;
  const configuredArray = sql`CASE WHEN jsonb_typeof(${configured}) = 'array' THEN ${configured} ELSE '[]'::jsonb END`;

  return database
    .select({ key: sql<string>`${selectedKey} #>> '{}'` })
    .from(userSettingDocumentTable)
    .crossJoin(
      sql`jsonb_array_elements(${configuredArray}) AS selected_timer_key(value)`,
    )
    .where(
      and(
        eq(userSettingDocumentTable.userId, userId),
        eq(userSettingDocumentTable.domain, "timers"),
        eq(userSettingDocumentTable.scopeType, "USER"),
        eq(userSettingDocumentTable.scopeId, userId),
        sql`jsonb_typeof(${selectedKey}) = 'string'`,
      ),
    );
};

const readVisibleTimers = (
  database: typeof ApiDatabase.Service,
  guildIds: ReadonlyArray<string>,
  world: string | undefined,
  userId: string,
) =>
  Effect.gen(function* () {
    const now = new Date(yield* Clock.currentTimeMillis);

    const active = and(
      isNull(timerTable.deletedAt),
      gt(timerTable.maxSpawnTime, now),
    );

    const visibility = !world
      ? active
      : or(
          active,
          and(
            sql`${timerTable.timerKey} = ANY(ARRAY(${selectedTimerKeysQuery(database, userId, world)}))`,
            sql`COALESCE(${timerTable.npc}->>'margonemType', '0') != ${String(TIMER_TYPES.CUSTOM_MANUAL)}`,
            or(
              lte(timerTable.maxSpawnTime, now),
              isNotNull(timerTable.deletedAt),
            ),
          ),
        );

    const scope = world
      ? and(
          inArray(timerTable.guildId, [...guildIds]),
          eq(timerTable.world, world),
        )
      : inArray(timerTable.guildId, [...guildIds]);

    return yield* database
      .select({
        timer: timerTable,
        member: memberTable,
        actorCharacter: playerSnapshotTable,
      })
      .from(timerTable)
      .leftJoin(memberTable, eq(memberTable.id, timerTable.createdById))
      .leftJoin(
        playerSnapshotTable,
        eq(playerSnapshotTable.id, timerTable.actorCharacterSnapshotId),
      )
      .where(and(scope, visibility))
      .orderBy(desc(timerTable.maxSpawnTime))
      .pipe(
        Effect.map((rows) =>
          rows.map(({ timer, member, actorCharacter }) => ({
            ...timer,
            member,
            actorCharacter,
          })),
        ),
      );
  });

export const makeGuildTimerList = (
  database: typeof ApiDatabase.Service,
  cache: TimerListCache,
) => {
  const operation = Effect.fn("getGuildTimersData")(function* (
    access: TimersGuildAccess,
    world?: string,
  ) {
    const cacheKey = `timer:list:${access.guild.id}:${access.userId}:${world || "all"}`;

    const timers = yield* cache.getOrSet(
      cacheKey,
      access.guild.id,
      readVisibleTimers(database, [access.guild.id], world, access.userId),
    );

    return timers
      .filter((timer) => canViewTimer(access, timer))
      .map(mapTimerResponse);
  });

  return (access: TimersGuildAccess, world?: string) =>
    operation(access, world).pipe(Effect.mapError(toTimersDataFailure));
};

export const makeAllTimerList = (database: typeof ApiDatabase.Service) => {
  const operation = Effect.fn("getAllTimersData")(function* (
    identity: { readonly userId: string; readonly discordId: string },
    world?: string,
  ) {
    const accessible = database
      .$with("accessible_timer_guilds")
      .as(
        yield* accessibleGuildsQuery(database, identity.discordId, [
          Permission.LOOTLOG_TIMERS_READ,
          Permission.ADMIN,
        ]),
      );

    const accessRows = yield* database
      .with(accessible)
      .select({
        guildId: accessible.guild.id,
        ownerId: accessible.guild.ownerId,
        role: {
          permissions: roleTable.permissions,
          lvlRangeFrom: roleTable.lvlRangeFrom,
          lvlRangeTo: roleTable.lvlRangeTo,
        },
      })
      .from(accessible)
      .leftJoin(
        memberTable,
        activeGuildMemberJoin(identity.discordId, accessible.guild.id),
      )
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id));

    if (accessRows.length === 0) {
      return yield* Effect.fail(new PermissionDeniedError());
    }

    const rolesByGuild = new Map<string, RolePermissionData[]>();
    const administrativeGuilds = new Set<string>();

    for (const { guildId, ownerId, role } of accessRows) {
      const roles = rolesByGuild.get(guildId) ?? [];

      if (role) roles.push(role);
      rolesByGuild.set(guildId, roles);

      if (
        ownerId === identity.discordId ||
        role?.permissions.includes(Permission.ADMIN)
      ) {
        administrativeGuilds.add(guildId);
      }
    }

    const timers = yield* readVisibleTimers(
      database,
      [...rolesByGuild.keys()],
      world,
      identity.userId,
    );

    return timers
      .filter(
        (timer) =>
          administrativeGuilds.has(timer.guildId) ||
          canViewNpcTimer(
            parseTimerNpc(timer.npc),
            rolesByGuild.get(timer.guildId) ?? [],
          ),
      )
      .map(mapTimerResponse);
  });

  return (
    identity: { readonly userId: string; readonly discordId: string },
    world?: string,
  ) => operation(identity, world).pipe(Effect.mapError(toTimersDataFailure));
};
