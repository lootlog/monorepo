import {
  and,
  arrayOverlaps,
  eq,
  inArray,
  isNotNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { Effect, Schema } from "effect";
import { Permission } from "@lootlog/schema/permissions";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  groupFightTable,
  memberTable,
  memberToRoleTable,
  roleTable,
  guildTable,
} from "#src/database/drizzle/schema";
import type { GroupFightParticipantResponse } from "#src/contracts/group-fights/schemas";

export const selectGroupFightMembers = (
  database: typeof ApiDatabase.Service,
  guildId: string,
) =>
  database
    .selectDistinct({
      id: memberTable.id,
      userId: memberTable.globalUserId,
      discordId: memberTable.userId,
      name: memberTable.name,
      avatar: memberTable.avatar,
    })
    .from(memberTable)
    .innerJoin(
      guildTable,
      and(eq(guildTable.id, guildId), eq(guildTable.active, true)),
    )
    .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
    .leftJoin(
      roleTable,
      and(
        eq(roleTable.id, memberToRoleTable.B),
        eq(roleTable.guildId, guildId),
      ),
    )
    .where(
      and(
        eq(memberTable.guildId, guildId),
        eq(memberTable.active, true),
        isNotNull(memberTable.globalUserId),
        or(
          eq(guildTable.ownerId, memberTable.userId),
          arrayOverlaps(roleTable.permissions, [
            Permission.LOOTLOG_ACCESS,
            Permission.ADMIN,
            Permission.OWNER,
          ]),
        ),
      ),
    );

/** Links only current Organization members; conflicting character claims remain unassigned. */
export const groupFightAttributionsSql = (
  database: typeof ApiDatabase.Service,
  guildId: string,
  filter: SQL | undefined,
) => sql`
  with members as (${selectGroupFightMembers(database, guildId).getSQL()}),
  fight_scope as (select id from "GroupFight" where ${and(eq(groupFightTable.guildId, guildId), filter)}),
  candidates as (
    select s."groupFightId" as fight_id, s."characterId" as character_id, m.id as member_id
    from "GroupFightSubmission" s join fight_scope f on f.id=s."groupFightId"
    join members m on m."globalUserId"=s."userId" where s."guildId"=${guildId}
    union
    select p."groupFightId", p."characterId", m.id
    from "GroupFightParticipant" p join fight_scope f on f.id=p."groupFightId"
    join "UserCharactersLootlogSettings" c on c."accountId"=p."accountId" and c."characterId"=p."characterId" and ${guildId}=any(c."catchingGuildIds")
    join members m on m."userId"=c."userId"
  ), unique_claims as (
    select fight_id, character_id, min(member_id) as member_id from candidates group by fight_id, character_id having count(distinct member_id)=1
  )
  select u.fight_id, u.character_id, m.id as member_id, m."globalUserId" as user_id, m.name, m.avatar
  from unique_claims u join members m on m.id=u.member_id
`;

export const makeGroupFightMemberLinks = (
  database: typeof ApiDatabase.Service,
) =>
  Effect.fn("group-fights.members")(function* (
    guildId: string,
    fightIds: readonly number[],
  ) {
    const links = new Map<
      string,
      NonNullable<GroupFightParticipantResponse["member"]>
    >();
    if (fightIds.length === 0) return links;
    const result = yield* database.execute(
      groupFightAttributionsSql(
        database,
        guildId,
        inArray(groupFightTable.id, [...fightIds]),
      ),
    );
    const decoded = yield* Schema.decodeUnknownEffect(
      Schema.Struct({
        rows: Schema.Array(
          Schema.Struct({
            fight_id: Schema.Number,
            character_id: Schema.String,
            member_id: Schema.Number,
            user_id: Schema.String,
            name: Schema.String,
            avatar: Schema.NullOr(Schema.String),
          }),
        ),
      }),
    )(result);
    for (const row of decoded.rows) {
      links.set(`${row.fight_id}:${row.character_id}`, {
        memberId: row.member_id,
        memberUserId: row.user_id,
        memberName: row.name,
        memberAvatar: row.avatar,
      });
    }
    return links;
  });
