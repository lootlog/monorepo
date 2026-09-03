/** Transport schemas owned by the users HTTP module. */
import * as Schema from "effect/Schema";
import { StatusOkResponseDto_Output } from "../shared.js";
import { FiniteNumber } from "../scalars.js";

export type UserPreferencesResponseDto_Output =
  typeof UserPreferencesResponseDto_Output.Type;

export const UserPreferencesResponseDto_Output = Schema.Struct({
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
    players: Schema.Array(
      Schema.Struct({
        discordId: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ),
        displayName: Schema.String,
      }),
    ),
    npcs: Schema.Array(
      Schema.Struct({
        npcKey: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ),
        npcId: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
              expected: "a value greater than or equal to -9007199254740991",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        name: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ),
        npcType: Schema.Literals(["ELITE2", "HERO", "COLOSSUS", "TITAN"]),
        lvl: Schema.Number.check(
          Schema.isInt().annotate({ expected: "an integer" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(1).annotate({
              expected: "a value greater than or equal to 1",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(9007199254740991).annotate({
              expected: "a value less than or equal to 9007199254740991",
            }),
          ),
        prof: Schema.Union([Schema.String, Schema.Null]),
        icon: Schema.Union([Schema.String, Schema.Null]),
      }),
    ),
  }),
}).annotate({ identifier: "UserPreferencesResponseDto_Output" });

export type UpdateUserPreferencesDto = typeof UpdateUserPreferencesDto.Type;

export const UpdateUserPreferencesDto = Schema.Struct({
  guildsOrder: Schema.optionalKey(
    Schema.Array(Schema.String).check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ),
  ),
  hiddenGuildIds: Schema.optionalKey(
    Schema.Array(
      Schema.String.check(
        Schema.isMinLength(1).annotate({
          expected: "a value with a length of at least 1",
        }),
      ),
    ),
  ),
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
      players: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            discordId: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ),
            displayName: Schema.String,
          }),
        ),
      ),
      npcs: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            npcKey: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ),
            npcId: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(-9007199254740991).annotate({
                  expected:
                    "a value greater than or equal to -9007199254740991",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            name: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ),
            npcType: Schema.Literals(["ELITE2", "HERO", "COLOSSUS", "TITAN"]),
            lvl: Schema.Number.check(
              Schema.isInt().annotate({ expected: "an integer" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(1).annotate({
                  expected: "a value greater than or equal to 1",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(9007199254740991).annotate({
                  expected: "a value less than or equal to 9007199254740991",
                }),
              ),
            prof: Schema.Union([Schema.String, Schema.Null]),
            icon: Schema.Union([Schema.String, Schema.Null]),
          }),
        ),
      ),
    }),
  ),
}).annotate({ identifier: "UpdateUserPreferencesDto" });

export type UserCurrentGuildResponseDto_Output =
  typeof UserCurrentGuildResponseDto_Output.Type;

export const UserCurrentGuildResponseDto_Output = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  vanityUrl: Schema.optionalKey(Schema.Union([Schema.String, Schema.Null])),
  ownerId: Schema.String,
  publicStatsCardEnabled: Schema.Boolean,
  hasLootlogAccess: Schema.Boolean,
  isAccessDataStale: Schema.Boolean,
}).annotate({ identifier: "UserCurrentGuildResponseDto_Output" });

export type UserGameAccountPreferencesResponseDto_Output =
  typeof UserGameAccountPreferencesResponseDto_Output.Type;

export const UserGameAccountPreferencesResponseDto_Output = Schema.Struct({
  accountId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ),
  notifications: Schema.Struct({
    ELITE2: Schema.Struct({
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
    }),
    HERO: Schema.Struct({
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
    }),
    COLOSSUS: Schema.Struct({
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
    }),
    TITAN: Schema.Struct({
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
    }),
    message: Schema.Struct({
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
    }),
    "party-gathering": Schema.Struct({
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
    }),
  }),
  detector: Schema.Struct({
    routingRules: Schema.Array(
      Schema.Struct({
        id: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ),
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
      }),
    ),
    ELITE2: Schema.Struct({
      detect: Schema.Boolean,
      autoSend: Schema.Boolean,
      notifyWindow: Schema.Boolean,
      highlight: Schema.Boolean,
      notifySound: Schema.Boolean,
    }),
    HERO: Schema.Struct({
      detect: Schema.Boolean,
      autoSend: Schema.Boolean,
      notifyWindow: Schema.Boolean,
      highlight: Schema.Boolean,
      notifySound: Schema.Boolean,
    }),
    COLOSSUS: Schema.Struct({
      detect: Schema.Boolean,
      autoSend: Schema.Boolean,
      notifyWindow: Schema.Boolean,
      highlight: Schema.Boolean,
      notifySound: Schema.Boolean,
    }),
    TITAN: Schema.Struct({
      detect: Schema.Boolean,
      autoSend: Schema.Boolean,
      notifyWindow: Schema.Boolean,
      highlight: Schema.Boolean,
      notifySound: Schema.Boolean,
    }),
  }),
  pings: Schema.Struct({ enabled: Schema.Boolean }),
  airTags: Schema.Struct({ enabled: Schema.Boolean }),
  hasStoredNotifications: Schema.Boolean,
  hasStoredDetector: Schema.Boolean,
  hasStoredPings: Schema.Boolean,
  hasStoredAirTags: Schema.Boolean,
  hasStoredPreferences: Schema.Boolean,
}).annotate({ identifier: "UserGameAccountPreferencesResponseDto_Output" });

export type UpdateUserGameAccountPreferencesDto =
  typeof UpdateUserGameAccountPreferencesDto.Type;

export const UpdateUserGameAccountPreferencesDto = Schema.Struct({
  notifications: Schema.optionalKey(
    Schema.Struct({
      ELITE2: Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ),
          ),
          guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
          sound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      HERO: Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ),
          ),
          guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
          sound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ),
          ),
          guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
          sound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      TITAN: Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ),
          ),
          guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
          sound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      message: Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ),
          ),
          guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
          sound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      "party-gathering": Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            FiniteNumber.check(
              Schema.isGreaterThanOrEqualTo(0).annotate({
                expected: "a value greater than or equal to 0",
              }),
            ),
          ),
          guildIds: Schema.optionalKey(Schema.Array(Schema.String)),
          sound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
    }),
  ),
  detector: Schema.optionalKey(
    Schema.Struct({
      routingRules: Schema.optionalKey(
        Schema.Array(
          Schema.Struct({
            id: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ),
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
          }),
        ),
      ),
      ELITE2: Schema.optionalKey(
        Schema.Struct({
          detect: Schema.optionalKey(Schema.Boolean),
          autoSend: Schema.optionalKey(Schema.Boolean),
          notifyWindow: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          notifySound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      HERO: Schema.optionalKey(
        Schema.Struct({
          detect: Schema.optionalKey(Schema.Boolean),
          autoSend: Schema.optionalKey(Schema.Boolean),
          notifyWindow: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          notifySound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      COLOSSUS: Schema.optionalKey(
        Schema.Struct({
          detect: Schema.optionalKey(Schema.Boolean),
          autoSend: Schema.optionalKey(Schema.Boolean),
          notifyWindow: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          notifySound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
      TITAN: Schema.optionalKey(
        Schema.Struct({
          detect: Schema.optionalKey(Schema.Boolean),
          autoSend: Schema.optionalKey(Schema.Boolean),
          notifyWindow: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          notifySound: Schema.optionalKey(Schema.Boolean),
        }),
      ),
    }),
  ),
  pings: Schema.optionalKey(
    Schema.Struct({ enabled: Schema.optionalKey(Schema.Boolean) }),
  ),
  airTags: Schema.optionalKey(
    Schema.Struct({ enabled: Schema.optionalKey(Schema.Boolean) }),
  ),
}).annotate({ identifier: "UpdateUserGameAccountPreferencesDto" });

// schemas
export type UsersControllerDeleteAccount200 =
  typeof UsersControllerDeleteAccount200.Type;

export const UsersControllerDeleteAccount200 = StatusOkResponseDto_Output;

export type UsersControllerGetUserPreferences200 =
  typeof UsersControllerGetUserPreferences200.Type;

export const UsersControllerGetUserPreferences200 =
  UserPreferencesResponseDto_Output;

export type UsersControllerUpdateUserPreferencesRequestJson =
  typeof UsersControllerUpdateUserPreferencesRequestJson.Type;

export const UsersControllerUpdateUserPreferencesRequestJson =
  UpdateUserPreferencesDto;

export type UsersControllerUpdateUserPreferences200 =
  typeof UsersControllerUpdateUserPreferences200.Type;

export const UsersControllerUpdateUserPreferences200 =
  UserPreferencesResponseDto_Output;

export type UsersControllerGetCurrentUserGuilds200 =
  typeof UsersControllerGetCurrentUserGuilds200.Type;

export const UsersControllerGetCurrentUserGuilds200 = Schema.Array(
  UserCurrentGuildResponseDto_Output,
);

export type UsersControllerGetCurrentUserAccessibleGuilds200 =
  typeof UsersControllerGetCurrentUserAccessibleGuilds200.Type;

export const UsersControllerGetCurrentUserAccessibleGuilds200 = Schema.Array(
  UserCurrentGuildResponseDto_Output,
);

export type UsersControllerGetUserGameAccountPreferencesPathParams =
  typeof UsersControllerGetUserGameAccountPreferencesPathParams.Type;

export const UsersControllerGetUserGameAccountPreferencesPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["1234567"] }),
  });

export type UsersControllerGetUserGameAccountPreferences200 =
  typeof UsersControllerGetUserGameAccountPreferences200.Type;

export const UsersControllerGetUserGameAccountPreferences200 =
  UserGameAccountPreferencesResponseDto_Output;

export type UsersControllerUpdateUserGameAccountPreferencesPathParams =
  typeof UsersControllerUpdateUserGameAccountPreferencesPathParams.Type;

export const UsersControllerUpdateUserGameAccountPreferencesPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["1234567"] }),
  });

export type UsersControllerUpdateUserGameAccountPreferencesRequestJson =
  typeof UsersControllerUpdateUserGameAccountPreferencesRequestJson.Type;

export const UsersControllerUpdateUserGameAccountPreferencesRequestJson =
  UpdateUserGameAccountPreferencesDto;

export type UsersControllerUpdateUserGameAccountPreferences200 =
  typeof UsersControllerUpdateUserGameAccountPreferences200.Type;

export const UsersControllerUpdateUserGameAccountPreferences200 =
  UserGameAccountPreferencesResponseDto_Output;
