import { and, eq, inArray, or } from "drizzle-orm";
import { Effect } from "effect";
import type { ApiDatabase } from "#src/database/drizzle/database";
import { memberTable } from "#src/database/drizzle/organization.schema";

/**
 * The actor keys records store: the Discord id older records keep, or the
 * internal User id new contracts use.
 */
export type ActorKeys = {
  readonly discordIds?: Iterable<string>;
  readonly userIds?: Iterable<string>;
};

export type MemberNames = {
  readonly byDiscordId: ReadonlyMap<string, string>;
  readonly byUserId: ReadonlyMap<string, string>;
};

/** The Organization's name of every acting member, by the key it was stored under. */
export const findMemberNames = (
  database: Pick<typeof ApiDatabase.Service, "select">,
  guildId: string,
  actors: ActorKeys,
) => {
  const discordIds = [...new Set(actors.discordIds)];
  const userIds = [...new Set(actors.userIds)];

  if (discordIds.length === 0 && userIds.length === 0)
    return Effect.succeed<MemberNames>({
      byDiscordId: new Map(),
      byUserId: new Map(),
    });

  return database
    .select({
      discordId: memberTable.userId,
      userId: memberTable.globalUserId,
      name: memberTable.name,
    })
    .from(memberTable)
    .where(
      and(
        eq(memberTable.guildId, guildId),
        or(
          discordIds.length > 0
            ? inArray(memberTable.userId, discordIds)
            : undefined,
          userIds.length > 0
            ? inArray(memberTable.globalUserId, userIds)
            : undefined,
        ),
      ),
    )
    .pipe(
      Effect.map((members): MemberNames => ({
        byDiscordId: new Map(
          members.map((member) => [member.discordId, member.name]),
        ),
        byUserId: new Map(
          members.flatMap((member) =>
            member.userId ? [[member.userId, member.name] as const] : [],
          ),
        ),
      })),
    );
};
