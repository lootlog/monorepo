import { Effect } from "effect";
import { and, eq, inArray } from "drizzle-orm";
import {
  createAccessPolicy,
  AccessRequirement,
  memberCapabilities,
} from "@lootlog/domain/access-policy";
import { canManageOwnPartyGathering } from "@lootlog/domain/npc-permissions";
import { canReadChatNpcSource } from "#src/chat/chat-npc-visibility";
import { activeGuildMemberJoin } from "#src/members/member-access-query";
import type { ApiDatabase } from "#src/database/drizzle/database";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import type { ReadyRoomAggregate } from "#src/messaging/ready-room/ready-room.types";

export const readyRoomSourceVisibility = Effect.fn("readyRoomSourceVisibility")(
  function* (
    database: typeof ApiDatabase.Service,
    discordId: string,
    guildIds: ReadonlyArray<string>,
  ) {
    if (guildIds.length === 0)
      return (_room: ReadyRoomAggregate): string[] => [];

    const rows = yield* database
      .select({ guild: guildTable, role: roleTable })
      .from(guildTable)
      .leftJoin(memberTable, activeGuildMemberJoin(discordId))
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(inArray(guildTable.id, [...guildIds]), eq(guildTable.active, true)),
      );

    return (room: ReadyRoomAggregate): string[] =>
      room.guildIds.filter((guildId) => {
        const matching = rows.filter((row) => row.guild.id === guildId);
        const roles = matching.flatMap(({ role }) => (role ? [role] : []));
        const guild = matching[0]?.guild;

        if (
          (guild &&
            createAccessPolicy({
              capabilities: memberCapabilities({
                ownerId: guild.ownerId,
                viewerId: discordId,
                roles,
              }),
            }).allowsAny(AccessRequirement.ADMINISTER)) ||
          canManageOwnPartyGathering(roles, room.organizerDiscordId, discordId)
        )
          return true;

        return canReadChatNpcSource(roles, room.npc);
      });
  },
);
