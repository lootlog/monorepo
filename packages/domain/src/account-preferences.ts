/* oxlint-disable eslint/complexity, anti-slop/no-runtime-typeof, anti-slop/no-unknown-parameters -- this module is the parsing boundary for lenient legacy preference storage and intentionally handles every optional field here. */
import { isObjectRecord } from "@lootlog/schema/records";
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
} from "@lootlog/schema/account-preferences";
import type {
  MutedNpcPreference,
  MutedPlayerPreference,
  NotificationMutes,
} from "@lootlog/schema/user-preferences";

// Preference documents arrive from lenient storage; every optional field is
// normalized here so the API façade and the Game client agree on one shape.

export const DETECTOR_LEVEL_MIN = 0;

export const DETECTOR_LEVEL_MAX = 500;

export const cloneMutes = (
  mutes: NotificationMutes = { players: [], npcs: [] },
): NotificationMutes => ({
  players: (mutes.players ?? []).map((player) => ({ ...player })),
  npcs: (mutes.npcs ?? []).map((npc) => ({ ...npc })),
});

export const normalizeMutedPlayers = (
  players: unknown,
): MutedPlayerPreference[] => {
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

export const normalizeMutedNpcs = (npcs: unknown): MutedNpcPreference[] => {
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

export const cloneNotifications = (
  settings: NotificationsSettings,
): NotificationsSettings => {
  const copy = { ...settings, guildIds: [...settings.guildIds] };

  for (const type of NOTIFICATION_TYPES) copy[type] = { ...settings[type] };

  return copy;
};

export const normalizeNotification = (
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
    sound:
      typeof settings?.sound === "boolean" ? settings.sound : fallback.sound,
  };
};

export const normalizeGuildIds = (raw: unknown, fallback: string[]) =>
  Array.isArray(raw)
    ? raw.filter((guildId): guildId is string => typeof guildId === "string")
    : [...fallback];

/**
 * Expects the current `notifications` document shape (schema version 2):
 * the per-type lists of older documents are lifted by the catalog migration
 * before any reader sees them.
 */
export const normalizeNotifications = (raw: unknown): NotificationsSettings => {
  const settings = isObjectRecord(raw) ? raw : undefined;
  const normalized = cloneNotifications(defaultNotificationsSettings);
  normalized.guildIds = normalizeGuildIds(
    settings?.guildIds,
    defaultNotificationsSettings.guildIds,
  );

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

export const normalizeDetectorType = (
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

export const normalizeRoutingRules = (
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

export const cloneDetector = (settings: DetectorSettings): DetectorSettings => {
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

export const normalizeDetector = (raw: unknown): DetectorSettings => {
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

export const normalizePings = (raw: unknown): MapPingPreferences => {
  const settings = isObjectRecord(raw) ? raw : undefined;

  return {
    enabled:
      typeof settings?.enabled === "boolean"
        ? settings.enabled
        : defaultMapPingPreferences.enabled,
  };
};

export const normalizeAirTags = (raw: unknown): AirTagPreferences => {
  const settings = isObjectRecord(raw) ? raw : undefined;

  return {
    enabled:
      typeof settings?.enabled === "boolean"
        ? settings.enabled
        : defaultAirTagPreferences.enabled,
  };
};

export const normalizeNotificationMutes = (raw: unknown): NotificationMutes => {
  const mutes = isObjectRecord(raw) ? raw : undefined;

  return {
    players: normalizeMutedPlayers(mutes?.players),
    npcs: normalizeMutedNpcs(mutes?.npcs),
  };
};
