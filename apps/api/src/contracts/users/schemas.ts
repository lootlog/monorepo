/** Shared input and output schemas for the users feature. */
import * as Schema from "effect/Schema";
import * as Struct from "effect/Struct";
import {
  FiniteNumber,
  NonEmptyString,
  SafeInteger,
  PositiveSafeInteger,
} from "#src/contracts/scalars";

const MutedPlayer = Schema.Struct({
  discordId: NonEmptyString,
  displayName: Schema.String,
});

const MutedNpc = Schema.Struct({
  npcKey: NonEmptyString,
  npcId: SafeInteger,
  name: NonEmptyString,
  npcType: Schema.Literals(["ELITE2", "HERO", "COLOSSUS", "TITAN"]),
  lvl: PositiveSafeInteger,
  prof: Schema.Union([Schema.String, Schema.Null]),
  icon: Schema.Union([Schema.String, Schema.Null]),
});

const GameNotificationPreferences = Schema.Struct({
  show: Schema.Boolean,
  highlight: Schema.Boolean,
  ignoreOtherWorlds: Schema.Boolean,
  autoHideTimeout: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ),
  ),
  guildIds: Schema.Array(Schema.String),
  sound: Schema.Boolean,
});

const GameNotificationPreferencesPatch = GameNotificationPreferences.mapFields(
  Struct.map(Schema.optionalKey),
);

const NpcDetectorPreferences = Schema.Struct({
  detect: Schema.Boolean,
  autoSend: Schema.Boolean,
  notifyWindow: Schema.Boolean,
  highlight: Schema.Boolean,
  notifySound: Schema.Boolean,
});

const NpcDetectorPreferencesPatch = NpcDetectorPreferences.mapFields(
  Struct.map(Schema.optionalKey),
);

const DetectorRoutingRule = Schema.Struct({
  id: NonEmptyString,
  name: Schema.optionalKey(Schema.String),
  minLevel: FiniteNumber.check(
    Schema.isGreaterThanOrEqualTo(0).annotate({
      expected: "a value greater than or equal to 0",
    }),
  ).check(
    Schema.isLessThanOrEqualTo(500).annotate({
      expected: "a value less than or equal to 500",
    }),
  ),
  maxLevel: FiniteNumber.check(
    Schema.isGreaterThanOrEqualTo(0).annotate({
      expected: "a value greater than or equal to 0",
    }),
  ).check(
    Schema.isLessThanOrEqualTo(500).annotate({
      expected: "a value less than or equal to 500",
    }),
  ),
  world: Schema.optionalKey(Schema.String),
  guildIds: Schema.Array(Schema.String),
});

export type UserPreferencesResponse = typeof UserPreferencesResponse.Type;

export const UserPreferencesResponse = Schema.Struct({
  userId: Schema.String,
  guildsOrder: Schema.Array(Schema.String),
  hiddenGuildIds: Schema.Array(Schema.String),
  theme: Schema.String,
  chatAppearance: Schema.Struct({
    npcLayout: Schema.Literals(["tile", "inline"]),
    fontScalePercent: FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(70).annotate({
        expected: "a value greater than or equal to 70",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(150).annotate({
        expected: "a value less than or equal to 150",
      }),
    ),
    messageGapPx: FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(0).annotate({
        expected: "a value greater than or equal to 0",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(16).annotate({
        expected: "a value less than or equal to 16",
      }),
    ),
    showTimestamp: Schema.Boolean,
    showGuildLabel: Schema.Boolean,
    showNpcAvatar: Schema.Boolean,
    showNpcLevel: Schema.Boolean,
    showNpcLocationAndCoordinates: Schema.Boolean,
  }),
  mutes: Schema.Struct({
    players: Schema.Array(MutedPlayer),
    npcs: Schema.Array(MutedNpc),
  }),
}).annotate({ identifier: "UserPreferencesResponseDto_Output" });

export type UpdateUserPreferencesRequest =
  typeof UpdateUserPreferencesRequest.Type;

export const UpdateUserPreferencesRequest = Schema.Struct({
  guildsOrder: Schema.optionalKey(
    Schema.Array(Schema.String).check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  ),
  hiddenGuildIds: Schema.optionalKey(Schema.Array(NonEmptyString)),
  theme: Schema.optionalKey(
    Schema.Literals([
      "default",
      "cyberpunk",
      "pastel",
      "fantasy",
      "shonen",
      "onepiece",
      "anime",
      "goth",
      "halloween",
      "realmadrid",
      "realmadrid-3rd",
      "barcelona",
      "waguri",
      "rukia",
      "rias",
      "cat-pink",
      "cat-purple",
      "cat-blue",
      "cat-random",
    ]),
  ),
  chatAppearance: Schema.optionalKey(
    Schema.Struct({
      npcLayout: Schema.optionalKey(Schema.Literals(["tile", "inline"])),
      fontScalePercent: Schema.optionalKey(FiniteNumber),
      messageGapPx: Schema.optionalKey(FiniteNumber),
      showTimestamp: Schema.optionalKey(Schema.Boolean),
      showGuildLabel: Schema.optionalKey(Schema.Boolean),
      showNpcAvatar: Schema.optionalKey(Schema.Boolean),
      showNpcLevel: Schema.optionalKey(Schema.Boolean),
      showNpcLocationAndCoordinates: Schema.optionalKey(Schema.Boolean),
    }),
  ),
  mutes: Schema.optionalKey(
    Schema.Struct({
      players: Schema.optionalKey(Schema.Array(MutedPlayer)),
      npcs: Schema.optionalKey(Schema.Array(MutedNpc)),
    }),
  ),
}).annotate({ identifier: "UpdateUserPreferencesDto" });

export type CurrentOrganizationResponse =
  typeof CurrentOrganizationResponse.Type;

export const CurrentOrganizationResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  hasLootlogAccess: Schema.Boolean,
  isAccessDataStale: Schema.Boolean,
}).annotate({ identifier: "UserCurrentGuildResponseDto_Output" });

export type UserGameAccountPreferencesResponse =
  typeof UserGameAccountPreferencesResponse.Type;

export const UserGameAccountPreferencesResponse = Schema.Struct({
  accountId: NonEmptyString,
  notifications: Schema.Struct({
    ELITE2: GameNotificationPreferences,
    HERO: GameNotificationPreferences,
    COLOSSUS: GameNotificationPreferences,
    TITAN: GameNotificationPreferences,
    message: GameNotificationPreferences,
    "party-gathering": GameNotificationPreferences,
  }),
  detector: Schema.Struct({
    routingRules: Schema.Array(DetectorRoutingRule),
    ELITE2: NpcDetectorPreferences,
    HERO: NpcDetectorPreferences,
    COLOSSUS: NpcDetectorPreferences,
    TITAN: NpcDetectorPreferences,
  }),
  pings: Schema.Struct({ enabled: Schema.Boolean }),
  airTags: Schema.Struct({ enabled: Schema.Boolean }),
  hasStoredNotifications: Schema.Boolean,
  hasStoredDetector: Schema.Boolean,
  hasStoredPings: Schema.Boolean,
  hasStoredAirTags: Schema.Boolean,
  hasStoredPreferences: Schema.Boolean,
}).annotate({ identifier: "UserGameAccountPreferencesResponseDto_Output" });

export type UpdateUserGameAccountPreferencesRequest =
  typeof UpdateUserGameAccountPreferencesRequest.Type;

export const UpdateUserGameAccountPreferencesRequest = Schema.Struct({
  notifications: Schema.optionalKey(
    Schema.Struct({
      ELITE2: Schema.optionalKey(GameNotificationPreferencesPatch),
      HERO: Schema.optionalKey(GameNotificationPreferencesPatch),
      COLOSSUS: Schema.optionalKey(GameNotificationPreferencesPatch),
      TITAN: Schema.optionalKey(GameNotificationPreferencesPatch),
      message: Schema.optionalKey(GameNotificationPreferencesPatch),
      "party-gathering": Schema.optionalKey(GameNotificationPreferencesPatch),
    }),
  ),
  detector: Schema.optionalKey(
    Schema.Struct({
      routingRules: Schema.optionalKey(Schema.Array(DetectorRoutingRule)),
      ELITE2: Schema.optionalKey(NpcDetectorPreferencesPatch),
      HERO: Schema.optionalKey(NpcDetectorPreferencesPatch),
      COLOSSUS: Schema.optionalKey(NpcDetectorPreferencesPatch),
      TITAN: Schema.optionalKey(NpcDetectorPreferencesPatch),
    }),
  ),
  pings: Schema.optionalKey(
    Schema.Struct({ enabled: Schema.optionalKey(Schema.Boolean) }),
  ),
  airTags: Schema.optionalKey(
    Schema.Struct({ enabled: Schema.optionalKey(Schema.Boolean) }),
  ),
}).annotate({ identifier: "UpdateUserGameAccountPreferencesDto" });

export type CurrentOrganizationsResponse =
  typeof CurrentOrganizationsResponse.Type;

export const CurrentOrganizationsResponse = Schema.Array(
  CurrentOrganizationResponse,
);

export type GameAccountPreferencesPath = typeof GameAccountPreferencesPath.Type;

export const GameAccountPreferencesPath = Schema.Struct({
  accountId: Schema.String.annotate({ examples: ["1234567"] }),
});
