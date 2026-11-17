import { isObjectRecord } from "@lootlog/schema/records";
import {
  cloneMutes,
  normalizeMutedNpcs,
  normalizeMutedPlayers,
} from "@lootlog/domain/account-preferences";
import { and, eq } from "drizzle-orm";
import { Clock, Effect, type Schema, Predicate } from "effect";
import {
  mergeChatAppearanceSettings,
  normalizeChatAppearanceSettings,
} from "@lootlog/domain/chat-appearance";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import type {
  NotificationMutes,
  UserPreferences,
} from "@lootlog/schema/user-preferences";
import { requestApiKeyAccess } from "#src/runtime/auth/forward-auth-identity";
import { apiKeyAccessibleGuilds } from "#src/runtime/auth/organization-scope";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { ApiDatabase } from "#src/database/drizzle/database";
import {
  userSettingsTable,
  userThemeTable,
} from "#src/database/drizzle/user.schema";
import type { SettingsDocuments } from "#src/settings-documents/settings-documents.service";
import type {
  PatchSettingsDocuments,
  SettingsDomainResolution,
} from "@lootlog/schema/settings-documents";
import type { UpdateUserPreferencesRequest } from "#src/contracts/users/schemas";
import { AccountOrganizationOperationError } from "#src/guilds/account-organization-data";

type JsonValue = typeof Schema.Json.Type;

type SettingsOperation = PatchSettingsDocuments["operations"][number];

const toJson = <TValue extends object>(value: TValue): JsonValue =>
  // SAFETY: every caller passes a normalized preference record built from plain
  // JSON-compatible values, so the structured clone is a JSON object.
  structuredClone(value) as JsonValue;

const storedMutes = (
  notifications: SettingsDomainResolution | undefined,
): NotificationMutes => {
  const mutes = isObjectRecord(notifications?.effective.mutes)
    ? notifications.effective.mutes
    : undefined;

  return {
    players: normalizeMutedPlayers(mutes?.players),
    npcs: normalizeMutedNpcs(mutes?.npcs),
  };
};

const chatAppearance = (
  overrides: unknown,
  fallback: unknown = CHAT_APPEARANCE_READABLE_PRESET,
) => {
  if (!Predicate.isObject(overrides)) {
    return normalizeChatAppearanceSettings(fallback);
  }

  return normalizeChatAppearanceSettings(
    overrides.chat,
    normalizeChatAppearanceSettings(fallback),
  );
};

const response = (
  userId: string,
  settings: {
    readonly guildsOrder: string[];
    readonly hiddenGuildIds: string[];
    readonly theme: string;
  } | null,
  mutes: NotificationMutes,
  appearance: UserPreferences["chatAppearance"],
): UserPreferences => ({
  userId,
  guildsOrder: settings?.guildsOrder ?? [],
  hiddenGuildIds: settings?.hiddenGuildIds ?? [],
  theme: settings?.theme ?? "default",
  chatAppearance: normalizeChatAppearanceSettings(appearance),
  mutes: cloneMutes(mutes),
});

const readPreferences = (
  database: typeof ApiDatabase.Service,
  settingsDocuments: SettingsDocuments,
  userId: string,
) =>
  Effect.all(
    {
      settings: database
        .select()
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, userId))
        .limit(1)
        .pipe(Effect.map((rows) => rows[0] ?? null)),
      documents: settingsDocuments.getPreferences(userId, {
        domains: ["appearance", "notifications"],
      }),
    },
    { concurrency: "unbounded" },
  ).pipe(
    Effect.map(({ settings, documents }) => ({
      settings,
      mutes: storedMutes(documents.domains.notifications),
      appearance: documents.domains.appearance?.effective,
    })),
  );

export const makeUserPreferencesData = (
  database: typeof ApiDatabase.Service,
  settingsDocuments: SettingsDocuments,
) => {
  const visibleOrganizationIds = Effect.map(
    apiKeyAccessibleGuilds(database),
    (guilds) => guilds && new Set(guilds.map(({ id }) => id)),
  );

  const scopePreferences = (value: UserPreferences) =>
    Effect.gen(function* () {
      const ids = yield* visibleOrganizationIds;

      if (!ids) return value;

      return {
        ...value,
        guildsOrder: value.guildsOrder.filter((id) => ids.has(id)),
        hiddenGuildIds: value.hiddenGuildIds.filter((id) => ids.has(id)),
      };
    });

  const getUserPreferences = Effect.fn("getUserPreferences")(function* (
    userId: string,
  ) {
    const current = yield* readPreferences(database, settingsDocuments, userId);

    return response(
      userId,
      current.settings,
      current.mutes,
      chatAppearance(current.appearance),
    );
  });

  const updateUserPreferences = Effect.fn("updateUserPreferences")(function* (
    userId: string,
    payload: UpdateUserPreferencesRequest,
  ) {
    if (
      (yield* requestApiKeyAccess) &&
      (payload.guildsOrder !== undefined ||
        payload.hiddenGuildIds !== undefined)
    ) {
      return yield* new PermissionDeniedError(
        "Organization preference lists require a session",
      );
    }

    const now = new Date(yield* Clock.currentTimeMillis);

    const settingsUpdate: Partial<
      Pick<
        typeof userSettingsTable.$inferInsert,
        "guildsOrder" | "hiddenGuildIds" | "theme"
      >
    > = {};

    if (payload.guildsOrder !== undefined)
      settingsUpdate.guildsOrder = [...payload.guildsOrder];

    if (payload.hiddenGuildIds !== undefined)
      settingsUpdate.hiddenGuildIds = [...payload.hiddenGuildIds];

    if (payload.theme !== undefined) settingsUpdate.theme = payload.theme;

    const writes: Array<Effect.Effect<unknown, unknown>> = [];

    if (Object.keys(settingsUpdate).length > 0) {
      writes.push(
        database
          .insert(userSettingsTable)
          .values({
            userId,
            guildsOrder: settingsUpdate.guildsOrder ?? [],
            hiddenGuildIds: settingsUpdate.hiddenGuildIds ?? [],
            theme: settingsUpdate.theme ?? "default",
            createdAt: now,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: userSettingsTable.userId,
            set: { ...settingsUpdate, updatedAt: now },
          }),
      );
    }

    // Only the sent leaves are written, by path inside the document
    // transaction, so a concurrent change of another mute list or chat field
    // is kept instead of being overwritten with this request's stale copy.
    const userScope = { type: "USER", id: userId } as const;
    const operations: SettingsOperation[] = [];
    const mutesSet: Record<string, JsonValue> = {};

    if (payload.mutes?.players) {
      mutesSet.players = toJson(normalizeMutedPlayers(payload.mutes.players));
    }

    if (payload.mutes?.npcs) {
      mutesSet.npcs = toJson(normalizeMutedNpcs(payload.mutes.npcs));
    }

    if (Object.keys(mutesSet).length > 0) {
      operations.push({
        domain: "notifications",
        scope: userScope,
        set: { mutes: mutesSet },
        unset: [],
      });
    }

    if (payload.chatAppearance) {
      const normalized = mergeChatAppearanceSettings(
        CHAT_APPEARANCE_READABLE_PRESET,
        payload.chatAppearance,
      );

      const patchedKeys = new Set(Object.keys(payload.chatAppearance));

      const chatSet = Object.fromEntries(
        Object.entries(normalized).filter(([key]) => patchedKeys.has(key)),
      );

      if (Object.keys(chatSet).length > 0) {
        operations.push({
          domain: "appearance",
          scope: userScope,
          set: { chat: chatSet },
          unset: [],
        });
      }
    }

    if (operations.length > 0) {
      writes.push(settingsDocuments.patchPreferences(userId, { operations }));
    }

    yield* Effect.all(writes, { concurrency: "unbounded", discard: true });

    return yield* getUserPreferences(userId);
  });

  const mapError = <A>(effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );

  return {
    userOwnsTheme: (userId: string, themeId: string) =>
      mapError(
        database
          .select({ id: userThemeTable.id })
          .from(userThemeTable)
          .where(
            and(
              eq(userThemeTable.id, themeId),
              eq(userThemeTable.userId, userId),
            ),
          )
          .limit(1)
          .pipe(Effect.map((rows) => rows.length > 0)),
      ),
    getUserPreferences: (userId: string) =>
      mapError(
        getUserPreferences(userId).pipe(Effect.flatMap(scopePreferences)),
      ),
    updateUserPreferences: (
      userId: string,
      payload: UpdateUserPreferencesRequest,
    ) =>
      mapError(
        updateUserPreferences(userId, payload).pipe(
          Effect.flatMap(scopePreferences),
        ),
      ),
  };
};
