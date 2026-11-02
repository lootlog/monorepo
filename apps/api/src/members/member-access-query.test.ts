import { expect, test } from "bun:test";
import { Permission } from "@lootlog/schema/permissions";
import { createDatabaseBoundary } from "../../test/database-fixtures.js";
import {
  createGuildFixture,
  createMemberFixture,
} from "../../test/organization-fixtures.js";
import {
  guildTable,
  memberTable,
  memberToRoleTable,
  roleTable,
} from "#src/database/drizzle/schema";
import {
  selectAccessibleGuilds,
  selectGuildIdsGrantingPermissions,
} from "./member-access-query.js";

test("role grants match the Organization access policy for OWNER and ADMIN roles", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const guilds = [
      createGuildFixture({ id: "admin-guild" }),
      createGuildFixture({ id: "owner-role-guild" }),
      createGuildFixture({ id: "access-guild" }),
    ];

    await boundary.run(boundary.database.insert(guildTable).values(guilds));
    await boundary.run(
      boundary.database.insert(memberTable).values(
        guilds.map((guild, index) =>
          createMemberFixture({
            id: index + 1,
            userId: "discord-1",
            globalUserId: "user-1",
            guildId: guild.id,
          }),
        ),
      ),
    );
    await boundary.run(
      boundary.database.insert(roleTable).values([
        {
          id: "admin",
          guildId: "admin-guild",
          name: "Admin",
          permissions: [Permission.ADMIN],
          updatedAt: new Date(0),
        },
        {
          id: "owner",
          guildId: "owner-role-guild",
          name: "Owner",
          permissions: [Permission.OWNER],
          updatedAt: new Date(0),
        },
        {
          id: "access",
          guildId: "access-guild",
          name: "Access",
          permissions: [Permission.LOOTLOG_ACCESS],
          updatedAt: new Date(0),
        },
      ]),
    );
    await boundary.run(
      boundary.database.insert(memberToRoleTable).values([
        { A: 1, B: "admin" },
        { A: 2, B: "owner" },
        { A: 3, B: "access" },
      ]),
    );

    const accessible = (permissions: Permission[]) =>
      boundary
        .run(
          selectAccessibleGuilds(boundary.database, "discord-1", permissions),
        )
        .then((rows) => rows.map(({ guild }) => guild.id).toSorted());

    expect(await accessible([Permission.LOOTLOG_TIMERS_WRITE])).toEqual([
      "admin-guild",
      "owner-role-guild",
    ]);
    expect(await accessible([Permission.LOOTLOG_ACCESS])).toEqual([
      "access-guild",
      "admin-guild",
      "owner-role-guild",
    ]);
    expect(await accessible([Permission.OWNER])).toEqual(["owner-role-guild"]);

    const granted = await boundary.run(
      selectGuildIdsGrantingPermissions(
        boundary.database,
        ["discord-1"],
        guilds,
        [Permission.LOOTLOG_LOOTS_WRITE],
      ),
    );

    expect([...(granted.get("discord-1") ?? [])].toSorted()).toEqual([
      "admin-guild",
      "owner-role-guild",
    ]);
  } finally {
    await boundary.dispose();
  }
});
