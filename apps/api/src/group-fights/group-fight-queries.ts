import { and, count, desc, eq, inArray } from "drizzle-orm";
import { Effect } from "effect";
import { isGroupFightTeam } from "@lootlog/domain/group-fights";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  groupFightTable,
  groupFightParticipantTable,
  groupFightSubmissionTable,
} from "#src/database/drizzle/schema";
import type {
  GroupFightDetailResponse,
  GuildGroupFightRankingQuery,
  GuildGroupFightsQuery,
  GuildGroupFightsResponse,
} from "#src/contracts/group-fights/schemas";
import { makeGroupFightMemberLinks } from "./group-fight-member-links.js";
import {
  groupFightQueryFilter,
  makeGroupFightRanking,
} from "./group-fight-ranking.js";

export const makeGroupFightQueries = (database: typeof ApiDatabase.Service) => {
  const memberLinks = makeGroupFightMemberLinks(database);
  const load = Effect.fn("group-fights.read")(function* (
    guildId: string,
    userId: string,
    query: GuildGroupFightsQuery,
    fightId?: number,
  ) {
    const fights = yield* database
      .select()
      .from(groupFightTable)
      .where(
        and(
          groupFightQueryFilter(guildId, query),
          fightId === undefined ? undefined : eq(groupFightTable.id, fightId),
        ),
      )
      .orderBy(desc(groupFightTable.endedAt), desc(groupFightTable.id))
      .limit(fightId === undefined ? (query.limit ?? 20) : 1)
      .offset(query.cursor ?? 0);
    const ids = fights.map((f) => f.id);
    if (ids.length === 0) return [];
    const [participants, submissions, links] = yield* Effect.all(
      [
        database
          .select()
          .from(groupFightParticipantTable)
          .where(inArray(groupFightParticipantTable.groupFightId, ids)),
        database
          .select()
          .from(groupFightSubmissionTable)
          .where(
            and(
              eq(groupFightSubmissionTable.guildId, guildId),
              eq(groupFightSubmissionTable.userId, userId),
              inArray(groupFightSubmissionTable.groupFightId, ids),
            ),
          ),
        memberLinks(guildId, ids),
      ],
      { concurrency: 3 },
    );
    const details: GroupFightDetailResponse[] = [];
    for (const fight of fights) {
      if (!isGroupFightTeam(fight.ourTeam))
        return yield* Effect.fail(new Error("Invalid stored group fight team"));
      const fightParticipants: Array<
        GroupFightDetailResponse["participants"][number]
      > = [];
      for (const p of participants.filter((p) => p.groupFightId === fight.id)) {
        if (!isGroupFightTeam(p.team))
          return yield* Effect.fail(
            new Error("Invalid stored participant team"),
          );
        fightParticipants.push({
          characterId: p.characterId,
          accountId: p.accountId,
          name: p.name,
          prof: p.prof,
          lvl: p.lvl,
          icon: p.icon,
          team: p.team,
          result: p.result,
          participationSeconds: p.participationSeconds,
          fled: p.fled,
          member: links.get(`${fight.id}:${p.characterId}`) ?? null,
        });
      }
      details.push({
        id: fight.id,
        world: fight.world,
        mapId: fight.mapId,
        mapName: fight.mapName,
        startedAt: fight.startedAt.toISOString(),
        endedAt: fight.endedAt.toISOString(),
        durationSeconds: fight.durationSeconds,
        teamOneSize: fight.teamOneSize,
        teamTwoSize: fight.teamTwoSize,
        outcome: fight.outcome,
        winningTeam: isGroupFightTeam(fight.effectiveWinningTeam)
          ? fight.effectiveWinningTeam
          : null,
        ourTeam: fight.ourTeam,
        result:
          fight.effectiveWinningTeam === null
            ? "DRAW"
            : fight.effectiveWinningTeam === fight.ourTeam
              ? "WIN"
              : "LOSS",
        hasFlee: fight.hasFlee,
        memberCount: new Set(
          fightParticipants.flatMap((p) =>
            p.member ? [p.member.memberId] : [],
          ),
        ).size,
        battleIds: [
          ...new Set(
            submissions
              .filter((s) => s.groupFightId === fight.id)
              .flatMap((s) => (s.battleId ? [s.battleId] : [])),
          ),
        ],
        participants: fightParticipants,
      });
    }
    return details;
  });
  const list = Effect.fn("group-fights.list")(function* (
    guildId: string,
    userId: string,
    query: GuildGroupFightsQuery,
  ): Effect.fn.Return<GuildGroupFightsResponse, unknown> {
    const fights = yield* load(guildId, userId, query);
    const cursor = query.cursor ?? 0;
    const limit = query.limit ?? 20;
    const [aggregate] = yield* database
      .select({ total: count() })
      .from(groupFightTable)
      .where(groupFightQueryFilter(guildId, query));
    const total = aggregate?.total ?? 0;
    return {
      fights: fights.map(({ participants, ...fight }) => ({
        ...fight,
        roster: participants.map(({ name, lvl, prof, team, fled }) => ({
          name,
          lvl,
          prof,
          team,
          fled,
        })),
      })),
      pagination: { total, cursor, limit, hasNext: cursor + limit < total },
    };
  });
  return {
    list,
    ranking: (
      guildId: string,
      _userId: string,
      query: GuildGroupFightRankingQuery,
    ) => makeGroupFightRanking(database)(guildId, query),
    detail: (guildId: string, userId: string, fightId: number) =>
      load(guildId, userId, {}, fightId).pipe(
        Effect.map((fights) => fights[0] ?? null),
      ),
  };
};
