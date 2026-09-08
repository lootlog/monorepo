import { and, eq, gte, sql } from "drizzle-orm";
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
import { getGroupFightPeriodStart } from "./group-fight-period.js";
import { getGroupFightRetentionCutoff } from "./group-fight-retention.js";

export const groupFightQueryFilter = (
  guildId: string,
  query: GuildGroupFightRankingQuery,
) => {
  const since = getGroupFightPeriodStart(query.period);
  return and(
    eq(groupFightTable.guildId, guildId),
    gte(groupFightTable.endedAt, getGroupFightRetentionCutoff()),
    query.world ? eq(groupFightTable.world, query.world) : undefined,
    query.mapId === undefined
      ? undefined
      : eq(groupFightTable.mapId, query.mapId),
    query.npcType
      ? sql`exists (select 1 from jsonb_array_elements(${groupFightTable.mapNpcs}) npc where npc->>'npcType'=${query.npcType})`
      : undefined,
    since ? gte(groupFightTable.endedAt, since) : undefined,
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
    map_scope as (select * from "GroupFight" where ${groupFightQueryFilter(guildId, { ...query, mapId: undefined })}),
    map_entries as (
      select distinct f.id, f."mapId", f."mapName", npc->>'npcType' as npc_type, npc->>'name' as npc_name
      from map_scope f cross join lateral jsonb_array_elements(f."mapNpcs") npc
      where f."mapId" is not null and (${query.npcType ?? null}::text is null or npc->>'npcType'=${query.npcType ?? null})
    ),
    map_fights as (
      select distinct e.id, e."mapId", e."mapName", e.npc_type, f."effectiveWinningTeam", f."ourTeam", f."durationSeconds"
      from map_entries e join map_scope f on f.id=e.id
    ),
    map_summaries as (
      select jsonb_build_object('mapId', m."mapId", 'mapName', m."mapName", 'npcType', m.npc_type,
        'npcNames', (select jsonb_agg(distinct e.npc_name order by e.npc_name) from map_entries e where e."mapId"=m."mapId" and e."mapName"=m."mapName" and e.npc_type=m.npc_type),
        'totalFights', count(*), 'wins', count(*) filter(where "effectiveWinningTeam"="ourTeam"),
        'losses', count(*) filter(where "effectiveWinningTeam"<>"ourTeam"), 'draws', count(*) filter(where "effectiveWinningTeam" is null),
        'totalDurationSeconds', sum("durationSeconds")) as value,
        count(*) as fights, m."mapName" as name, m."mapId" as id, m.npc_type
      from map_fights m group by m."mapId", m."mapName", m.npc_type
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
        'memberId', m.id, 'memberUserId', m."globalUserId", 'memberName', m.name, 'memberAvatar', m.avatar,
        'fights', count(*), 'wins', count(*) filter(where mf.result='WIN'),
        'losses', count(*) filter(where mf.result='LOSS'), 'draws', count(*) filter(where mf.result='DRAW'),
        'flees', count(*) filter(where mf.fled), 'totalSeconds', sum(mf.seconds),
        'winRate', 100.0 * count(*) filter(where mf.result='WIN') / count(*),
        'lastFightAt', to_char(max(mf.ended_at), 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
        'characters', (select jsonb_agg(jsonb_build_object('characterId', c."characterId", 'name', c.name, 'prof', c.prof, 'lvl', c.lvl, 'icon', c.icon, 'world', c.world, 'fights', c.fights, 'wins', c.wins, 'losses', c.losses, 'draws', c.draws, 'flees', c.flees, 'totalSeconds', c.seconds) order by c.world, c.name) from character_stats c where c.member_id = m.id)
      ) as value, count(*) filter(where mf.result='WIN') as wins, count(*) as fights
      from members m join member_fights mf on mf.member_id = m.id group by m.id, m."globalUserId", m.name, m.avatar
    )
    select jsonb_build_object(
      'maps', coalesce((select jsonb_agg(value order by fights desc, name, id, npc_type) from map_summaries), '[]'::jsonb),
      'summary', (select jsonb_build_object('totalFights', count(*),
        'wins', count(*) filter(where "effectiveWinningTeam" = "ourTeam"),
        'losses', count(*) filter(where "effectiveWinningTeam" <> "ourTeam"),
        'draws', count(*) filter(where "effectiveWinningTeam" is null),
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
