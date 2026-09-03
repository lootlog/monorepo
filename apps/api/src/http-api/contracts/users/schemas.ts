/** Transport schemas owned by the users HTTP module. */
import * as Schema from "effect/Schema";
import { StatusOkResponseDto_Output } from "../shared.js";

export type UserPreferencesResponseDto_Output = {
  readonly userId: string;
  readonly guildsOrder: ReadonlyArray<string>;
  readonly hiddenGuildIds: ReadonlyArray<string>;
  readonly theme: string;
  readonly chatAppearance: {
    readonly npcLayout: "tile" | "inline";
    readonly fontScalePercent: number;
    readonly messageGapPx: number;
    readonly showTimestamp: boolean;
    readonly showGuildLabel: boolean;
    readonly showNpcAvatar: boolean;
    readonly showNpcLevel: boolean;
    readonly showNpcLocationAndCoordinates: boolean;
  };
  readonly mutes: {
    readonly players: ReadonlyArray<{
      readonly discordId: string;
      readonly displayName: string;
    }>;
    readonly npcs: ReadonlyArray<{
      readonly npcKey: string;
      readonly npcId: number;
      readonly name: string;
      readonly npcType: "ELITE2" | "HERO" | "COLOSSUS" | "TITAN";
      readonly lvl: number;
      readonly prof: string | null;
      readonly icon: string | null;
    }>;
  };
};

export const UserPreferencesResponseDto_Output = Schema.Struct({
  userId: Schema.String,
  guildsOrder: Schema.Array(Schema.String),
  hiddenGuildIds: Schema.Array(Schema.String),
  theme: Schema.String,
  chatAppearance: Schema.Struct({
    npcLayout: Schema.Literals(["tile", "inline"]),
    fontScalePercent: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(70).annotate({
          expected: "a value greater than or equal to 70",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(150).annotate({
          expected: "a value less than or equal to 150",
        }),
      ),
    messageGapPx: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(0).annotate({
          expected: "a value greater than or equal to 0",
        }),
      )
      .check(
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

export type UpdateUserPreferencesDto = {
  readonly guildsOrder?: ReadonlyArray<string>;
  readonly hiddenGuildIds?: ReadonlyArray<string>;
  readonly theme?:
    | "default"
    | "cyberpunk"
    | "pastel"
    | "fantasy"
    | "shonen"
    | "onepiece"
    | "anime"
    | "goth"
    | "halloween"
    | "realmadrid"
    | "realmadrid-3rd"
    | "barcelona"
    | "waguri"
    | "rukia"
    | "rias"
    | "cat-pink"
    | "cat-purple"
    | "cat-blue"
    | "cat-random";
  readonly chatAppearance?: {
    readonly npcLayout?: "tile" | "inline";
    readonly fontScalePercent?: number;
    readonly messageGapPx?: number;
    readonly showTimestamp?: boolean;
    readonly showGuildLabel?: boolean;
    readonly showNpcAvatar?: boolean;
    readonly showNpcLevel?: boolean;
    readonly showNpcLocationAndCoordinates?: boolean;
  };
  readonly mutes?: {
    readonly players?: ReadonlyArray<{
      readonly discordId: string;
      readonly displayName: string;
    }>;
    readonly npcs?: ReadonlyArray<{
      readonly npcKey: string;
      readonly npcId: number;
      readonly name: string;
      readonly npcType: "ELITE2" | "HERO" | "COLOSSUS" | "TITAN";
      readonly lvl: number;
      readonly prof: string | null;
      readonly icon: string | null;
    }>;
  };
};

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
      fontScalePercent: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      messageGapPx: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
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

export type UserCurrentGuildResponseDto_Output = {
  readonly id: string;
  readonly name: string;
  readonly icon?: string | null;
  readonly vanityUrl?: string | null;
  readonly ownerId: string;
  readonly publicStatsCardEnabled: boolean;
  readonly hasLootlogAccess: boolean;
  readonly isAccessDataStale: boolean;
};

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

export type UserGameAccountPreferencesResponseDto_Output = {
  readonly accountId: string;
  readonly notifications: {
    readonly ELITE2: {
      readonly show: boolean;
      readonly highlight: boolean;
      readonly ignoreOtherWorlds: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds: ReadonlyArray<string>;
      readonly sound: boolean;
    };
    readonly HERO: {
      readonly show: boolean;
      readonly highlight: boolean;
      readonly ignoreOtherWorlds: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds: ReadonlyArray<string>;
      readonly sound: boolean;
    };
    readonly COLOSSUS: {
      readonly show: boolean;
      readonly highlight: boolean;
      readonly ignoreOtherWorlds: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds: ReadonlyArray<string>;
      readonly sound: boolean;
    };
    readonly TITAN: {
      readonly show: boolean;
      readonly highlight: boolean;
      readonly ignoreOtherWorlds: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds: ReadonlyArray<string>;
      readonly sound: boolean;
    };
    readonly message: {
      readonly show: boolean;
      readonly highlight: boolean;
      readonly ignoreOtherWorlds: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds: ReadonlyArray<string>;
      readonly sound: boolean;
    };
    readonly "party-gathering": {
      readonly show: boolean;
      readonly highlight: boolean;
      readonly ignoreOtherWorlds: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds: ReadonlyArray<string>;
      readonly sound: boolean;
    };
  };
  readonly detector: {
    readonly routingRules: ReadonlyArray<{
      readonly id: string;
      readonly name?: string;
      readonly minLevel: number;
      readonly maxLevel: number;
      readonly world?: string;
      readonly guildIds: ReadonlyArray<string>;
    }>;
    readonly ELITE2: {
      readonly detect: boolean;
      readonly autoSend: boolean;
      readonly notifyWindow: boolean;
      readonly highlight: boolean;
      readonly notifySound: boolean;
    };
    readonly HERO: {
      readonly detect: boolean;
      readonly autoSend: boolean;
      readonly notifyWindow: boolean;
      readonly highlight: boolean;
      readonly notifySound: boolean;
    };
    readonly COLOSSUS: {
      readonly detect: boolean;
      readonly autoSend: boolean;
      readonly notifyWindow: boolean;
      readonly highlight: boolean;
      readonly notifySound: boolean;
    };
    readonly TITAN: {
      readonly detect: boolean;
      readonly autoSend: boolean;
      readonly notifyWindow: boolean;
      readonly highlight: boolean;
      readonly notifySound: boolean;
    };
  };
  readonly pings: { readonly enabled: boolean };
  readonly airTags: { readonly enabled: boolean };
  readonly hasStoredNotifications: boolean;
  readonly hasStoredDetector: boolean;
  readonly hasStoredPings: boolean;
  readonly hasStoredAirTags: boolean;
  readonly hasStoredPreferences: boolean;
};

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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
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
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ).check(
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
        minLevel: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(0).annotate({
              expected: "a value greater than or equal to 0",
            }),
          )
          .check(
            Schema.isLessThanOrEqualTo(500).annotate({
              expected: "a value less than or equal to 500",
            }),
          ),
        maxLevel: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        )
          .check(
            Schema.isGreaterThanOrEqualTo(0).annotate({
              expected: "a value greater than or equal to 0",
            }),
          )
          .check(
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

export type UpdateUserGameAccountPreferencesDto = {
  readonly notifications?: {
    readonly ELITE2?: {
      readonly show?: boolean;
      readonly highlight?: boolean;
      readonly ignoreOtherWorlds?: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds?: ReadonlyArray<string>;
      readonly sound?: boolean;
    };
    readonly HERO?: {
      readonly show?: boolean;
      readonly highlight?: boolean;
      readonly ignoreOtherWorlds?: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds?: ReadonlyArray<string>;
      readonly sound?: boolean;
    };
    readonly COLOSSUS?: {
      readonly show?: boolean;
      readonly highlight?: boolean;
      readonly ignoreOtherWorlds?: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds?: ReadonlyArray<string>;
      readonly sound?: boolean;
    };
    readonly TITAN?: {
      readonly show?: boolean;
      readonly highlight?: boolean;
      readonly ignoreOtherWorlds?: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds?: ReadonlyArray<string>;
      readonly sound?: boolean;
    };
    readonly message?: {
      readonly show?: boolean;
      readonly highlight?: boolean;
      readonly ignoreOtherWorlds?: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds?: ReadonlyArray<string>;
      readonly sound?: boolean;
    };
    readonly "party-gathering"?: {
      readonly show?: boolean;
      readonly highlight?: boolean;
      readonly ignoreOtherWorlds?: boolean;
      readonly autoHideTimeout?: number;
      readonly guildIds?: ReadonlyArray<string>;
      readonly sound?: boolean;
    };
  };
  readonly detector?: {
    readonly routingRules?: ReadonlyArray<{
      readonly id: string;
      readonly name?: string;
      readonly minLevel: number;
      readonly maxLevel: number;
      readonly world?: string;
      readonly guildIds: ReadonlyArray<string>;
    }>;
    readonly ELITE2?: {
      readonly detect?: boolean;
      readonly autoSend?: boolean;
      readonly notifyWindow?: boolean;
      readonly highlight?: boolean;
      readonly notifySound?: boolean;
    };
    readonly HERO?: {
      readonly detect?: boolean;
      readonly autoSend?: boolean;
      readonly notifyWindow?: boolean;
      readonly highlight?: boolean;
      readonly notifySound?: boolean;
    };
    readonly COLOSSUS?: {
      readonly detect?: boolean;
      readonly autoSend?: boolean;
      readonly notifyWindow?: boolean;
      readonly highlight?: boolean;
      readonly notifySound?: boolean;
    };
    readonly TITAN?: {
      readonly detect?: boolean;
      readonly autoSend?: boolean;
      readonly notifyWindow?: boolean;
      readonly highlight?: boolean;
      readonly notifySound?: boolean;
    };
  };
  readonly pings?: { readonly enabled?: boolean };
  readonly airTags?: { readonly enabled?: boolean };
};

export const UpdateUserGameAccountPreferencesDto = Schema.Struct({
  notifications: Schema.optionalKey(
    Schema.Struct({
      ELITE2: Schema.optionalKey(
        Schema.Struct({
          show: Schema.optionalKey(Schema.Boolean),
          highlight: Schema.optionalKey(Schema.Boolean),
          ignoreOtherWorlds: Schema.optionalKey(Schema.Boolean),
          autoHideTimeout: Schema.optionalKey(
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ).check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ).check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ).check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ).check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ).check(
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
            Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ).check(
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
            minLevel: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
                Schema.isLessThanOrEqualTo(500).annotate({
                  expected: "a value less than or equal to 500",
                }),
              ),
            maxLevel: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            )
              .check(
                Schema.isGreaterThanOrEqualTo(0).annotate({
                  expected: "a value greater than or equal to 0",
                }),
              )
              .check(
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
export type UsersControllerDeleteAccount200 = StatusOkResponseDto_Output;

export const UsersControllerDeleteAccount200 = StatusOkResponseDto_Output;

export type UsersControllerGetUserPreferences200 =
  UserPreferencesResponseDto_Output;

export const UsersControllerGetUserPreferences200 =
  UserPreferencesResponseDto_Output;

export type UsersControllerUpdateUserPreferencesRequestJson =
  UpdateUserPreferencesDto;

export const UsersControllerUpdateUserPreferencesRequestJson =
  UpdateUserPreferencesDto;

export type UsersControllerUpdateUserPreferences200 =
  UserPreferencesResponseDto_Output;

export const UsersControllerUpdateUserPreferences200 =
  UserPreferencesResponseDto_Output;

export type UsersControllerGetCurrentUserGuilds200 =
  ReadonlyArray<UserCurrentGuildResponseDto_Output>;

export const UsersControllerGetCurrentUserGuilds200 = Schema.Array(
  UserCurrentGuildResponseDto_Output,
);

export type UsersControllerGetCurrentUserAccessibleGuilds200 =
  ReadonlyArray<UserCurrentGuildResponseDto_Output>;

export const UsersControllerGetCurrentUserAccessibleGuilds200 = Schema.Array(
  UserCurrentGuildResponseDto_Output,
);

export type UsersControllerGetUserGameAccountPreferencesPathParams = {
  readonly accountId: string;
};

export const UsersControllerGetUserGameAccountPreferencesPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["1234567"] }),
  });

export type UsersControllerGetUserGameAccountPreferences200 =
  UserGameAccountPreferencesResponseDto_Output;

export const UsersControllerGetUserGameAccountPreferences200 =
  UserGameAccountPreferencesResponseDto_Output;

export type UsersControllerUpdateUserGameAccountPreferencesPathParams = {
  readonly accountId: string;
};

export const UsersControllerUpdateUserGameAccountPreferencesPathParams =
  Schema.Struct({
    accountId: Schema.String.annotate({ examples: ["1234567"] }),
  });

export type UsersControllerUpdateUserGameAccountPreferencesRequestJson =
  UpdateUserGameAccountPreferencesDto;

export const UsersControllerUpdateUserGameAccountPreferencesRequestJson =
  UpdateUserGameAccountPreferencesDto;

export type UsersControllerUpdateUserGameAccountPreferences200 =
  UserGameAccountPreferencesResponseDto_Output;

export const UsersControllerUpdateUserGameAccountPreferences200 =
  UserGameAccountPreferencesResponseDto_Output;
