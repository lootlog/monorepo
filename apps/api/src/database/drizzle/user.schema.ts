import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const settingsScopeTypeEnum = pgEnum("SettingsScopeType", [
  "USER",
  "GAME_ACCOUNT",
  "CHARACTER",
  "GUILD",
]);

export const userCharactersLootlogSettingsTable = pgTable(
  "UserCharactersLootlogSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    characterId: text("characterId").notNull(),
    catchingGuildIds: text("catchingGuildIds")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex(
      "UserCharactersLootlogSettings_userId_accountId_characterId_key",
    ).on(table["userId"], table["accountId"], table["characterId"]),
  ],
);

export const userSettingsTable = pgTable(
  "UserSettings",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    guildsOrder: text("guildsOrder")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    hiddenGuildIds: text("hiddenGuildIds")
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    theme: text("theme").default("default").notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [uniqueIndex("UserSettings_userId_key").on(table["userId"])],
);

/**
 * The aura a User wears on every character they play with Lootlog. Users live
 * in the auth service, so `userId` has no foreign key.
 */
export const userCharacterAuraTable = pgTable("UserCharacterAura", {
  userId: text("userId").notNull().primaryKey(),
  auraId: text("auraId").notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
});

/**
 * Users a global chat admin let choose any aura, beside the admins themselves.
 * Revoking deletes the row together with the aura the User wears.
 */
export const userCharacterAuraGrantTable = pgTable("UserCharacterAuraGrant", {
  userId: text("userId").notNull().primaryKey(),
  grantedByUserId: text("grantedByUserId").notNull(),
  grantedAt: timestamp("grantedAt", { mode: "date", precision: 3 }).notNull(),
});

/**
 * Margonem accounts a User proved to play: the gateway verified Margonem's
 * signed proof and announced it. An account shared by several Users belongs
 * to each of them; the latest `verifiedAt` names who plays it now.
 */
export const userMargonemAccountTable = pgTable(
  "UserMargonemAccount",
  {
    userId: text("userId").notNull(),
    accountId: text("accountId").notNull(),
    verifiedAt: timestamp("verifiedAt", {
      mode: "date",
      precision: 3,
    }).notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.accountId],
      name: "UserMargonemAccount_pkey",
    }),
    index("UserMargonemAccount_accountId_verifiedAt_idx").on(
      table.accountId,
      table.verifiedAt.desc(),
    ),
  ],
);

/**
 * Deprecated: accounts claimed by the Game client without proof. Nothing
 * reads it since auras follow `UserMargonemAccount`; a later migration drops
 * it once no deployed API writes it.
 */
export const userCharacterAuraGameAccountTable = pgTable(
  "UserCharacterAuraGameAccount",
  {
    gameAccountId: text("gameAccountId").notNull().primaryKey(),
    userId: text("userId").notNull(),
    linkedAt: timestamp("linkedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("UserCharacterAuraGameAccount_userId_idx").on(table.userId),
  ],
);

/**
 * A User's own web theme: a built-in base plus their changes. A share token,
 * while set, lets anyone with the link read the theme to save a copy.
 */
export const userThemeTable = pgTable(
  "UserTheme",
  {
    id: text("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    name: text("name").notNull(),
    definition: jsonb("definition").notNull(),
    shareToken: text("shareToken"),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    index("UserTheme_userId_createdAt_idx").on(
      table["userId"],
      table["createdAt"],
    ),
    uniqueIndex("UserTheme_shareToken_key").on(table["shareToken"]),
  ],
);

export const userSettingDocumentTable = pgTable(
  "UserSettingDocument",
  {
    id: serial("id").notNull().primaryKey(),
    userId: text("userId").notNull(),
    domain: text("domain").notNull(),
    scopeType: settingsScopeTypeEnum("scopeType").notNull(),
    scopeId: text("scopeId").notNull(),
    overrides: jsonb("overrides")
      .default(sql`'{}'::jsonb`)
      .notNull(),
    schemaVersion: integer("schemaVersion").default(1).notNull(),
    createdAt: timestamp("createdAt", { mode: "date", precision: 3 })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updatedAt", { mode: "date", precision: 3 }).notNull(),
  },
  (table) => [
    uniqueIndex("UserSettingDocument_userId_domain_scopeType_scopeId_key").on(
      table["userId"],
      table["domain"],
      table["scopeType"],
      table["scopeId"],
    ),
    index("UserSettingDocument_userId_scopeType_scopeId_idx").on(
      table["userId"],
      table["scopeType"],
      table["scopeId"],
    ),
  ],
);
