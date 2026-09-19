import { flow, Option, Predicate, Schema } from "effect";
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

const readPreferenceRecord = flow(
  Option.liftPredicate(isObjectRecord),
  Option.getOrUndefined,
);

const readPreferenceList = flow(
  Schema.decodeUnknownOption(Schema.Array(Schema.Unknown)),
  Option.getOrUndefined,
);

const DETECTOR_LEVEL_MIN = 0;

const DETECTOR_LEVEL_MAX = 500;

export const cloneMutes = (
  mutes: NotificationMutes = { players: [], npcs: [] },
): NotificationMutes => ({
  players: (mutes.players ?? []).map((player) => ({ ...player })),
  npcs: (mutes.npcs ?? []).map((npc) => ({ ...npc })),
});

export const normalizeMutedPlayers = flow(
  readPreferenceList,
  (players): MutedPlayerPreference[] => {
    if (!players) return [];
    const values = new Map<string, MutedPlayerPreference>();

    for (const player of players) {
      if (
        !isObjectRecord(player) ||
        !Predicate.isString(player.discordId) ||
        player.discordId.length === 0
      ) {
        continue;
      }

      values.set(player.discordId, {
        discordId: player.discordId,
        displayName: Predicate.isString(player.displayName)
          ? player.displayName
          : "",
      });
    }

    return [...values.values()];
  },
);

export const normalizeMutedNpcs = flow(
  readPreferenceList,
  (npcs): MutedNpcPreference[] => {
    if (!npcs) return [];
    const values = new Map<string, MutedNpcPreference>();

    for (const npc of npcs) {
      if (!isObjectRecord(npc)) continue;
      const npcType = DETECTOR_NPC_TYPES.find((type) => type === npc.npcType);

      if (
        !Predicate.isString(npc.npcKey) ||
        npc.npcKey.length === 0 ||
        !Predicate.isString(npc.name) ||
        npc.name.length === 0 ||
        !Predicate.isNumber(npc.npcId) ||
        !Number.isInteger(npc.npcId) ||
        npcType === undefined ||
        !Predicate.isNumber(npc.lvl) ||
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
        prof: Predicate.isString(npc.prof) ? npc.prof : null,
        icon: Predicate.isString(npc.icon) ? npc.icon : null,
      });
    }

    return [...values.values()];
  },
);

export const cloneNotifications = (
  settings: NotificationsSettings,
): NotificationsSettings => {
  const copy = { ...settings, guildIds: [...settings.guildIds] };

  for (const type of NOTIFICATION_TYPES) copy[type] = { ...settings[type] };

  return copy;
};

export const normalizeNotification = (fallback: NotificationSettings) =>
  flow(readPreferenceRecord, (settings): NotificationSettings => {
    return {
      show: Predicate.isBoolean(settings?.show) ? settings.show : fallback.show,
      highlight: Predicate.isBoolean(settings?.highlight)
        ? settings.highlight
        : fallback.highlight,
      ignoreOtherWorlds: Predicate.isBoolean(settings?.ignoreOtherWorlds)
        ? settings.ignoreOtherWorlds
        : fallback.ignoreOtherWorlds,
      autoHideTimeout:
        Predicate.isNumber(settings?.autoHideTimeout) &&
        settings.autoHideTimeout >= 0
          ? settings.autoHideTimeout
          : fallback.autoHideTimeout,
      sound: Predicate.isBoolean(settings?.sound)
        ? settings.sound
        : fallback.sound,
    };
  });

export const normalizeGuildIds = (fallback: string[]) =>
  flow(readPreferenceList, (raw) =>
    raw ? raw.filter(Predicate.isString) : [...fallback],
  );

/**
 * Expects the current `notifications` document shape (schema version 2):
 * the per-type lists of older documents are lifted by the catalog migration
 * before any reader sees them.
 */
export const normalizeNotifications = flow(
  readPreferenceRecord,
  (settings): NotificationsSettings => {
    const normalized = cloneNotifications(defaultNotificationsSettings);
    normalized.guildIds = normalizeGuildIds(
      defaultNotificationsSettings.guildIds,
    )(settings?.guildIds);

    for (const type of NOTIFICATION_TYPES) {
      normalized[type] = normalizeNotification(
        settings?.[type] === undefined
          ? defaultNotificationsSettings[type]
          : { ...defaultNotificationsSettings[type], ignoreOtherWorlds: false },
      )(settings?.[type]);
    }

    return normalized;
  },
);

export const normalizeDetectorType = (fallback: DetectorTypeSettings) =>
  flow(readPreferenceRecord, (settings): DetectorTypeSettings => {
    return {
      detect: Predicate.isBoolean(settings?.detect)
        ? settings.detect
        : fallback.detect,
      autoSend: Predicate.isBoolean(settings?.autoSend)
        ? settings.autoSend
        : fallback.autoSend,
      notifyWindow: Predicate.isBoolean(settings?.notifyWindow)
        ? settings.notifyWindow
        : fallback.notifyWindow,
      highlight: Predicate.isBoolean(settings?.highlight)
        ? settings.highlight
        : fallback.highlight,
      notifySound: Predicate.isBoolean(settings?.notifySound)
        ? settings.notifySound
        : fallback.notifySound,
    };
  });

export const normalizeRoutingRules = flow(
  readPreferenceList,
  (rules): DetectorRoutingRule[] => {
    const result: DetectorRoutingRule[] = [];

    for (const [index, rule] of (rules ?? []).entries()) {
      if (!isObjectRecord(rule)) continue;

      const rawMin = Predicate.isNumber(rule.minLevel)
        ? Math.trunc(rule.minLevel)
        : null;

      const rawMax = Predicate.isNumber(rule.maxLevel)
        ? Math.trunc(rule.maxLevel)
        : null;

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

      const name = Predicate.isString(rule.name) ? rule.name.trim() : undefined;

      const world = Predicate.isString(rule.world)
        ? rule.world.trim()
        : undefined;

      const normalizedRule: DetectorRoutingRule = {
        id:
          Predicate.isString(rule.id) && rule.id.length > 0
            ? rule.id
            : `rule-${index + 1}`,
        minLevel: Math.min(boundedMin, boundedMax),
        maxLevel: Math.max(boundedMin, boundedMax),
        guildIds: Array.isArray(rule.guildIds)
          ? rule.guildIds.filter((guildId): guildId is string =>
              Predicate.isString(guildId),
            )
          : [],
      };

      if (name) normalizedRule.name = name;

      if (world) normalizedRule.world = world;
      result.push(normalizedRule);
    }

    return result;
  },
);

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

export const normalizeDetector = flow(
  readPreferenceRecord,
  (settings): DetectorSettings => {
    const normalized = cloneDetector(defaultDetectorSettings);
    normalized.routingRules = Array.isArray(settings?.routingRules)
      ? normalizeRoutingRules(settings.routingRules)
      : defaultDetectorSettings.routingRules.map((rule) => ({
          ...rule,
          guildIds: [...rule.guildIds],
        }));

    for (const type of DETECTOR_NPC_TYPES) {
      normalized[type] = normalizeDetectorType(defaultDetectorSettings[type])(
        settings?.[type],
      );
    }

    return normalized;
  },
);

export const normalizePings = flow(
  readPreferenceRecord,
  (settings): MapPingPreferences => {
    return {
      enabled: Predicate.isBoolean(settings?.enabled)
        ? settings.enabled
        : defaultMapPingPreferences.enabled,
    };
  },
);

export const normalizeAirTags = flow(
  readPreferenceRecord,
  (settings): AirTagPreferences => {
    return {
      enabled: Predicate.isBoolean(settings?.enabled)
        ? settings.enabled
        : defaultAirTagPreferences.enabled,
    };
  },
);

export const normalizeNotificationMutes = flow(
  readPreferenceRecord,
  (mutes): NotificationMutes => {
    return {
      players: normalizeMutedPlayers(mutes?.players),
      npcs: normalizeMutedNpcs(mutes?.npcs),
    };
  },
);
