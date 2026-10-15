import { afterAll, beforeEach, describe, expect, it } from "bun:test";
import { eq, inArray } from "drizzle-orm";
import { Effect, Layer, ManagedRuntime } from "effect";
import {
  CUSTOM_THEME_LIMIT,
  type CustomThemeDefinition,
} from "@lootlog/schema/custom-theme";
import {
  ApiDatabase,
  ApiDatabaseLive,
} from "../src/database/drizzle/database.js";
import {
  userSettingsTable,
  userThemeTable,
} from "../src/database/drizzle/schema.js";
import {
  createUserTheme,
  deleteUserTheme,
  getSharedUserTheme,
  getUserTheme,
  getUserThemes,
  shareUserTheme,
  unshareUserTheme,
  updateUserTheme,
  UserThemeLimitReached,
  UserThemeNotFound,
  UserThemesData,
  UserThemesIdentity,
} from "../src/http-api/handlers/user-themes/user-themes.handlers.js";

const runtime = ManagedRuntime.make(
  UserThemesData.layerDatabase.pipe(Layer.provideMerge(ApiDatabaseLive)),
);

const owner = "user-themes-owner";

const stranger = "user-themes-stranger";

const definition: CustomThemeDefinition = {
  baseThemeId: "rias",
  accent: "#3FB950",
  overrides: {},
  wallpaper: "base",
  font: "inter",
  radius: "round",
};

const as = <A, E>(
  userId: string,
  effect: Effect.Effect<A, E, UserThemesData | UserThemesIdentity>,
) =>
  runtime.runPromise(
    effect.pipe(
      Effect.provideService(
        UserThemesIdentity,
        UserThemesIdentity.of({ userId: Effect.succeed(userId) }),
      ),
    ),
  );

const failureOf = <A, E>(
  userId: string,
  effect: Effect.Effect<A, E, UserThemesData | UserThemesIdentity>,
) => as(userId, Effect.flip(effect));

const create = (userId: string, name = "Mój motyw") =>
  as(userId, createUserTheme({ name, definition }));

const storedPreference = (userId: string) =>
  runtime.runPromise(
    Effect.flatMap(ApiDatabase, (db) =>
      db
        .select({ theme: userSettingsTable.theme })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId)),
    ).pipe(Effect.map((rows) => rows[0]?.theme)),
  );

const selectTheme = (userId: string, theme: string) =>
  runtime.runPromise(
    Effect.flatMap(ApiDatabase, (db) =>
      db
        .insert(userSettingsTable)
        .values({ userId, theme, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: userSettingsTable.userId,
          set: { theme },
        }),
    ),
  );

describe("User themes against migrated PostgreSQL", () => {
  beforeEach(async () => {
    await runtime.runPromise(
      Effect.flatMap(ApiDatabase, (db) =>
        Effect.all([
          db
            .delete(userThemeTable)
            .where(inArray(userThemeTable.userId, [owner, stranger])),
          db
            .delete(userSettingsTable)
            .where(inArray(userSettingsTable.userId, [owner, stranger])),
        ]),
      ),
    );
  });
  afterAll(async () => {
    await runtime.dispose();
  });

  it("stops at the theme limit even when creates race each other", async () => {
    const results = await Promise.allSettled(
      Array.from({ length: CUSTOM_THEME_LIMIT + 3 }, (_, index) =>
        create(owner, `Motyw ${index}`),
      ),
    );

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(
      CUSTOM_THEME_LIMIT,
    );
    expect(await as(owner, getUserThemes())).toHaveLength(CUSTOM_THEME_LIMIT);
    expect(
      await failureOf(owner, createUserTheme({ name: "x", definition })),
    ).toBeInstanceOf(UserThemeLimitReached);
    // Another User's quota is their own.
    expect(await create(stranger)).toMatchObject({ name: "Mój motyw" });
  });

  it("hides one User's theme from every operation of another", async () => {
    const theme = await create(owner);

    expect(await as(stranger, getUserThemes())).toEqual([]);

    const operations: ReadonlyArray<
      Effect.Effect<unknown, unknown, UserThemesData | UserThemesIdentity>
    > = [
      getUserTheme(theme.id),
      updateUserTheme(theme.id, { name: "Przejęty" }),
      shareUserTheme(theme.id),
      unshareUserTheme(theme.id),
      deleteUserTheme(theme.id),
    ];

    for (const operation of operations) {
      expect(await failureOf(stranger, operation)).toBeInstanceOf(
        UserThemeNotFound,
      );
    }

    expect(await as(owner, getUserTheme(theme.id))).toMatchObject({
      name: "Mój motyw",
      definition,
    });
  });

  it("falls back to the base theme when the selected theme is deleted", async () => {
    const selected = await create(owner);
    const other = await create(owner, "Drugi");
    await selectTheme(owner, `custom:${selected.id}`);
    await selectTheme(stranger, `custom:${selected.id}`);

    await as(owner, deleteUserTheme(other.id));
    expect(await storedPreference(owner)).toBe(`custom:${selected.id}`);

    await as(owner, deleteUserTheme(selected.id));
    expect(await storedPreference(owner)).toBe("rias");
    // Only the owner's preference follows their theme.
    expect(await storedPreference(stranger)).toBe(`custom:${selected.id}`);
  });

  it("resolves a share link only while sharing is on, without the author", async () => {
    const theme = await create(owner);
    const shared = await as(owner, shareUserTheme(theme.id));
    const token = shared.shareToken ?? "";

    expect(token).not.toBe("");
    expect((await as(owner, shareUserTheme(theme.id))).shareToken).toBe(token);
    expect(await as(stranger, getSharedUserTheme(token))).toEqual({
      name: "Mój motyw",
      definition,
    });

    await as(owner, unshareUserTheme(theme.id));
    expect(await failureOf(stranger, getSharedUserTheme(token))).toBeInstanceOf(
      UserThemeNotFound,
    );
  });
});
