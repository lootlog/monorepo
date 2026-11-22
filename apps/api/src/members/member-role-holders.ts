import { and, eq } from "drizzle-orm";
import type { ApiDatabaseValue } from "#src/database/drizzle/database";
import {
  memberTable,
  memberToRoleTable,
} from "#src/database/drizzle/organization.schema";

export const selectActiveRoleHolders = (
  database: Pick<ApiDatabaseValue, "select">,
  guildId: string,
  roleId: string,
) =>
  database
    .select({
      id: memberTable.id,
      discordId: memberTable.userId,
      userId: memberTable.globalUserId,
    })
    .from(memberTable)
    .innerJoin(memberToRoleTable, eq(memberToRoleTable.A, memberTable.id))
    .where(
      and(
        eq(memberTable.guildId, guildId),
        eq(memberTable.active, true),
        eq(memberToRoleTable.B, roleId),
      ),
    );
