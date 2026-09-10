/* oxlint-disable eslint/complexity -- preference migrations intentionally normalize every optional legacy field at one boundary. */
import { isRecord, isObjectRecord } from "@lootlog/schema/records";
import { eq } from "drizzle-orm";
import { Clock, Effect, type Schema } from "effect";
import {
  mergeChatAppearanceSettings,
  normalizeChatAppearanceSettings,
} from "@lootlog/domain/chat-appearance";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import {
  DETECTOR_NPC_TYPES,
  NOTIFICATION_TYPES,
  defaultAirTagPreferences,
  defaultDetectorSettings,
  defaultMapPingPreferences,
  defaultNotificationsSettings,
  type AirTagPreferences,
  type DetectorRoutingRule,
  type DetectorSettings,
  type DetectorTypeSettings,
  type MapPingPreferences,
  type NotificationSettings,
  type NotificationsSettings,
  type UserGameAccountPreferences,
} from "@lootlog/schema/account-preferences";
import type {
  MutedNpcPreference,
  MutedPlayerPreference,
  NotificationMutes,
  UserPreferences,
} from "@lootlog/schema/user-preferences";
import {
  requestApiKeyAccess,
  requestScopedIdentity,
} from "#src/runtime/auth/forward-auth-identity";
import { selectAccessibleGuilds } from "#src/members/member-access-query";
import { PermissionDeniedError } from "#src/shared/http/http-errors";
import { ApiDatabase } from "#src/database/drizzle/database";
import { userSettingsTable } from "#src/database/drizzle/schema";
import type {
  SettingsDocuments,
  SettingsDocumentsResponse,
} from "#src/settings-documents/settings-documents.service";
import type {
  PatchSettingsDocuments,
  SettingsDomainResolution,
} from "@lootlog/schema/settings-documents";
import type {
  UpdateUserGameAccountPreferencesRequest,
  UpdateUserPreferencesRequest,
} from "#src/contracts/users/schemas";
import { AccountOrganizationOperationError } from "./account-organization.operations.js";

type JsonValue = typeof Schema.Json.Type;

type SettingsOperation = PatchSettingsDocuments["operations"][number];

const toJson = <TValue extends object>(value: TValue): JsonValue =>
  // SAFETY: every caller passes a normalized preference record built from plain
  // JSON-compatible values, so the structured clone is a JSON object.
  structuredClone(value) as JsonValue;

const DETECTOR_LEVEL_MIN = 0;

const DETECTOR_LEVEL_MAX = 500;

const cloneMutes = (
  mutes: NotificationMutes = { players: [], npcs: [] },
): NotificationMutes => ({
  players: (mutes.players ?? []).map((player) => ({ ...player })),
  npcs: (mutes.npcs ?? []).map((npc) => ({ ...npc })),
});

const normalizeMutedPlayers = (players: unknown): MutedPlayerPreference[] => {
  if (!Array.isArray(players)) return [];
  const values = new Map<string, MutedPlayerPreference>();

  for (const player of players) {
    if (
      !isObjectRecord(player) ||
      typeof player.discordId !== "string" ||
      player.discordId.length === 0
    ) {
      continue;
    }

    values.set(player.discordId, {
      discordId: player.discordId,
      displayName:
        typeof player.displayName === "string" ? player.displayName : "",
    });
  }

  return [...values.values()];
};

const normalizeMutedNpcs = (npcs: unknown): MutedNpcPreference[] => {
  if (!Array.isArray(npcs)) return [];
  const values = new Map<string, MutedNpcPreference>();

  for (const npc of npcs) {
    if (!isObjectRecord(npc)) continue;
    const npcType = DETECTOR_NPC_TYPES.find((type) => type === npc.npcType);

    if (
      typeof npc.npcKey !== "string" ||
      npc.npcKey.length === 0 ||
      typeof npc.name !== "string" ||
      npc.name.length === 0 ||
      typeof npc.npcId !== "number" ||
      !Number.isInteger(npc.npcId) ||
      npcType === undefined ||
      typeof npc.lvl !== "number" ||
      Number.isNaN(npc.lvl)
    ) {
      continue;
    }

    values.set(npc.npcKey, {
      npcKey: npc.npcKey,
      npcId: npc.npcId,
      name: npc.name,
      npcType,
      lvl: Math.max(1, Math.trunc(npc.lvl)),
      prof: typeof npc.prof === "string" ? npc.prof : null,
      icon: typeof npc.icon === "string" ? npc.icon : null,
    });
  }

  return [...values.values()];
};

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
  if (!isRecord(overrides)) {
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

type StoredGamePreferences = {
  notifications?: unknown;
  detector?: unknown;
  pings?: unknown;
  airTags?: unknown;
};

const hasStoredSource = (
  resolution: SettingsDomainResolution | undefined,
  path: string,
) => {
  const source = resolution?.sources[path];

  return source !== undefined && source !== "DEFAULT";
};

// Only values with a stored layer count as present; catalog defaults stay "unset".
const storedGamePreferences = (
  documents: SettingsDocumentsResponse,
): StoredGamePreferences => {
  const gameData = documents.domains.gameData;
  const notifications = documents.domains.notifications;
  const stored: StoredGamePreferences = {};

  if (hasStoredSource(notifications, "presentation"))
    stored.notifications = notifications?.effective.presentation;

  if (hasStoredSource(gameData, "detector"))
    stored.detector = gameData?.effective.detector;

  if (hasStoredSource(gameData, "pings"))
    stored.pings = gameData?.effective.pings;

  if (hasStoredSource(gameData, "airTags"))
    stored.airTags = gameData?.effective.airTags;

  return stored;
};

const cloneNotifications = (
  settings: NotificationsSettings,
): NotificationsSettings => {
  const copy = { ...settings };

  for (const type of NOTIFICATION_TYPES) {
    copy[type] = { ...settings[type], guildIds: [...settings[type].guildIds] };
  }

  return copy;
};

const normalizeNotification = (
  raw: unknown,
  fallback: NotificationSettings,
): NotificationSettings => {
  const settings = isObjectRecord(raw) ? raw : undefined;

  return {
    show: typeof settings?.show === "boolean" ? settings.show : fallback.show,
    highlight:
      typeof settings?.highlight === "boolean"
        ? settings.highlight
        : fallback.highlight,
    ignoreOtherWorlds:
      typeof settings?.ignoreOtherWorlds === "boolean"
        ? settings.ignoreOtherWorlds
        : fallback.ignoreOtherWorlds,
    autoHideTimeout:
      typeof settings?.autoHideTimeout === "number" &&
      settings.autoHideTimeout >= 0
        ? settings.autoHideTimeout
        : fallback.autoHideTimeout,
    guildIds: Array.isArray(settings?.guildIds)
      ? settings.guildIds.filter(
          (guildId): guildId is string => typeof guildId === "string",
        )
      : [...fallback.guildIds],
    sound:
      typeof settings?.sound === "boolean" ? settings.sound : fallback.sound,
  };
};

const normalizeNotifications = (raw: unknown): NotificationsSettings => {
  const settings = isObjectRecord(raw) ? raw : undefined;
  const normalized = cloneNotifications(defaultNotificationsSettings);

  for (const type of NOTIFICATION_TYPES) {
    normalized[type] = normalizeNotification(
      settings?.[type],
      settings?.[type] === undefined
        ? defaultNotificationsSettings[type]
        : { ...defaultNotificationsSettings[type], ignoreOtherWorlds: false },
    );
  }

  return normalized;
};

const normalizeDetectorType = (
  raw: unknown,
  fallback: DetectorTypeSettings,
): DetectorTypeSettings => {
  const settings = isObjectRecord(raw) ? raw : undefined;

  return {
    detect:
      typeof settings?.detect === "boolean" ? settings.detect : fallback.detect,
    autoSend:
      typeof settings?.autoSend === "boolean"
        ? settings.autoSend
        : fallback.autoSend,
    notifyWindow:
      typeof settings?.notifyWindow === "boolean"
        ? settings.notifyWindow
        : fallback.notifyWindow,
    highlight:
      typeof settings?.highlight === "boolean"
        ? settings.highlight
        : fallback.highlight,
    notifySound:
      typeof settings?.notifySound === "boolean"
        ? settings.notifySound
        : fallback.notifySound,
  };
};

const normalizeRoutingRules = (
  rules: ReadonlyArray<unknown>,
): DetectorRoutingRule[] => {
  const result: DetectorRoutingRule[] = [];

  for (const [index, rule] of rules.entries()) {
    if (!isObjectRecord(rule)) continue;

    const rawMin =
      typeof rule.minLevel === "number" ? Math.trunc(rule.minLevel) : null;

    const rawMax =
      typeof rule.maxLevel === "number" ? Math.trunc(rule.maxLevel) : null;

    if (
      rawMin === null ||
      rawMax === null ||
      Number.isNaN(rawMin) ||
      Number.isNaN(rawMax)
    ) {
      continue;
    }

    const boundedMin = Math.min(
      DETECTOR_LEVEL_MAX,
      Math.max(DETECTOR_LEVEL_MIN, rawMin),
    );

    const boundedMax = Math.min(
      DETECTOR_LEVEL_MAX,
      Math.max(DETECTOR_LEVEL_MIN, rawMax),
    );

    const name = typeof rule.name === "string" ? rule.name.trim() : undefined;

    const world =
      typeof rule.world === "string" ? rule.world.trim() : undefined;

    const normalizedRule: DetectorRoutingRule = {
      id:
        typeof rule.id === "string" && rule.id.length > 0
          ? rule.id
          : `rule-${index + 1}`,
      minLevel: Math.min(boundedMin, boundedMax),
      maxLevel: Math.max(boundedMin, boundedMax),
      guildIds: Array.isArray(rule.guildIds)
        ? rule.guildIds.filter(
            (guildId): guildId is string => typeof guildId === "string",
          )
        : [],
    };

    if (name) normalizedRule.name = name;

    if (world) normalizedRule.world = world;
    result.push(normalizedRule);
  }

  return result;
};

const cloneDetector = (settings: DetectorSettings): DetectorSettings => {
  const copy = {
    ...settings,
    routingRules: settings.routingRules.map((rule) => ({
      ...rule,
      guildIds: [...rule.guildIds],
    })),
  };

  for (const type of DETECTOR_NPC_TYPES) copy[type] = { ...settings[type] };

  return copy;
};

const normalizeDetector = (raw: unknown): DetectorSettings => {
  const settings = isObjectRecord(raw) ? raw : undefined;
  const normalized = cloneDetector(defaultDetectorSettings);
  normalized.routingRules = Array.isArray(settings?.routingRules)
    ? normalizeRoutingRules(settings.routingRules)
    : defaultDetectorSettings.routingRules.map((rule) => ({
        ...rule,
        guildIds: [...rule.guildIds],
      }));

  for (const type of DETECTOR_NPC_TYPES) {
    normalized[type] = normalizeDetectorType(
      settings?.[type],
      defaultDetectorSettings[type],
    );
  }

  return normalized;
};

const normalizePings = (raw: unknown): MapPingPreferences => {
  const settings = isObjectRecord(raw) ? raw : undefined;

  return {
    enabled:
      typeof settings?.enabled === "boolean"
        ? settings.enabled
        : defaultMapPingPreferences.enabled,
  };
};

const normalizeAirTags = (raw: unknown): AirTagPreferences => {
  const settings = isObjectRecord(raw) ? raw : undefined;

  return {
    enabled:
      typeof settings?.enabled === "boolean"
        ? settings.enabled
        : defaultAirTagPreferences.enabled,
  };
};

const gamePreferencesResponse = (
  accountId: string,
  stored: StoredGamePreferences,
): UserGameAccountPreferences => {
  const hasStoredNotifications = stored.notifications !== undefined;
  const hasStoredDetector = stored.detector !== undefined;
  const hasStoredPings = stored.pings !== undefined;
  const hasStoredAirTags = stored.airTags !== undefined;

  return {
    accountId,
    notifications: normalizeNotifications(stored.notifications),
    detector: normalizeDetector(stored.detector),
    pings: normalizePings(stored.pings),
    airTags: normalizeAirTags(stored.airTags),
    hasStoredNotifications,
    hasStoredDetector,
    hasStoredPings,
    hasStoredAirTags,
    hasStoredPreferences:
      hasStoredNotifications ||
      hasStoredDetector ||
      hasStoredPings ||
      hasStoredAirTags,
  };
};

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
  const visibleOrganizationIds = Effect.gen(function* () {
    if (!(yield* requestApiKeyAccess)) return undefined;
    const identity = yield* requestScopedIdentity;

    const memberships = yield* selectAccessibleGuilds(
      database,
      identity.discordId,
    );

    return new Set(memberships.map(({ guild }) => guild.id));
  });

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

  const scopeGamePreferences = (value: UserGameAccountPreferences) =>
    Effect.gen(function* () {
      const ids = yield* visibleOrganizationIds;

      if (!ids) return value;
      const notifications = cloneNotifications(value.notifications);

      for (const type of NOTIFICATION_TYPES)
        notifications[type].guildIds = notifications[type].guildIds.filter(
          (id) => ids.has(id),
        );

      return {
        ...value,
        notifications,
        detector: {
          ...value.detector,
          routingRules: value.detector.routingRules.filter(
            (rule) =>
              rule.guildIds.length > 0 &&
              rule.guildIds.every((id) => ids.has(id)),
          ),
        },
      };
    });

  const readGamePreferences = (userId: string, accountId: string) =>
    settingsDocuments
      .getPreferences(userId, {
        domains: ["gameData", "notifications"],
        gameAccountId: accountId,
      })
      .pipe(Effect.map(storedGamePreferences));

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

    const current = yield* readPreferences(database, settingsDocuments, userId);

    const nextAppearance = payload.chatAppearance
      ? mergeChatAppearanceSettings(
          chatAppearance(current.appearance),
          payload.chatAppearance,
        )
      : undefined;

    const nextMutes = payload.mutes
      ? {
          players: payload.mutes.players
            ? normalizeMutedPlayers(payload.mutes.players)
            : current.mutes.players,
          npcs: payload.mutes.npcs
            ? normalizeMutedNpcs(payload.mutes.npcs)
            : current.mutes.npcs,
        }
      : current.mutes;

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

    const userScope = { type: "USER", id: userId } as const;
    const operations: SettingsOperation[] = [];

    if (payload.mutes) {
      operations.push({
        domain: "notifications",
        scope: userScope,
        set: { mutes: toJson(nextMutes) },
        unset: [],
      });
    }

    if (nextAppearance) {
      operations.push({
        domain: "appearance",
        scope: userScope,
        set: { chat: toJson(nextAppearance) },
        unset: [],
      });
    }

    if (operations.length > 0) {
      writes.push(settingsDocuments.patchPreferences(userId, { operations }));
    }

    yield* Effect.all(writes, { concurrency: "unbounded", discard: true });

    return response(
      userId,
      settingsUpdate.guildsOrder ||
        settingsUpdate.hiddenGuildIds ||
        settingsUpdate.theme
        ? {
            guildsOrder:
              settingsUpdate.guildsOrder ?? current.settings?.guildsOrder ?? [],
            hiddenGuildIds:
              settingsUpdate.hiddenGuildIds ??
              current.settings?.hiddenGuildIds ??
              [],
            theme: settingsUpdate.theme ?? current.settings?.theme ?? "default",
          }
        : current.settings,
      nextMutes,
      nextAppearance ?? chatAppearance(current.appearance),
    );
  });

  const getUserGameAccountPreferences = Effect.fn(
    "getUserGameAccountPreferences",
  )(function* (userId: string, accountId: string) {
    return gamePreferencesResponse(
      accountId,
      yield* readGamePreferences(userId, accountId),
    );
  });

  const updateUserGameAccountPreferences = Effect.fn(
    "updateUserGameAccountPreferences",
  )(function* (
    userId: string,
    accountId: string,
    payload: UpdateUserGameAccountPreferencesRequest,
  ) {
    if (
      (yield* requestApiKeyAccess) &&
      (payload.detector?.routingRules !== undefined ||
        NOTIFICATION_TYPES.some(
          (type) => payload.notifications?.[type]?.guildIds !== undefined,
        ))
    ) {
      return yield* new PermissionDeniedError(
        "Organization preference routing requires a session",
      );
    }

    const stored = yield* readGamePreferences(userId, accountId);
    const current = gamePreferencesResponse(accountId, stored);
    const notifications = cloneNotifications(current.notifications);

    if (payload.notifications) {
      for (const type of NOTIFICATION_TYPES) {
        const patch = payload.notifications[type];

        if (patch) {
          notifications[type] = normalizeNotification(
            {
              ...patch,
              guildIds: patch.guildIds ? [...patch.guildIds] : undefined,
            },
            notifications[type],
          );
        }
      }
    }

    const detector = cloneDetector(current.detector);

    if (payload.detector?.routingRules) {
      detector.routingRules = normalizeRoutingRules(
        payload.detector.routingRules.map((rule) => ({
          ...rule,
          guildIds: [...rule.guildIds],
        })),
      );
    }

    for (const type of DETECTOR_NPC_TYPES) {
      const patch = payload.detector?.[type];

      if (patch) detector[type] = normalizeDetectorType(patch, detector[type]);
    }

    const pings = normalizePings(
      payload.pings ? { ...current.pings, ...payload.pings } : current.pings,
    );

    const airTags = normalizeAirTags(
      payload.airTags
        ? { ...current.airTags, ...payload.airTags }
        : current.airTags,
    );

    const hasStoredNotifications =
      stored.notifications !== undefined || payload.notifications !== undefined;

    const hasStoredDetector =
      stored.detector !== undefined || payload.detector !== undefined;

    const hasStoredPings =
      stored.pings !== undefined || payload.pings !== undefined;

    const hasStoredAirTags =
      stored.airTags !== undefined || payload.airTags !== undefined;

    const accountScope = { type: "GAME_ACCOUNT", id: accountId } as const;
    const gameDataSet: Record<string, JsonValue> = {};

    if (payload.detector !== undefined) gameDataSet.detector = toJson(detector);

    if (payload.pings !== undefined) gameDataSet.pings = toJson(pings);

    if (payload.airTags !== undefined) gameDataSet.airTags = toJson(airTags);
    const operations: SettingsOperation[] = [];

    if (Object.keys(gameDataSet).length > 0) {
      operations.push({
        domain: "gameData",
        scope: accountScope,
        set: gameDataSet,
        unset: [],
      });
    }

    if (payload.notifications !== undefined) {
      operations.push({
        domain: "notifications",
        scope: accountScope,
        set: { presentation: toJson(notifications) },
        unset: [],
      });
    }

    if (operations.length > 0) {
      yield* settingsDocuments.patchPreferences(userId, { operations });
    }

    return {
      accountId,
      notifications,
      detector,
      pings,
      airTags,
      hasStoredNotifications,
      hasStoredDetector,
      hasStoredPings,
      hasStoredAirTags,
      hasStoredPreferences:
        hasStoredNotifications ||
        hasStoredDetector ||
        hasStoredPings ||
        hasStoredAirTags,
    } satisfies UserGameAccountPreferences;
  });

  const mapError = <A>(effect: Effect.Effect<A, unknown>) =>
    effect.pipe(
      Effect.mapError(
        (cause) => new AccountOrganizationOperationError({ cause }),
      ),
    );

  return {
    getUserPreferences: (userId: string) =>
      mapError(
        getUserPreferences(userId).pipe(Effect.flatMap(scopePreferences)),
      ),
    getUserGameAccountPreferences: (userId: string, accountId: string) =>
      mapError(
        getUserGameAccountPreferences(userId, accountId).pipe(
          Effect.flatMap(scopeGamePreferences),
        ),
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
    updateUserGameAccountPreferences: (
      userId: string,
      accountId: string,
      payload: UpdateUserGameAccountPreferencesRequest,
    ) =>
      mapError(
        updateUserGameAccountPreferences(userId, accountId, payload).pipe(
          Effect.flatMap(scopeGamePreferences),
        ),
      ),
  };
};
