import { getTableConfig } from "drizzle-orm/pg-core";
import { authAccounts, authUsers } from "./drizzle.schema";

const getUniqueIndexColumns = (table: Parameters<typeof getTableConfig>[0]) =>
  getTableConfig(table)
    .indexes.filter((index) => index.config.unique)
    .map((index) =>
      index.config.columns.map((column) => (column as { name: string }).name),
    );

describe("auth identity constraints", () => {
  it("keeps active Discord identities unique", () => {
    expect(getUniqueIndexColumns(authUsers)).toContainEqual(["discordId"]);
  });

  it("keeps provider accounts globally unique", () => {
    expect(getUniqueIndexColumns(authAccounts)).toContainEqual([
      "providerId",
      "accountId",
    ]);
  });
});
