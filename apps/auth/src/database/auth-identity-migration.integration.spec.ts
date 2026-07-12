import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const readMigration = (filename: string) =>
  readFile(resolve(process.cwd(), "drizzle", filename), "utf8");

const createBaselineDatabase = async () => {
  const database = new PGlite();
  await database.exec(await readMigration("0000_loving_the_leader.sql"));
  return database;
};

const insertUser = (database: PGlite, id: string, discordId: string) =>
  database.query(
    `INSERT INTO "user" ("id", "name", "email", "emailVerified", "updatedAt", "discordId")
     VALUES ($1, $2, $3, true, now(), $4)`,
    [id, id, `${id}@example.com`, discordId],
  );

const insertAccount = (
  database: PGlite,
  id: string,
  userId: string,
  accountId: string,
) =>
  database.query(
    `INSERT INTO "account" ("id", "accountId", "providerId", "userId", "updatedAt")
     VALUES ($1, $2, 'discord', $3, now())`,
    [id, accountId, userId],
  );

describe("auth identity migration", () => {
  it("applies to an empty database", async () => {
    const database = await createBaselineDatabase();

    await expect(
      database.exec(await readMigration("0001_odd_kid_colt.sql")),
    ).resolves.toBeDefined();

    await database.close();
  });

  it("preserves existing valid users and accounts", async () => {
    const database = await createBaselineDatabase();
    await insertUser(database, "user-1", "discord-1");
    await insertUser(database, "user-2", "discord-2");
    await insertAccount(database, "account-1", "user-1", "discord-1");
    await insertAccount(database, "account-2", "user-2", "discord-2");

    await database.exec(await readMigration("0001_odd_kid_colt.sql"));

    const users = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "user"`,
    );
    const accounts = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "account"`,
    );
    expect(users.rows[0]?.count).toBe(2);
    expect(accounts.rows[0]?.count).toBe(2);

    await database.close();
  });

  it.each([
    {
      name: "duplicate active Discord IDs",
      prepare: async (database: PGlite) => {
        await insertUser(database, "user-1", "discord-1");
        await insertUser(database, "user-2", "discord-1");
      },
    },
    {
      name: "duplicate provider accounts",
      prepare: async (database: PGlite) => {
        await insertUser(database, "user-1", "discord-1");
        await insertUser(database, "user-2", "discord-2");
        await insertAccount(database, "account-1", "user-1", "discord-1");
        await insertAccount(database, "account-2", "user-2", "discord-1");
      },
    },
  ])("stops safely on $name", async ({ prepare }) => {
    const database = await createBaselineDatabase();
    await prepare(database);
    const usersBefore = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "user"`,
    );
    const accountsBefore = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "account"`,
    );

    await expect(
      database.exec(await readMigration("0001_odd_kid_colt.sql")),
    ).rejects.toThrow("could not create unique index");

    const usersAfter = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "user"`,
    );
    const accountsAfter = await database.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM "account"`,
    );
    expect(usersAfter.rows[0]?.count).toBe(usersBefore.rows[0]?.count);
    expect(accountsAfter.rows[0]?.count).toBe(accountsBefore.rows[0]?.count);

    await database.close();
  });
});
