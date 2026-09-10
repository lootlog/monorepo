import { Schema } from "effect";
import { isRecord } from "@lootlog/schema/records";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
} from "@lootlog/schema/chat-appearance";
import {
  DEFAULT_NPC_TYPE_COLORS,
  isHexAppearanceColor,
} from "@lootlog/schema/npc-appearance";
import { NpcTypeSchema } from "@lootlog/schema/npc-type";

export const SETTINGS_DOMAINS = [
  "general",
  "appearance",
  "chat",
  "timers",
  "gameData",
  "notifications",
  "sounds",
  "controls",
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

export const getCharacterSettingsScopeId = (
  gameAccountId: string,
  characterId: string,
) => `${gameAccountId}:${characterId}`;

export type SettingsValueSource = "DEFAULT" | SettingsScope;
export type SettingsPersistence = "SERVER_DOCUMENT" | "DEVICE";

// Values arrive from versioned storage and are validated per catalog field before use.
export type RawSettingsValues = Record<string, unknown>;

export interface SettingsDocumentLayer {
  scope: SettingsScope;
  overrides: RawSettingsValues;
  schemaVersion?: number;
  updatedAt?: string;
}

export interface SettingsDomainResolution {
  effective: RawSettingsValues;
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
  migrate: (overrides: RawSettingsValues) => RawSettingsValues;
}

export interface SettingsDomainDefinition {
  schemaVersion: number;
  fields: Readonly<Record<string, SettingsFieldDefinition>>;
  migrations: readonly SettingsDocumentMigration[];
}

const isBoolean = Schema.is(Schema.Boolean);
const isString = Schema.is(Schema.String);
const isStringArray = Schema.is(Schema.Array(Schema.String));
const isNpcTypeArray = Schema.is(Schema.Array(NpcTypeSchema));
const isNumberInRange = (minimum: number, maximum: number) =>
  Schema.is(Schema.Finite.check(Schema.isBetween({ minimum, maximum })));
const isOneOf = <TValue extends string>(values: readonly TValue[]) =>
  Schema.is(Schema.Literals(values));

const field = (
  defaultValue: SettingsFieldDefinition["defaultValue"],
  scopes: readonly SettingsScopeType[],
  isValid: SettingsFieldDefinition["isValid"],
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
    schemaVersion: 3,
    migrations: [
      {
        fromVersion: 1,
        migrate: (overrides) => overrides,
      },
      {
        fromVersion: 2,
        migrate: ({ colorMode: _colorMode, ...overrides }) => overrides,
      },
    ],
    fields: {
      theme: field("default", userScopes, isString),
      "chat.npcLayout": field(
        CHAT_APPEARANCE_READABLE_PRESET.npcLayout,
        userScopes,
        isOneOf(["tile", "inline"]),
      ),
      "chat.fontScalePercent": field(
        CHAT_APPEARANCE_READABLE_PRESET.fontScalePercent,
        userScopes,
        isNumberInRange(
          CHAT_FONT_SCALE_MIN_PERCENT,
          CHAT_FONT_SCALE_MAX_PERCENT,
        ),
      ),
      "chat.messageGapPx": field(
        CHAT_APPEARANCE_READABLE_PRESET.messageGapPx,
        userScopes,
        isNumberInRange(CHAT_MESSAGE_GAP_MIN_PX, CHAT_MESSAGE_GAP_MAX_PX),
      ),
      "chat.showTimestamp": field(
        CHAT_APPEARANCE_READABLE_PRESET.showTimestamp,
        userScopes,
        isBoolean,
      ),
      "chat.showGuildLabel": field(
        CHAT_APPEARANCE_READABLE_PRESET.showGuildLabel,
        userScopes,
        isBoolean,
      ),
      "chat.showNpcAvatar": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcAvatar,
        userScopes,
        isBoolean,
      ),
      "chat.showNpcLevel": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcLevel,
        userScopes,
        isBoolean,
      ),
      "chat.showNpcLocationAndCoordinates": field(
        CHAT_APPEARANCE_READABLE_PRESET.showNpcLocationAndCoordinates,
        userScopes,
        isBoolean,
      ),
      "npcColors.ELITE": field(
        DEFAULT_NPC_TYPE_COLORS.ELITE,
        userScopes,
        isHexAppearanceColor,
      ),
      "npcColors.ELITE2": field(
        DEFAULT_NPC_TYPE_COLORS.ELITE2,
        userScopes,
        isHexAppearanceColor,
      ),
      "npcColors.ELITE3": field(
        DEFAULT_NPC_TYPE_COLORS.ELITE3,
        userScopes,
        isHexAppearanceColor,
      ),
      "npcColors.HERO": field(
        DEFAULT_NPC_TYPE_COLORS.HERO,
        userScopes,
        isHexAppearanceColor,
      ),
      "npcColors.EVENT_HERO": field(
        DEFAULT_NPC_TYPE_COLORS.EVENT_HERO,
        userScopes,
        isHexAppearanceColor,
      ),
      "npcColors.COLOSSUS": field(
        DEFAULT_NPC_TYPE_COLORS.COLOSSUS,
        userScopes,
        isHexAppearanceColor,
      ),
      "npcColors.TITAN": field(
        DEFAULT_NPC_TYPE_COLORS.TITAN,
        userScopes,
        isHexAppearanceColor,
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
  chat: {
    schemaVersion: 1,
    migrations: [],
    fields: {
      hiddenNpcTypes: field([], userScopes, isNpcTypeArray),
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
  overrides: RawSettingsValues,
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

export const isSettingsDomain = Schema.is(Schema.Literals(SETTINGS_DOMAINS));
export const isSettingsScopeType = Schema.is(
  Schema.Literals(SETTINGS_SCOPE_TYPES),
);
