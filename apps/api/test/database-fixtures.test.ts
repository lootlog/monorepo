import { Permission } from "@lootlog/schema/permissions";
import { expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { guildTable, roleTable } from "../src/database/drizzle/schema.js";
import { createDatabaseBoundary } from "./database-fixtures.js";
import { createGuildFixture } from "./organization-fixtures.js";

it("starts with clean data and constraints after another boundary changes its schema", async () => {
  const previous = await createDatabaseBoundary();

  try {
    await previous.run(
      previous.database
        .insert(guildTable)
        .values(createGuildFixture({ name: "Previous boundary" })),
    );
    await previous.run(
      previous.database.execute(
        sql`ALTER TABLE ${guildTable} ADD CONSTRAINT reject_fixture_writes CHECK (false) NOT VALID`,
      ),
    );
  } finally {
    await previous.dispose();
  }

  const next = await createDatabaseBoundary();

  try {
    expect(await next.run(next.database.select().from(guildTable))).toEqual([]);
    expect(
      await next.run(
        next.database
          .insert(guildTable)
          .values(createGuildFixture({ name: "Next boundary" }))
          .returning({ id: guildTable.id, name: guildTable.name }),
      ),
    ).toEqual([{ id: "guild-1", name: "Next boundary" }]);
  } finally {
    await next.dispose();
  }
});

it("isolates concurrently acquired boundaries and keeps the other database alive after disposal", async () => {
  const [first, second] = await Promise.all([
    createDatabaseBoundary(),
    createDatabaseBoundary(),
  ]);

  try {
    for (const { boundary, name, permissions } of [
      {
        boundary: first,
        name: "First boundary",
        permissions: [Permission.LOOTLOG_CHAT_READ],
      },
      {
        boundary: second,
        name: "Second boundary",
        permissions: [
          Permission.LOOTLOG_CHAT_READ,
          Permission.LOOTLOG_CHAT_WRITE,
        ],
      },
    ]) {
      await boundary.run(
        boundary.database
          .insert(guildTable)
          .values(createGuildFixture({ name })),
      );
      await boundary.run(
        boundary.database.insert(roleTable).values({
          id: "role-1",
          guildId: "guild-1",
          name,
          permissions,
          updatedAt: new Date(0),
        }),
      );
      expect(
        await boundary.run(
          boundary.database
            .select({
              name: roleTable.name,
              permissions: roleTable.permissions,
            })
            .from(roleTable),
        ),
      ).toEqual([{ name, permissions }]);
    }

    await first.dispose();
    expect(
      await second.run(
        second.database
          .select({ name: roleTable.name, permissions: roleTable.permissions })
          .from(roleTable),
      ),
    ).toEqual([
      {
        name: "Second boundary",
        permissions: [
          Permission.LOOTLOG_CHAT_READ,
          Permission.LOOTLOG_CHAT_WRITE,
        ],
      },
    ]);
  } finally {
    await Promise.all([first.dispose(), second.dispose()]);
  }
});
