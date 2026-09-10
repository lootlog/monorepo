import { and, eq, gte, lt, sql } from "drizzle-orm";
import { Effect, Schema } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { groupFightTable } from "#src/database/drizzle/schema";
import {
  GuildGroupFightRankingResponse,
  type GuildGroupFightRankingQuery,
} from "#src/contracts/group-fights/schemas";
import {
  groupFightAttributionsSql,
  selectGroupFightMembers,
} from "./group-fight-member-links.js";
import {
  getGroupFightDayRange,
  getGroupFightPeriodStart,
} from "./group-fight-period.js";
import { getGroupFightRetentionCutoff } from "./group-fight-retention.js";

export const groupFightQueryFilter = (
  guildId: string,
  query: GuildGroupFightRankingQuery & { readonly day?: string },
) => {
  const since = getGroupFightPeriodStart(query.period);
  const day = getGroupFightDayRange(query.day);
  return and(
    eq(groupFightTable.guildId, guildId),
    gte(groupFightTable.endedAt, getGroupFightRetentionCutoff()),
    query.world ? eq(groupFightTable.world, query.world) : undefined,
    query.npcName === undefined
      ? undefined
      : sql`exists (select 1 from jsonb_array_elements(${groupFightTable.mapNpcs}) npc where npc->>'name'=${query.npcName})`,
    query.npcType
      ? sql`exists (select 1 from jsonb_array_elements(${groupFightTable.mapNpcs}) npc where npc->>'npcType'=${query.npcType})`
      : undefined,
    since ? gte(groupFightTable.endedAt, since) : undefined,
    day ? gte(groupFightTable.endedAt, day.from) : undefined,
    day ? lt(groupFightTable.endedAt, day.to) : undefined,
  );
};

/** PostgreSQL aggregates history; application memory grows with members and characters. */
export const makeGroupFightRanking = (database: typeof ApiDatabase.Service) =>
  Effect.fn("group-fights.ranking")(function* (
    guildId: string,
    query: GuildGroupFightRankingQuery,
  ) {
    const visible = selectGroupFightMembers(database, guildId).getSQL();
    const result = yield* database.execute(sql`
    with fights as (select * from "GroupFight" where ${groupFightQueryFilter(guildId, query)}),
    npc_scope as (select * from "GroupFight" where ${groupFightQueryFilter(guildId, { ...query, npcName: undefined })}),
    npc_entries as (
      select distinct f.id, f."mapId", f."mapName", npc->>'npcType' as npc_type, npc->>'name' as npc_name,
        nullif(npc->>'lvl','')::numeric as npc_lvl, nullif(npc->>'icon','') as npc_icon
      from npc_scope f cross join lateral jsonb_array_elements(f."mapNpcs") npc
      where (${query.npcType ?? null}::text is null or npc->>'npcType'=${query.npcType ?? null})
    ),
    npc_fights as (
      select distinct e.id, e."mapId", e."mapName", e.npc_type, e.npc_name, e.npc_lvl, e.npc_icon,
        f."effectiveWinningTeam", f."ourTeam", f."durationSeconds", f."hasFlee"
      from npc_entries e join npc_scope f on f.id=e.id
    ),
    npc_summaries as (
      select jsonb_build_object('name', n.npc_name, 'npcType', n.npc_type,
        'lvl', max(n.npc_lvl), 'icon', max(n.npc_icon), 'mapId', n."mapId", 'mapName', n."mapName",
        'totalFights', count(*), 'wins', count(*) filter(where "effectiveWinningTeam"="ourTeam"),
        'losses', count(*) filter(where "effectiveWinningTeam"<>"ourTeam"), 'draws', count(*) filter(where "effectiveWinningTeam" is null),
        'flees', count(*) filter(where "hasFlee"),
        'totalDurationSeconds', sum("durationSeconds")) as value,
        count(*) as fights, n.npc_name as name, n."mapId" as id, n.npc_type
      from npc_fights n group by n.npc_name, n.npc_type, n."mapId", n."mapName"
    ),
    members as (${visible}),
    attributions as (${groupFightAttributionsSql(database, guildId, groupFightQueryFilter(guildId, query))}),
    participation as (
      select m.id as member_id, p.*, f.world, f."endedAt"
      from attributions a join members m on m.id = a.member_id
      join "GroupFightParticipant" p on p."groupFightId" = a.fight_id and p."characterId" = a.character_id
      join fights f on f.id = p."groupFightId"
    ),
    member_fights as (
      select member_id, "groupFightId", max("endedAt") as ended_at,
        case when bool_and(result = 'WIN') then 'WIN'
          when bool_and(result in ('LOSS', 'FLEE')) then 'LOSS' else 'DRAW' end as result,
        bool_or(fled) as fled, sum("participationSeconds") as seconds
      from participation group by member_id, "groupFightId"
    ),
    character_stats as (
      select member_id, "characterId", world, count(*) as fights,
        count(*) filter(where result='WIN') as wins,
        count(*) filter(where result in ('LOSS','FLEE')) as losses,
        count(*) filter(where result='DRAW') as draws,
        count(*) filter(where fled) as flees, sum("participationSeconds") as seconds,
        (array_agg(name order by "endedAt" desc))[1] as name,
        (array_agg(prof order by "endedAt" desc))[1] as prof,
        (array_agg(lvl order by "endedAt" desc))[1] as lvl,
        (array_agg(icon order by "endedAt" desc))[1] as icon
      from participation group by member_id, "characterId", world
    ),
    rankings as (
      select m.id, m.name, jsonb_build_object(
        'memberId', m.id, 'memberUserId', m."globalUserId", 'memberDiscordId', m."userId", 'memberName', m.name, 'memberAvatar', m.avatar,
        'fights', count(*), 'wins', count(*) filter(where mf.result='WIN'),
        'losses', count(*) filter(where mf.result='LOSS'), 'draws', count(*) filter(where mf.result='DRAW'),
        'flees', count(*) filter(where mf.fled), 'totalSeconds', sum(mf.seconds),
        'winRate', 100.0 * count(*) filter(where mf.result='WIN') / count(*),
        'lastFightAt', to_char(max(mf.ended_at), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'characters', (select jsonb_agg(jsonb_build_object('characterId', c."characterId", 'name', c.name, 'prof', c.prof, 'lvl', c.lvl, 'icon', c.icon, 'world', c.world, 'fights', c.fights, 'wins', c.wins, 'losses', c.losses, 'draws', c.draws, 'flees', c.flees, 'totalSeconds', c.seconds) order by c.world, c.name) from character_stats c where c.member_id = m.id)
      ) as value, count(*) filter(where mf.result='WIN') as wins, count(*) as fights
      from members m join member_fights mf on mf.member_id = m.id group by m.id, m."globalUserId", m."userId", m.name, m.avatar
    )
    select jsonb_build_object(
      'npcs', coalesce((select jsonb_agg(value order by fights desc, name, id, npc_type) from npc_summaries), '[]'::jsonb),
      'summary', (select jsonb_build_object('totalFights', count(*),
        'wins', count(*) filter(where "effectiveWinningTeam" = "ourTeam"),
        'losses', count(*) filter(where "effectiveWinningTeam" <> "ourTeam"),
        'draws', count(*) filter(where "effectiveWinningTeam" is null),
        'flees', count(*) filter(where "hasFlee"),
        'fullTeamFights', count(*) filter(where "teamOneSize"=10 and "teamTwoSize"=10),
        'totalDurationSeconds', coalesce(sum("durationSeconds"),0)) from fights),
      'ranking', coalesce((select jsonb_agg(value order by wins desc, fights desc, name, id) from rankings), '[]'::jsonb)
    ) as payload
  `);
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        rows: Schema.Array(
          Schema.Struct({ payload: GuildGroupFightRankingResponse }),
        ),
      }),
    )(result);
    const row = decoded.rows[0];
    if (!row)
      return yield* Effect.fail(
        new Error("Missing group fight ranking aggregate"),
      );
    return row.payload;
  });
