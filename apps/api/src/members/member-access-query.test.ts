import { expect, test } from "bun:test";
import { Effect } from "effect";
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
import { ForwardAuthIdentity } from "#src/runtime/auth/forward-auth-identity";
import { apiKeyAccessibleGuilds } from "#src/runtime/auth/organization-scope";

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

test("cross-Organization reads grant the Discord guild owner before a member row exists", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const guilds = [
      createGuildFixture({ id: "owned", ownerId: "owner" }),
      createGuildFixture({ id: "other", ownerId: "someone-else" }),
    ];

    await boundary.run(boundary.database.insert(guildTable).values(guilds));

    const accessible = await boundary.run(
      selectAccessibleGuilds(boundary.database, "owner", [
        Permission.LOOTLOG_LOOTS_WRITE,
      ]),
    );

    expect(accessible.map(({ guild }) => guild.id)).toEqual(["owned"]);

    const granted = await boundary.run(
      selectGuildIdsGrantingPermissions(boundary.database, ["owner"], guilds, [
        Permission.LOOTLOG_LOOTS_WRITE,
      ]),
    );

    expect([...(granted.get("owner") ?? [])]).toEqual(["owned"]);
  } finally {
    await boundary.dispose();
  }
});

test("an API key reaches only the Organizations granted to both the key and its User", async () => {
  const boundary = await createDatabaseBoundary();

  try {
    const guilds = ["keyed-writer", "keyed-reader", "unkeyed-writer"].map(
      (id) => createGuildFixture({ id }),
    );

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
      boundary.database.insert(roleTable).values(
        guilds.map((guild) => ({
          id: guild.id,
          guildId: guild.id,
          name: "Role",
          permissions:
            guild.id === "keyed-reader"
              ? [Permission.LOOTLOG_LOOTS_READ]
              : [Permission.LOOTLOG_LOOTS_WRITE],
          updatedAt: new Date(0),
        })),
      ),
    );
    await boundary.run(
      boundary.database
        .insert(memberToRoleTable)
        .values(guilds.map((guild, index) => ({ A: index + 1, B: guild.id }))),
    );

    const keyScoped = (permissions: Permission[]) =>
      boundary.run(
        apiKeyAccessibleGuilds(boundary.database, permissions).pipe(
          Effect.provideService(ForwardAuthIdentity, {
            userId: "user-1",
            discordId: "discord-1",
            apiKey: {
              keyId: "key",
              organizationIds: ["keyed-writer", "keyed-reader"],
              mode: "read-write",
              personalData: true,
              expiresAt: null,
            },
          }),
        ),
      );

    expect(
      (await keyScoped([Permission.LOOTLOG_LOOTS_WRITE]))?.map(({ id }) => id),
    ).toEqual(["keyed-writer"]);
    expect(
      (
        await keyScoped([
          Permission.LOOTLOG_LOOTS_WRITE,
          Permission.LOOTLOG_LOOTS_READ,
        ])
      )
        ?.map(({ id }) => id)
        .toSorted(),
    ).toEqual(["keyed-reader", "keyed-writer"]);
    // A session keeps the scope of the endpoint it calls.
    expect(
      await boundary.run(
        apiKeyAccessibleGuilds(boundary.database, [
          Permission.LOOTLOG_LOOTS_WRITE,
        ]),
      ),
    ).toBeUndefined();
  } finally {
    await boundary.dispose();
  }
});
