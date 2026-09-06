import { UserFeedItem } from "@lootlog/protocol/feed";
import { createAccessPolicy, Capability } from "@lootlog/domain/access-policy";
import { Permission } from "@lootlog/schema/permissions";
import { and, eq, inArray, sql, type SQL } from "drizzle-orm";
import { Clock, Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildKillActivityTable,
  memberTable,
  guildTable,
  type roleTable,
} from "#src/database/drizzle/schema";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { hydrateMemberRoles } from "#src/members/member-role-hydration";
import { readableRoles, visibilityFilter } from "#src/kills/kill-query-support";
import { buildKillStatsCondition } from "#src/kills/kill-stats-persistence";
import { buildLootNpcVisibilitySql } from "#src/loots/loot-visibility";
import { UserFeedResponse } from "#src/contracts/users/feed-schemas";

export type FeedScope = {
  guild: typeof guildTable.$inferSelect;
  roles: ReadonlyArray<typeof roleTable.$inferSelect>;
};
const predicates = (scopes: ReadonlyArray<FeedScope>, discordId: string) => {
  const kills: SQL[] = [],
    loots: SQL[] = [];
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
    kills.push(
      sql`(${guildKillActivityTable.guildId}=${guild.id} and ${visibility ?? sql`true`})`,
    );
    loots.push(
      sql`(r."guildId"=${guild.id} ${sql.raw(buildLootNpcVisibilitySql(permissions, roles))})`,
    );
  }
  return {
    kills: kills.length ? sql.join(kills, sql` OR `) : sql`false`,
    loots: loots.length ? sql.join(loots, sql` OR `) : sql`false`,
  };
};

export const userFeedSql = (
  scopes: ReadonlyArray<FeedScope>,
  discordId: string,
  cutoff: string,
  selection?: {
    kill?: { world: string; npcId: number; minute: Date };
    lootId?: number;
  },
) => {
  const visible = predicates(scopes, discordId);
  return sql`
    with kill_groups as (
      select "guildId",world,"npcId",date_trunc('minute',"occurredAt") as minute,
        'kill:'||"guildId"||':'||world||':'||"npcId"||':'||to_char(date_trunc('minute',"occurredAt"),'YYYYMMDDHH24MI') as entry_id,
        max("occurredAt") as occurred_at,count(*)::int as count,
        (array_agg("npcName" order by "occurredAt" desc,id desc))[1] as name,
        (array_agg("npcType" order by "occurredAt" desc,id desc))[1]::text as type,
        (array_agg("npcLvl" order by "occurredAt" desc,id desc))[1] as lvl,
        (array_agg("npcIcon" order by "occurredAt" desc,id desc))[1] as icon
      from "GuildKillActivity" where "occurredAt">=${cutoff}::timestamptz at time zone 'UTC' and (${visible.kills}) and ${selection?.lootId !== undefined ? sql`false` : selection?.kill ? sql`world=${selection.kill.world} and "npcId"=${selection.kill.npcId} and "occurredAt">=${selection.kill.minute.toISOString()}::timestamptz at time zone 'UTC' and "occurredAt"<${new Date(selection.kill.minute.getTime() + 60000).toISOString()}::timestamptz at time zone 'UTC'` : sql`true`}
      group by "guildId",world,"npcId",date_trunc('minute',"occurredAt")
      order by occurred_at desc,entry_id desc limit 20
    ), visible_loots as (
      select r.id as record_id,'loot:'||r.id as entry_id,r."guildId",l.id as loot_id,l.world,r."createdAt" as occurred_at
      from "OrganizationLootRecord" r join "Loot" l on l.id=r."lootId"
      where r."archivedAt" is null and r."createdAt">=${cutoff}::timestamptz at time zone 'UTC' and (${visible.loots}) and ${selection?.kill ? sql`false` : selection?.lootId !== undefined ? sql`l.id=${selection.lootId}` : sql`true`}
      order by r."createdAt" desc,entry_id desc limit 20
    ), entries as (
      select k.occurred_at,
        json_build_object('id',k.entry_id,'version',k.count,'type','kill',
          'occurredAt',to_char(k.occurred_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'world',k.world,
          'guild',json_build_object('id',g.id,'name',g.name,'vanityUrl',g."vanityUrl"),
          'npc',json_build_object('id',k."npcId",'name',k.name,'type',k.type,'lvl',k.lvl,'icon',k.icon),'count',k.count) as item
      from kill_groups k join "Guild" g on g.id=k."guildId"
      union all
      select l.occurred_at,
        json_build_object('id',l.entry_id,'version',1,'type','loot','lootId',l.loot_id,
          'occurredAt',to_char(l.occurred_at,'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),'world',l.world,
          'guild',json_build_object('id',g.id,'name',g.name,'vanityUrl',g."vanityUrl"),
          'npc',(select json_build_object('id',n."npcId",'name',n.name,'type',n.type,'lvl',n.lvl,'icon',n.icon) from "LootNpc" ln join "NpcSnapshot" n on n.id=ln."npcSnapshotId" where ln."lootId"=l.loot_id order by n.lvl desc nulls last,n.id limit 1),
          'items',coalesce((select json_agg(i) from (select i."itemId" as id,i.name,i.icon,i.rarity from "LootItem" li join "ItemSnapshot" i on i.id=li."itemSnapshotId" where li."lootId"=l.loot_id order by li.id limit 3) i),'[]'::json),
          'additionalItemsCount',greatest(0,(select count(*) from "LootItem" li where li."lootId"=l.loot_id)-3)) as item
      from visible_loots l join "Guild" g on g.id=l."guildId"
    ) select item from entries order by occurred_at desc,item->>'id' desc limit 20`;
};

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
      userFeedSql(scopes, discordId, windowStart),
    );
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        rows: Schema.Array(Schema.Struct({ item: UserFeedItem })),
      }),
    )(result);
    return {
      generatedAt,
      windowStart,
      items: decoded.rows.map((row) => row.item),
    } satisfies UserFeedResponse;
  });

/** Publisher reads one group; gateway applies each recipient's source visibility. */
export const readPublishedFeedEntry = Effect.fn("feed.read-published-entry")(
  function* (
    database: Pick<typeof ApiDatabase.Service, "select" | "execute">,
    guildId: string,
    selection: NonNullable<Parameters<typeof userFeedSql>[3]>,
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
      userFeedSql([{ guild, roles: [] }], guild.ownerId, cutoff, selection),
    );
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        rows: Schema.Array(Schema.Struct({ item: UserFeedItem })),
      }),
    )(result);
    return decoded.rows[0]?.item;
  },
);
