import {
  and,
  arrayOverlaps,
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
import { Effect } from "effect";
import { Capability } from "@lootlog/domain/access-policy";
import { canViewNpcTimer } from "@lootlog/domain/npc-permissions";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  memberTable,
  memberToRoleTable,
  playerSnapshotTable,
  roleTable,
  guildTable,
  timerTable,
  userSettingDocumentTable,
} from "#src/database/drizzle/schema";
import { TIMER_TYPES } from "#src/timers/constants/timer-limits";
import { Permission } from "@lootlog/schema/permissions";
import { ForbiddenException } from "#src/shared/http/http-errors";
import {
  type TimersGuildAccess,
  TimersOperationError,
} from "./timers.handlers.js";
import {
  mapTimerResponse,
  parseTimerNpc,
  type TimerProjection,
} from "./timer-response.js";

export interface TimerListCache {
  readonly get: (
    key: string,
  ) => Effect.Effect<ReadonlyArray<TimerProjection> | null, unknown>;
  readonly set: (
    key: string,
    value: ReadonlyArray<TimerProjection>,
    ttlSeconds: number,
  ) => Effect.Effect<unknown, unknown>;
}

const visibleExpiredKeys = (
  overrides: unknown,
  world: string | undefined,
): ReadonlyArray<string> => {
  if (!world || !overrides || typeof overrides !== "object") return [];
  const alwaysVisible = (overrides as Record<string, unknown>)
    .alwaysVisibleExpiredTimers;
  if (
    !alwaysVisible ||
    typeof alwaysVisible !== "object" ||
    Array.isArray(alwaysVisible)
  ) {
    return [];
  }
  const configured = (alwaysVisible as Record<string, unknown>)[world];
  return Array.isArray(configured)
    ? configured.filter((key): key is string => typeof key === "string")
    : [];
};

const readSelectedTimerKeys = (
  database: typeof ApiDatabase.Service,
  userId: string,
  world: string | undefined,
) =>
  !world
    ? Effect.succeed<ReadonlyArray<string>>([])
    : database
        .select({ overrides: userSettingDocumentTable.overrides })
        .from(userSettingDocumentTable)
        .where(
          and(
            eq(userSettingDocumentTable.userId, userId),
            eq(userSettingDocumentTable.domain, "timers"),
            eq(userSettingDocumentTable.scopeType, "USER"),
            eq(userSettingDocumentTable.scopeId, userId),
          ),
        )
        .limit(1)
        .pipe(
          Effect.map((rows) => visibleExpiredKeys(rows[0]?.overrides, world)),
        );

const readVisibleTimers = (
  database: typeof ApiDatabase.Service,
  guildIds: ReadonlyArray<string>,
  world: string | undefined,
  selectedKeys: ReadonlyArray<string>,
) => {
  const now = new Date();
  const active = and(
    isNull(timerTable.deletedAt),
    gt(timerTable.maxSpawnTime, now),
  );
  const visibility =
    selectedKeys.length === 0
      ? active
      : or(
          active,
          and(
            inArray(timerTable.timerKey, [...selectedKeys]),
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
  return database
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
};

export const makeGuildTimerList = (
  database: typeof ApiDatabase.Service,
  cache: TimerListCache,
) => {
  const operation = Effect.fn("getGuildTimersData")(function* (
    access: TimersGuildAccess,
    world?: string,
  ) {
    const cacheKey = `timer:list:${access.guild.id}:${access.userId}:${world || "all"}`;
    const cached = yield* cache.get(cacheKey);
    let timers: ReadonlyArray<TimerProjection>;
    if (cached !== null) {
      timers = cached;
    } else {
      const selectedKeys = yield* readSelectedTimerKeys(
        database,
        access.userId,
        world,
      );
      timers = yield* readVisibleTimers(
        database,
        [access.guild.id],
        world,
        selectedKeys,
      );
      yield* cache.set(cacheKey, timers, 2);
    }
    const administrative = access.accessPolicy.allows(Capability.ADMIN);
    return timers
      .filter(
        (timer) =>
          administrative ||
          canViewNpcTimer(parseTimerNpc(timer.npc), access.roles),
      )
      .map(mapTimerResponse);
  });
  return (access: TimersGuildAccess, world?: string) =>
    operation(access, world).pipe(
      Effect.mapError((cause) => new TimersOperationError({ cause })),
    );
};

export const makeAllTimerList = (database: typeof ApiDatabase.Service) => {
  const operation = Effect.fn("getAllTimersData")(function* (
    identity: { readonly userId: string; readonly discordId: string },
    world?: string,
  ) {
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
              Permission.LOOTLOG_TIMERS_READ,
            ]),
          ),
        ),
      );
    if (guildRows.length === 0) {
      return yield* Effect.fail(new ForbiddenException());
    }
    const guildIds = guildRows.map(({ guild }) => guild.id);
    const members = yield* database
      .select({ member: memberTable, role: roleTable })
      .from(memberTable)
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(
          eq(memberTable.userId, identity.discordId),
          eq(memberTable.active, true),
          inArray(memberTable.guildId, guildIds),
        ),
      );
    const rolesByGuild = new Map<
      string,
      Array<typeof roleTable.$inferSelect>
    >();
    for (const { member, role } of members) {
      if (!role) continue;
      const roles = rolesByGuild.get(member.guildId) ?? [];
      roles.push(role);
      rolesByGuild.set(member.guildId, roles);
    }
    const selectedKeys = yield* readSelectedTimerKeys(
      database,
      identity.userId,
      world,
    );
    const timers = yield* readVisibleTimers(
      database,
      guildIds,
      world,
      selectedKeys,
    );
    const ownerGuilds = new Set(
      guildRows
        .filter(({ guild }) => guild.ownerId === identity.discordId)
        .map(({ guild }) => guild.id),
    );
    return timers
      .filter(
        (timer) =>
          ownerGuilds.has(timer.guildId) ||
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
  ) =>
    operation(identity, world).pipe(
      Effect.mapError((cause) => new TimersOperationError({ cause })),
    );
};
