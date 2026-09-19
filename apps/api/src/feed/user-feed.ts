import { makeLootQueryPersistence } from "#src/loots/query/loot-query.persistence";
import { UserFeedItem } from "@lootlog/protocol/feed";
import { createAccessPolicy, Capability } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/pg-core";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildKillActivityTable,
  lootTable,
  organizationLootRecordTable,
  lootNpcTable,
  npcSnapshotTable,
  lootItemTable,
  itemSnapshotTable,
  memberTable,
  guildTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { readableRoles, visibilityFilter } from "#src/kills/kill-query-support";
import { buildKillStatsCondition } from "#src/kills/kill-stats-persistence";
import { buildLootNpcVisibilityCondition } from "#src/loots/loot-visibility";
import { UserFeedResponse } from "#src/contracts/users/feed-schemas";

export type FeedScope = {
  guild: typeof guildTable.$inferSelect;
  roles: ReadonlyArray<typeof roleTable.$inferSelect>;
};

const predicates = (scopes: ReadonlyArray<FeedScope>, discordId: string) => {
  const kills: Array<SQL | undefined> = [],
    loots: Array<SQL | undefined> = [];

  for (const { guild, roles } of scopes) {
    const permissions =
      guild.ownerId === discordId
        ? [Permission.OWNER]
        : roles.flatMap((role) => role.permissions);

    const policy = createAccessPolicy({ capabilities: permissions });

    if (!policy.allows(Capability.LOOTLOG_LOOTS_READ)) continue;

    const visibility = buildKillStatsCondition(
      guildKillActivityTable,
      visibilityFilter(policy, readableRoles(roles)),
    );

    kills.push(and(eq(guildKillActivityTable.guildId, guild.id), visibility));
    loots.push(
      and(
        eq(organizationLootRecordTable.guildId, guild.id),
        buildLootNpcVisibilityCondition(lootTable.id, permissions, roles),
      ),
    );
  }

  return {
    kills: or(...kills) ?? sql`false`,
    loots: or(...loots) ?? sql`false`,
  };
};

export const buildUserFeedQuery = (
  scopes: ReadonlyArray<FeedScope>,
  discordId: string,
  cutoff: string,
  selection?: {
    kill?: { world: string; npcId: number; minute: Date };
    lootId?: number;
  },
) => {
  const query = new QueryBuilder();
  const visible = predicates(scopes, discordId);
  const activity = guildKillActivityTable;
  const record = organizationLootRecordTable;
  const minute = sql`date_trunc('minute', ${activity.occurredAt})`;
  const cutoffTimestamp = sql`${cutoff}::timestamptz at time zone 'UTC'`;
  let killSelection: SQL | undefined;
  let lootSelection: SQL | undefined;

  if (selection?.kill) {
    killSelection = and(
      eq(activity.world, selection.kill.world),
      eq(activity.npcId, selection.kill.npcId),
      gte(
        activity.occurredAt,
        sql`${selection.kill.minute.toISOString()}::timestamptz at time zone 'UTC'`,
      ),
      lt(
        activity.occurredAt,
        sql`${new Date(selection.kill.minute.getTime() + 60000).toISOString()}::timestamptz at time zone 'UTC'`,
      ),
    );
    lootSelection = sql`false`;
  }

  if (selection?.lootId !== undefined) {
    killSelection = sql`false`;

    if (!selection.kill) lootSelection = eq(lootTable.id, selection.lootId);
  }

  // Kill creation assigns occurredAt once before Organization fanout. Hash the
  // complete timestamp multiset so distinct kills in one minute stay separate.
  const kills = query.$with("kill_groups").as(
    query
      .select({
        guildId: activity.guildId,
        world: activity.world,
        npcId: activity.npcId,
        minute: minute.as("minute"),
        entryId:
          sql`'kill:' || ${activity.guildId} || ':' || ${activity.world} || ':' || ${activity.npcId} || ':' || to_char(${minute}, 'YYYYMMDDHH24MI')`.as(
            "entry_id",
          ),
        occurredAt: sql`max(${activity.occurredAt})`.as("occurred_at"),
        count: sql`count(*)::int`.as("count"),
        groupKey:
          sql`'kill:' || ${activity.world} || ':' || ${activity.npcId} || ':' || md5(string_agg(to_char(${activity.occurredAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS'), ',' order by ${activity.occurredAt}))`.as(
            "group_key",
          ),
        name: sql`(array_agg(${activity.npcName} order by ${activity.occurredAt} desc, ${activity.id} desc))[1]`.as(
          "name",
        ),
        type: sql`(array_agg(${activity.npcType} order by ${activity.occurredAt} desc, ${activity.id} desc))[1]::text`.as(
          "type",
        ),
        lvl: sql`(array_agg(${activity.npcLvl} order by ${activity.occurredAt} desc, ${activity.id} desc))[1]`.as(
          "lvl",
        ),
        icon: sql`(array_agg(${activity.npcIcon} order by ${activity.occurredAt} desc, ${activity.id} desc))[1]`.as(
          "icon",
        ),
        prof: sql`(array_agg(${activity.npcProf} order by ${activity.occurredAt} desc, ${activity.id} desc))[1]`.as(
          "prof",
        ),
      })
      .from(activity)
      .where(
        and(
          gte(activity.occurredAt, cutoffTimestamp),
          visible.kills,
          killSelection,
        ),
      )
      .groupBy(activity.guildId, activity.world, activity.npcId, minute)
      .orderBy(({ occurredAt, entryId }) => [desc(occurredAt), desc(entryId)]),
  );

  const loots = query.$with("visible_loots").as(
    query
      .select({
        recordId: record.id,
        entryId: sql`'loot:' || ${record.id}`.as("entry_id"),
        guildId: record.guildId,
        lootId: sql`${lootTable.id}`.as("loot_id"),
        world: lootTable.world,
        occurredAt: sql`${record.createdAt}`.as("occurred_at"),
      })
      .from(record)
      .innerJoin(lootTable, eq(lootTable.id, record.lootId))
      .where(
        and(
          isNull(record.archivedAt),
          gte(record.createdAt, cutoffTimestamp),
          visible.loots,
          lootSelection,
        ),
      )
      .orderBy(({ occurredAt, entryId }) => [desc(occurredAt), desc(entryId)]),
  );

  const candidates = query.$with("group_candidates").as(
    query
      .select({ groupKey: kills.groupKey, occurredAt: kills.occurredAt })
      .from(kills)
      .unionAll(
        query
          .select({
            groupKey: sql`'loot:' || ${loots.lootId}`.as("group_key"),
            occurredAt: loots.occurredAt,
          })
          .from(loots),
      ),
  );

  const selected = query.$with("selected_groups").as(
    query
      .select({
        groupKey: candidates.groupKey,
        occurredAt: sql`max(${candidates.occurredAt})`.as("occurred_at"),
      })
      .from(candidates)
      .groupBy(candidates.groupKey)
      .orderBy(({ occurredAt, groupKey }) => [desc(occurredAt), desc(groupKey)])
      .limit(20),
  );

  const npc = query
    .select({
      value: sql`json_build_object('id', ${npcSnapshotTable.npcId}, 'name', ${npcSnapshotTable.name}, 'type', ${npcSnapshotTable.type}, 'lvl', ${npcSnapshotTable.lvl}, 'icon', ${npcSnapshotTable.icon}, 'prof', ${npcSnapshotTable.prof})`,
    })
    .from(lootNpcTable)
    .innerJoin(
      npcSnapshotTable,
      eq(npcSnapshotTable.id, lootNpcTable.npcSnapshotId),
    )
    .where(eq(lootNpcTable.lootId, loots.lootId))
    .orderBy(sql`${npcSnapshotTable.lvl} desc nulls last`, npcSnapshotTable.id)
    .limit(1);

  const previewItems = query
    .select({
      id: sql`${itemSnapshotTable.itemId}`.as("id"),
      name: itemSnapshotTable.name,
      icon: itemSnapshotTable.icon,
      rarity: itemSnapshotTable.rarity,
      stat: sql`${itemSnapshotTable.statRaw}`.as("stat"),
      type: sql`${itemSnapshotTable.itemType}`.as("type"),
      lvl: itemSnapshotTable.lvl,
    })
    .from(lootItemTable)
    .innerJoin(
      itemSnapshotTable,
      eq(itemSnapshotTable.id, lootItemTable.itemSnapshotId),
    )
    .where(eq(lootItemTable.lootId, loots.lootId))
    .orderBy(lootItemTable.id)
    .limit(3)
    .as("i");

  const items = query
    .select({ value: sql`json_agg(${sql.identifier("i")})` })
    .from(previewItems);

  const itemCount = query
    .select({ count: sql`count(*)` })
    .from(lootItemTable)
    .where(eq(lootItemTable.lootId, loots.lootId));

  const guild = sql`json_build_object('id', ${guildTable.id}, 'name', ${guildTable.name}, 'vanityUrl', ${guildTable.vanityUrl})`;

  const entries = query.$with("entries").as(
    query
      .select({
        occurredAt: kills.occurredAt,
        item: sql`json_build_object('id', ${kills.entryId}, 'groupKey', ${kills.groupKey}, 'version', ${kills.count}, 'type', 'kill',
        'occurredAt', to_char(${kills.occurredAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'world', ${kills.world},
        'guild', ${guild}, 'npc', json_build_object('id', ${kills.npcId}, 'name', ${kills.name}, 'type', ${kills.type}, 'lvl', ${kills.lvl}, 'icon', ${kills.icon}, 'prof', ${kills.prof}), 'count', ${kills.count})`.as(
          "item",
        ),
      })
      .from(kills)
      .innerJoin(selected, eq(selected.groupKey, kills.groupKey))
      .innerJoin(guildTable, eq(guildTable.id, kills.guildId))
      .unionAll(
        query
          .select({
            occurredAt: loots.occurredAt,
            item: sql`json_build_object('id', ${loots.entryId}, 'groupKey', 'loot:' || ${loots.lootId}, 'version', 1, 'type', 'loot', 'lootId', ${loots.lootId},
          'occurredAt', to_char(${loots.occurredAt}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), 'world', ${loots.world},
          'guild', ${guild}, 'npc', (${npc}), 'items', coalesce((${items}), '[]'::json),
          'additionalItemsCount', greatest(0, (${itemCount}) - 3))`.as("item"),
          })
          .from(loots)
          .innerJoin(
            selected,
            eq(selected.groupKey, sql`'loot:' || ${loots.lootId}`),
          )
          .innerJoin(guildTable, eq(guildTable.id, loots.guildId)),
      ),
  );

  return query
    .with(kills, loots, candidates, selected, entries)
    .select({ item: entries.item })
    .from(entries)
    .orderBy(desc(entries.occurredAt), desc(sql`${entries.item}->>'id'`));
};

const enrichFeedLoots = Effect.fn("feed.enrich-loots")(function* (
  database: Pick<typeof ApiDatabase.Service, "select">,
  items: ReadonlyArray<UserFeedItem>,
) {
  const ids = [
    ...new Set(
      items.flatMap((item) => (item.type === "loot" ? [item.lootId] : [])),
    ),
  ];

  const summaries =
    yield* makeLootQueryPersistence(database).readVisibleSummaries(ids);

  return items.map((item): UserFeedItem => {
    if (item.type !== "loot") return item;
    const summary = summaries.get(item.lootId);

    return summary ? { ...item, summary } : item;
  });
});

export const makeUserFeed = (database: typeof ApiDatabase.Service) =>
  Effect.fn("users.feed")(function* (discordId: string) {
    const now = yield* Clock.currentTimeMillis;

    const generatedAt = new Date(now).toISOString(),
      windowStart = new Date(now - 86400000).toISOString();

    const guilds = yield* selectAccessibleGuilds(database, discordId);

    if (!guilds.length)
      return { generatedAt, windowStart, items: [] } satisfies UserFeedResponse;

    const members = yield* database
      .select()
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, discordId),
          eq(memberTable.active, true),
          inArray(
            memberTable.guildId,
            guilds.map(({ guild }) => guild.id),
          ),
        ),
      );

    const hydrated = yield* hydrateMemberRoles(database, members);

    const scopes = guilds.map(({ guild }) => ({
      guild,
      roles:
        hydrated.find((member) => member.guildId === guild.id)?.roles ?? [],
    }));

    const result = yield* database.execute(
      buildUserFeedQuery(scopes, discordId, windowStart),
    );

    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        rows: Schema.Array(Schema.Struct({ item: UserFeedItem })),
      }),
    )(result);

    return {
      generatedAt,
      windowStart,
      items: yield* enrichFeedLoots(
        database,
        decoded.rows.map((row) => row.item),
      ),
    } satisfies UserFeedResponse;
  });

/** Publisher reads one group; gateway applies each recipient's source visibility. */
export const readPublishedFeedEntry = Effect.fn("feed.read-published-entry")(
  function* (
    database: Pick<typeof ApiDatabase.Service, "select" | "execute">,
    guildId: string,
    selection: NonNullable<Parameters<typeof buildUserFeedQuery>[3]>,
  ) {
    const [guild] = yield* database
      .select()
      .from(guildTable)
      .where(eq(guildTable.id, guildId));

    if (!guild) return undefined;

    const cutoff = new Date(
      (yield* Clock.currentTimeMillis) - 86400000,
    ).toISOString();

    const result = yield* database.execute(
      buildUserFeedQuery(
        [{ guild, roles: [] }],
        guild.ownerId,
        cutoff,
        selection,
      ),
    );

    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        rows: Schema.Array(Schema.Struct({ item: UserFeedItem })),
      }),
    )(result);

    return (yield* enrichFeedLoots(
      database,
      decoded.rows.map((row) => row.item),
    ))[0];
  },
);
