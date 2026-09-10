import { Effect } from "effect";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { Permission } from "@lootlog/schema/permissions";
import { getNpcRoutingTier } from "@lootlog/domain/npc-routing";
import {
  canManageOwnPartyGathering,
  hasRolePermissionInLevelRange,
  NPC_FEATURE_PERMISSIONS,
} from "@lootlog/domain/npc-permissions";
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
      .leftJoin(
        memberTable,
        and(
          eq(memberTable.guildId, guildTable.id),
          eq(memberTable.userId, discordId),
          eq(memberTable.active, true),
          isNotNull(memberTable.globalUserId),
        ),
      )
      .leftJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
      .leftJoin(roleTable, eq(memberToRoleTable.B, roleTable.id))
      .where(
        and(inArray(guildTable.id, [...guildIds]), eq(guildTable.active, true)),
      );
    return (room: ReadyRoomAggregate): string[] =>
      room.guildIds.filter((guildId) => {
        const matching = rows.filter((row) => row.guild.id === guildId);
        const roles = matching.flatMap(({ role }) => (role ? [role] : []));
        if (
          matching.some(({ guild }) => guild.ownerId === discordId) ||
          roles.some((role) => role.permissions.includes(Permission.ADMIN)) ||
          canManageOwnPartyGathering(roles, room.organizerDiscordId, discordId)
        )
          return true;
        const base = NPC_FEATURE_PERMISSIONS.chat.base;
        if (!roles.some((role) => role.permissions.includes(base)))
          return false;
        return (
          !room.npc ||
          hasRolePermissionInLevelRange(
            roles,
            NPC_FEATURE_PERMISSIONS.chat[getNpcRoutingTier(room.npc)],
            room.npc.lvl,
          )
        );
      });
  },
);
