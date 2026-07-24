import {
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
} from "./chat-appearance-settings.js";

export const SETTINGS_DOMAINS = [
  "general",
  "appearance",
  "timers",
  "gameData",
  "notifications",
  "sounds",
  "controls",
  "events",
] as const;

export type SettingsDomain = (typeof SETTINGS_DOMAINS)[number];

export const SETTINGS_SCOPE_TYPES = [
  "USER",
  "GAME_ACCOUNT",
  "CHARACTER",
  "GUILD",
] as const;

export type SettingsScopeType = (typeof SETTINGS_SCOPE_TYPES)[number];

export interface SettingsScope {
  type: SettingsScopeType;
  id: string;
}

export type SettingsValueSource = "DEFAULT" | SettingsScope;
export type SettingsPersistence = "SERVER_DOCUMENT" | "DEVICE";

export interface SettingsDocumentLayer {
  scope: SettingsScope;
  overrides: Record<string, unknown>;
  schemaVersion?: number;
  updatedAt?: string;
}

export interface SettingsDomainResolution {
  effective: Record<string, unknown>;
  layers: SettingsDocumentLayer[];
  sources: Record<string, SettingsValueSource>;
  schemaVersion: number;
  updatedAt?: string;
}

export interface SettingsFieldDefinition {
  defaultValue: unknown;
  persistence: "SERVER_DOCUMENT";
  scopes: readonly SettingsScopeType[];
  isValid: (value: unknown) => boolean;
}

export interface SettingsDocumentMigration {
  fromVersion: number;
  migrate: (overrides: Record<string, unknown>) => Record<string, unknown>;
}

export interface SettingsDomainDefinition {
  schemaVersion: number;
  fields: Readonly<Record<string, SettingsFieldDefinition>>;
  migrations: readonly SettingsDocumentMigration[];
}

const isBoolean = (value: unknown) => typeof value === "boolean";
const isString = (value: unknown) => typeof value === "string";
const isStringArray = (value: unknown) =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isRecord = (value: unknown) =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value);
const isNumberInRange =
  (minimum: number, maximum: number) => (value: unknown) =>
    isFiniteNumber(value) && value >= minimum && value <= maximum;
const isOneOf =
  <TValue extends string>(values: readonly TValue[]) =>
  (value: unknown): value is TValue =>
    typeof value === "string" && values.includes(value as TValue);

const field = (
  defaultValue: unknown,
  scopes: readonly SettingsScopeType[],
  isValid: (value: unknown) => boolean,
): SettingsFieldDefinition => ({
  defaultValue,
  persistence: "SERVER_DOCUMENT",
  scopes,
  isValid,
});

const userScopes = ["USER"] as const;
const accountScopes = ["USER", "GAME_ACCOUNT"] as const;
const characterScopes = ["USER", "GAME_ACCOUNT", "CHARACTER"] as const;
const guildScopes = ["USER", "GUILD"] as const;

export const SETTINGS_CATALOG = {
  general: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      guildsOrder: field([], userScopes, isStringArray),
      allowWorldSelection: field(false, userScopes, isBoolean),
    },
  },
  appearance: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      theme: field("default", userScopes, isString),
      colorMode: field("dark", userScopes, isOneOf(["light", "dark"])),
      "chat.npcLayout": field(
        CHAT_APPEARANCE_READABLE_PRESET.npcLayout,
        characterScopes,
        isOneOf(["tile", "inline"]),
      ),
      "chat.fontScalePercent": field(
        CHAT_APPEARANCE_READABLE_PRESET.fontScalePercent,
        characterScopes,
        isNumberInRange(
          CHAT_FONT_SCALE_MIN_PERCENT,
          CHAT_FONT_SCALE_MAX_PERCENT,
        ),
      ),
      "chat.messageGapPx": field(
        CHAT_APPEARANCE_READABLE_PRESET.messageGapPx,
        characterScopes,
        isNumberInRange(CHAT_MESSAGE_GAP_MIN_PX, CHAT_MESSAGE_GAP_MAX_PX),
      ),
      "chat.showTimestamp": field(
        CHAT_APPEARANCE_READABLE_PRESET.showTimestamp,
        characterScopes,
        isBoolean,
      ),
      "chat.showGuildLabel": field(
        CHAT_APPEARANCE_READABLE_PRESET.showGuildLabel,
        characterScopes,
        isBoolean,
      ),
      "chat.showNpcAvatar": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcAvatar,
        characterScopes,
        isBoolean,
      ),
      "chat.showNpcLevel": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcLevel,
        characterScopes,
        isBoolean,
      ),
      "chat.showNpcLocation": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcLocation,
        characterScopes,
        isBoolean,
      ),
      "chat.showNpcCoordinates": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcCoordinates,
        characterScopes,
        isBoolean,
      ),
      "timers.displayConfig": field(
        {
          showType: true,
          showLevel: false,
          fontSize: 11,
          minColumnWidth: 120,
          singleTimerDisplayMode: "row",
        },
        guildScopes,
        isRecord,
      ),
      "timers.customColors": field({}, guildScopes, isRecord),
      "timers.timersColors": field({}, guildScopes, isRecord),
      "timers.defaultColorNames": field({}, guildScopes, isRecord),
      "timers.overriddenDefaultColors": field({}, guildScopes, isRecord),
      "timers.hiddenDefaultColors": field([], guildScopes, isStringArray),
    },
  },
  timers: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      generalConfig: field(
        {
          removeTimerAfterMs: 30_000,
          timersGrouping: false,
          timersUnderBag: false,
          countdownMode: "max",
        },
        guildScopes,
        isRecord,
      ),
      alwaysVisibleExpiredTimers: field({}, guildScopes, isRecord),
      timerFiltersEnabled: field(true, guildScopes, isBoolean),
      colorFiltersEnabled: field(false, guildScopes, isBoolean),
      timersSortOrder: field("asc", guildScopes, isOneOf(["asc", "desc"])),
      syncEnabled: field(true, guildScopes, isBoolean),
      hiddenTimers: field([], guildScopes, isStringArray),
      pinnedTimers: field([], guildScopes, isStringArray),
    },
  },
  gameData: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      pings: field({}, accountScopes, isRecord),
      detector: field({}, accountScopes, isRecord),
      airTags: field({}, accountScopes, isRecord),
      catching: field({}, characterScopes, isRecord),
      battlePanel: field({}, characterScopes, isRecord),
      lootlog: field({}, characterScopes, isRecord),
    },
  },
  notifications: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      presentation: field({}, accountScopes, isRecord),
      mutes: field({ players: [], npcs: [] }, userScopes, isRecord),
    },
  },
  sounds: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      notificationsVolume: field(0.5, userScopes, isNumberInRange(0, 1)),
      detectorVolume: field(0.5, userScopes, isNumberInRange(0, 1)),
      timersVolume: field(0.5, userScopes, isNumberInRange(0, 1)),
      pingsVolume: field(0, userScopes, isNumberInRange(0, 1)),
      notificationsConfig: field({}, userScopes, isRecord),
      detectorConfig: field({}, userScopes, isRecord),
      timersConfig: field({}, userScopes, isRecord),
    },
  },
  controls: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      hotkeys: field({}, userScopes, isRecord),
    },
  },
  events: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      pinnedEvents: field([], guildScopes, isStringArray),
    },
  },
} as const satisfies Record<SettingsDomain, SettingsDomainDefinition>;

export const DEVICE_SETTINGS_CATALOG = {
  animationEffectsEnabled: {
    defaultValue: true,
    persistence: "DEVICE",
    isValid: isBoolean,
  },
  masterVolume: {
    defaultValue: 0.5,
    persistence: "DEVICE",
    isValid: isNumberInRange(0, 1),
  },
  soundsMuted: {
    defaultValue: false,
    persistence: "DEVICE",
    isValid: isBoolean,
  },
  settingsLastPath: {
    defaultValue: "",
    persistence: "DEVICE",
    isValid: isString,
  },
  windowGeometry: {
    defaultValue: {},
    persistence: "DEVICE",
    isValid: isRecord,
  },
  windowOpenState: {
    defaultValue: {},
    persistence: "DEVICE",
    isValid: isRecord,
  },
} as const;

export type ServerSettingsCatalogKey = {
  [TDomain in SettingsDomain]: `${TDomain}.${Extract<
    keyof (typeof SETTINGS_CATALOG)[TDomain]["fields"],
    string
  >}`;
}[SettingsDomain];

export type DeviceSettingsCatalogKey =
  `device.${keyof typeof DEVICE_SETTINGS_CATALOG}`;

export type SettingsCatalogKey =
  | ServerSettingsCatalogKey
  | DeviceSettingsCatalogKey;

export const migrateSettingsDocument = (
  domain: SettingsDomain,
  overrides: Record<string, unknown>,
  fromVersion: number,
) => {
  const definition = SETTINGS_CATALOG[domain];
  if (fromVersion > definition.schemaVersion) {
    throw new Error(
      `Unsupported future settings schema version: ${fromVersion}`,
    );
  }

  let migratedOverrides = structuredClone(overrides);
  let currentVersion = fromVersion;
  while (currentVersion < definition.schemaVersion) {
    const migration = definition.migrations.find(
      (candidate) => candidate.fromVersion === currentVersion,
    );
    if (!migration) {
      throw new Error(
        `Missing ${domain} settings migration from version ${currentVersion}`,
      );
    }

    migratedOverrides = migration.migrate(migratedOverrides);
    currentVersion += 1;
  }

  return migratedOverrides;
};

export const isSettingsDomain = (value: string): value is SettingsDomain =>
  SETTINGS_DOMAINS.includes(value as SettingsDomain);

export const isSettingsScopeType = (
  value: string,
): value is SettingsScopeType =>
  SETTINGS_SCOPE_TYPES.includes(value as SettingsScopeType);
