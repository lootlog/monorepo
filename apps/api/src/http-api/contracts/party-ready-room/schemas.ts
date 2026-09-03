/** Transport schemas owned by the party-ready-room HTTP module. */
import * as Schema from "effect/Schema";

export type PartyReadyRoomProjectionDto_Output = {
  readonly schemaVersion: 3;
  readonly notificationId: string;
  readonly organizerDiscordId: string;
  readonly organizerCharacter: {
    readonly lvl: number;
    readonly nick: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly prof: string;
    readonly icon: string;
    readonly clan?: { readonly id?: number; readonly name?: string };
  };
  readonly guildIds: ReadonlyArray<string>;
  readonly world: string;
  readonly description?: string;
  readonly minLvl?: number;
  readonly maxLvl?: number;
  readonly status: "ACTIVE";
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly expiresAt: string;
  readonly viewer: "ORGANIZER" | "PARTICIPANT";
  readonly participants: {
    readonly [x: string]: {
      readonly participantId: string;
      readonly discordId: string;
      readonly character: {
        readonly lvl: number;
        readonly nick: string;
        readonly accountId: string;
        readonly characterId: string;
        readonly prof: string;
        readonly icon: string;
        readonly clan?: { readonly id?: number; readonly name?: string };
      };
      readonly partyPresence: "OUTSIDE" | "IN_PARTY";
      readonly createdAt: string;
      readonly updatedAt: string;
    };
  };
  readonly ownedParticipantIds?: ReadonlyArray<string>;
};

export const PartyReadyRoomProjectionDto_Output = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  notificationId: Schema.String,
  organizerDiscordId: Schema.String,
  organizerCharacter: Schema.Struct({
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    accountId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    characterId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    prof: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
    icon: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(2048).annotate({
        expected: "a value with a length of at most 2048",
      }),
    ),
    clan: Schema.optionalKey(
      Schema.Struct({
        id: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        name: Schema.optionalKey(
          Schema.String.check(
            Schema.isMaxLength(255).annotate({
              expected: "a value with a length of at most 255",
            }),
          ),
        ),
      }),
    ),
  }),
  guildIds: Schema.Array(Schema.String),
  world: Schema.String,
  description: Schema.optionalKey(Schema.String),
  minLvl: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  maxLvl: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
  ),
  status: Schema.Literal("ACTIVE"),
  revision: Schema.Number.check(
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
  createdAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  updatedAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  expiresAt: Schema.String.annotate({ format: "date-time" }).check(
    Schema.isPattern(
      new RegExp(
        "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
      ),
    ).annotate({
      expected:
        "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
    }),
  ),
  viewer: Schema.Literals(["ORGANIZER", "PARTICIPANT"]),
  participants: Schema.Record(
    Schema.String,
    Schema.Struct({
      participantId: Schema.String,
      discordId: Schema.String,
      character: Schema.Struct({
        lvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        nick: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(255).annotate({
            expected: "a value with a length of at most 255",
          }),
        ),
        accountId: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(255).annotate({
            expected: "a value with a length of at most 255",
          }),
        ),
        characterId: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(255).annotate({
            expected: "a value with a length of at most 255",
          }),
        ),
        prof: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(100).annotate({
            expected: "a value with a length of at most 100",
          }),
        ),
        icon: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(2048).annotate({
            expected: "a value with a length of at most 2048",
          }),
        ),
        clan: Schema.optionalKey(
          Schema.Struct({
            id: Schema.optionalKey(
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
            ),
            name: Schema.optionalKey(
              Schema.String.check(
                Schema.isMaxLength(255).annotate({
                  expected: "a value with a length of at most 255",
                }),
              ),
            ),
          }),
        ),
      }),
      partyPresence: Schema.Literals(["OUTSIDE", "IN_PARTY"]),
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
    }),
  ),
  ownedParticipantIds: Schema.optionalKey(Schema.Array(Schema.String)),
}).annotate({ identifier: "PartyReadyRoomProjectionDto_Output" });

export type CreatePartyGatheringDto = {
  readonly guildIds: ReadonlyArray<string>;
  readonly world: string;
  readonly character: {
    readonly lvl: number;
    readonly nick: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly prof: string;
    readonly icon: string;
    readonly clan?: { readonly id?: number; readonly name?: string };
  };
  readonly description?: string;
  readonly minLvl?: number;
  readonly maxLvl?: number;
};

export const CreatePartyGatheringDto = Schema.Struct({
  guildIds: Schema.Array(
    Schema.String.check(
      Schema.isMaxLength(50).annotate({
        expected: "a value with a length of at most 50",
      }),
    ),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(10).annotate({
        expected: "a value with a length of at most 10",
      }),
    ),
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  character: Schema.Struct({
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    accountId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    characterId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    prof: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
    icon: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(2048).annotate({
        expected: "a value with a length of at most 2048",
      }),
    ),
    clan: Schema.optionalKey(
      Schema.Struct({
        id: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        name: Schema.optionalKey(
          Schema.String.check(
            Schema.isMaxLength(255).annotate({
              expected: "a value with a length of at most 255",
            }),
          ),
        ),
      }),
    ),
  }),
  description: Schema.optionalKey(
    Schema.String.check(
      Schema.isMaxLength(200).annotate({
        expected: "a value with a length of at most 200",
      }),
    ),
  ),
  minLvl: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
  maxLvl: Schema.optionalKey(
    Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    )
      .check(
        Schema.isGreaterThanOrEqualTo(1).annotate({
          expected: "a value greater than or equal to 1",
        }),
      )
      .check(
        Schema.isLessThanOrEqualTo(500).annotate({
          expected: "a value less than or equal to 500",
        }),
      ),
  ),
}).annotate({ identifier: "CreatePartyGatheringDto" });

export type PartyReadyRoomApplicationDto = {
  readonly world: string;
  readonly character: {
    readonly lvl: number;
    readonly nick: string;
    readonly accountId: string;
    readonly characterId: string;
    readonly prof: string;
    readonly icon: string;
    readonly clan?: { readonly id?: number; readonly name?: string };
  };
};

export const PartyReadyRoomApplicationDto = Schema.Struct({
  world: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(50).annotate({
      expected: "a value with a length of at most 50",
    }),
  ),
  character: Schema.Struct({
    lvl: Schema.Number.check(
      Schema.isFinite().annotate({ expected: "a finite number" }),
    ),
    nick: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    accountId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    characterId: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
    prof: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
    icon: Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(2048).annotate({
        expected: "a value with a length of at most 2048",
      }),
    ),
    clan: Schema.optionalKey(
      Schema.Struct({
        id: Schema.optionalKey(
          Schema.Number.check(
            Schema.isFinite().annotate({ expected: "a finite number" }),
          ),
        ),
        name: Schema.optionalKey(
          Schema.String.check(
            Schema.isMaxLength(255).annotate({
              expected: "a value with a length of at most 255",
            }),
          ),
        ),
      }),
    ),
  }),
}).annotate({ identifier: "PartyReadyRoomApplicationDto" });

export type PartyReadyRoomParticipantIdentityDto = {
  readonly participantId: string;
};

export const PartyReadyRoomParticipantIdentityDto = Schema.Struct({
  participantId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
}).annotate({ identifier: "PartyReadyRoomParticipantIdentityDto" });

export type PartyReadyRoomClientUpdateDto_Output = {
  readonly schemaVersion: 3;
  readonly type: "UPSERT" | "REMOVE";
  readonly projection?: {
    readonly schemaVersion: 3;
    readonly notificationId: string;
    readonly organizerDiscordId: string;
    readonly organizerCharacter: {
      readonly lvl: number;
      readonly nick: string;
      readonly accountId: string;
      readonly characterId: string;
      readonly prof: string;
      readonly icon: string;
      readonly clan?: { readonly id?: number; readonly name?: string };
    };
    readonly guildIds: ReadonlyArray<string>;
    readonly world: string;
    readonly description?: string;
    readonly minLvl?: number;
    readonly maxLvl?: number;
    readonly status: "ACTIVE";
    readonly revision: number;
    readonly createdAt: string;
    readonly updatedAt: string;
    readonly expiresAt: string;
    readonly viewer: "ORGANIZER" | "PARTICIPANT";
    readonly participants: {
      readonly [x: string]: {
        readonly participantId: string;
        readonly discordId: string;
        readonly character: {
          readonly lvl: number;
          readonly nick: string;
          readonly accountId: string;
          readonly characterId: string;
          readonly prof: string;
          readonly icon: string;
          readonly clan?: { readonly id?: number; readonly name?: string };
        };
        readonly partyPresence: "OUTSIDE" | "IN_PARTY";
        readonly createdAt: string;
        readonly updatedAt: string;
      };
    };
    readonly ownedParticipantIds?: ReadonlyArray<string>;
  };
  readonly notificationId?: string;
  readonly revision?: number;
};

export const PartyReadyRoomClientUpdateDto_Output = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literals(["UPSERT", "REMOVE"]),
  projection: Schema.optionalKey(
    Schema.Struct({
      schemaVersion: Schema.Literal(3),
      notificationId: Schema.String,
      organizerDiscordId: Schema.String,
      organizerCharacter: Schema.Struct({
        lvl: Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
        nick: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(255).annotate({
            expected: "a value with a length of at most 255",
          }),
        ),
        accountId: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(255).annotate({
            expected: "a value with a length of at most 255",
          }),
        ),
        characterId: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(255).annotate({
            expected: "a value with a length of at most 255",
          }),
        ),
        prof: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(100).annotate({
            expected: "a value with a length of at most 100",
          }),
        ),
        icon: Schema.String.check(
          Schema.isMinLength(1).annotate({
            expected: "a value with a length of at least 1",
          }),
        ).check(
          Schema.isMaxLength(2048).annotate({
            expected: "a value with a length of at most 2048",
          }),
        ),
        clan: Schema.optionalKey(
          Schema.Struct({
            id: Schema.optionalKey(
              Schema.Number.check(
                Schema.isFinite().annotate({ expected: "a finite number" }),
              ),
            ),
            name: Schema.optionalKey(
              Schema.String.check(
                Schema.isMaxLength(255).annotate({
                  expected: "a value with a length of at most 255",
                }),
              ),
            ),
          }),
        ),
      }),
      guildIds: Schema.Array(Schema.String),
      world: Schema.String,
      description: Schema.optionalKey(Schema.String),
      minLvl: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      maxLvl: Schema.optionalKey(
        Schema.Number.check(
          Schema.isFinite().annotate({ expected: "a finite number" }),
        ),
      ),
      status: Schema.Literal("ACTIVE"),
      revision: Schema.Number.check(
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
      createdAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      updatedAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      expiresAt: Schema.String.annotate({ format: "date-time" }).check(
        Schema.isPattern(
          new RegExp(
            "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
          ),
        ).annotate({
          expected:
            "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
        }),
      ),
      viewer: Schema.Literals(["ORGANIZER", "PARTICIPANT"]),
      participants: Schema.Record(
        Schema.String,
        Schema.Struct({
          participantId: Schema.String,
          discordId: Schema.String,
          character: Schema.Struct({
            lvl: Schema.Number.check(
              Schema.isFinite().annotate({ expected: "a finite number" }),
            ),
            nick: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ).check(
              Schema.isMaxLength(255).annotate({
                expected: "a value with a length of at most 255",
              }),
            ),
            accountId: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ).check(
              Schema.isMaxLength(255).annotate({
                expected: "a value with a length of at most 255",
              }),
            ),
            characterId: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ).check(
              Schema.isMaxLength(255).annotate({
                expected: "a value with a length of at most 255",
              }),
            ),
            prof: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ).check(
              Schema.isMaxLength(100).annotate({
                expected: "a value with a length of at most 100",
              }),
            ),
            icon: Schema.String.check(
              Schema.isMinLength(1).annotate({
                expected: "a value with a length of at least 1",
              }),
            ).check(
              Schema.isMaxLength(2048).annotate({
                expected: "a value with a length of at most 2048",
              }),
            ),
            clan: Schema.optionalKey(
              Schema.Struct({
                id: Schema.optionalKey(
                  Schema.Number.check(
                    Schema.isFinite().annotate({ expected: "a finite number" }),
                  ),
                ),
                name: Schema.optionalKey(
                  Schema.String.check(
                    Schema.isMaxLength(255).annotate({
                      expected: "a value with a length of at most 255",
                    }),
                  ),
                ),
              }),
            ),
          }),
          partyPresence: Schema.Literals(["OUTSIDE", "IN_PARTY"]),
          createdAt: Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
          updatedAt: Schema.String.annotate({ format: "date-time" }).check(
            Schema.isPattern(
              new RegExp(
                "^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
              ),
            ).annotate({
              expected:
                "a string matching the RegExp ^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$",
            }),
          ),
        }),
      ),
      ownedParticipantIds: Schema.optionalKey(Schema.Array(Schema.String)),
    }),
  ),
  notificationId: Schema.optionalKey(Schema.String),
  revision: Schema.optionalKey(
    Schema.Number.check(Schema.isInt().annotate({ expected: "an integer" }))
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
  ),
}).annotate({ identifier: "PartyReadyRoomClientUpdateDto_Output" });

export type PartyReadyRoomParticipantActionDto = {
  readonly expectedRevision: number;
  readonly participantId: string;
};

export const PartyReadyRoomParticipantActionDto = Schema.Struct({
  expectedRevision: Schema.Number.check(
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
  participantId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(100).annotate({
      expected: "a value with a length of at most 100",
    }),
  ),
}).annotate({ identifier: "PartyReadyRoomParticipantActionDto" });

export type PartyReadyRoomResolveInvitationTargetsDto = {
  readonly participantIds: ReadonlyArray<string>;
};

export const PartyReadyRoomResolveInvitationTargetsDto = Schema.Struct({
  participantIds: Schema.Array(
    Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
  )
    .check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    )
    .check(
      Schema.isMaxLength(100).annotate({
        expected: "a value with a length of at most 100",
      }),
    ),
}).annotate({ identifier: "PartyReadyRoomResolveInvitationTargetsDto" });

export type PartyReadyRoomInvitationTargetsDto_Output = {
  readonly targets: ReadonlyArray<{
    readonly participantId: string;
    readonly characterId: string;
  }>;
};

export const PartyReadyRoomInvitationTargetsDto_Output = Schema.Struct({
  targets: Schema.Array(
    Schema.Struct({ participantId: Schema.String, characterId: Schema.String }),
  ),
}).annotate({ identifier: "PartyReadyRoomInvitationTargetsDto_Output" });

export type PartyReadyRoomObservationDto = {
  readonly memberCharacterIds: ReadonlyArray<string>;
  readonly organizerAccountId: string;
  readonly organizerCharacterId: string;
};

export const PartyReadyRoomObservationDto = Schema.Struct({
  memberCharacterIds: Schema.Array(
    Schema.String.check(
      Schema.isMinLength(1).annotate({
        expected: "a value with a length of at least 1",
      }),
    ).check(
      Schema.isMaxLength(255).annotate({
        expected: "a value with a length of at most 255",
      }),
    ),
  ).check(
    Schema.isMaxLength(20).annotate({
      expected: "a value with a length of at most 20",
    }),
  ),
  organizerAccountId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
  organizerCharacterId: Schema.String.check(
    Schema.isMinLength(1).annotate({
      expected: "a value with a length of at least 1",
    }),
  ).check(
    Schema.isMaxLength(255).annotate({
      expected: "a value with a length of at most 255",
    }),
  ),
}).annotate({ identifier: "PartyReadyRoomObservationDto" });

export type PartyReadyRoomExpectedRevisionDto = {
  readonly expectedRevision: number;
};

export const PartyReadyRoomExpectedRevisionDto = Schema.Struct({
  expectedRevision: Schema.Number.check(
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
}).annotate({ identifier: "PartyReadyRoomExpectedRevisionDto" });

export type PartyReadyRoomControllerList200 =
  ReadonlyArray<PartyReadyRoomProjectionDto_Output>;

export const PartyReadyRoomControllerList200 = Schema.Array(
  PartyReadyRoomProjectionDto_Output,
);

export type PartyReadyRoomControllerCreateRequestJson = CreatePartyGatheringDto;

export const PartyReadyRoomControllerCreateRequestJson =
  CreatePartyGatheringDto;

export type PartyReadyRoomControllerCreate201 =
  PartyReadyRoomProjectionDto_Output;

export const PartyReadyRoomControllerCreate201 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerGetPathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerGetPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerGet200 = PartyReadyRoomProjectionDto_Output;

export const PartyReadyRoomControllerGet200 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerApplyPathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerApplyPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerApplyRequestJson =
  PartyReadyRoomApplicationDto;

export const PartyReadyRoomControllerApplyRequestJson =
  PartyReadyRoomApplicationDto;

export type PartyReadyRoomControllerApply201 =
  PartyReadyRoomProjectionDto_Output;

export const PartyReadyRoomControllerApply201 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerWithdrawPathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerWithdrawPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerWithdrawRequestJson =
  PartyReadyRoomParticipantIdentityDto;

export const PartyReadyRoomControllerWithdrawRequestJson =
  PartyReadyRoomParticipantIdentityDto;

export type PartyReadyRoomControllerWithdraw200 =
  PartyReadyRoomClientUpdateDto_Output;

export const PartyReadyRoomControllerWithdraw200 =
  PartyReadyRoomClientUpdateDto_Output;

export type PartyReadyRoomControllerRemovePathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerRemovePathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerRemoveRequestJson =
  PartyReadyRoomParticipantActionDto;

export const PartyReadyRoomControllerRemoveRequestJson =
  PartyReadyRoomParticipantActionDto;

export type PartyReadyRoomControllerRemove200 =
  PartyReadyRoomClientUpdateDto_Output;

export const PartyReadyRoomControllerRemove200 =
  PartyReadyRoomClientUpdateDto_Output;

export type PartyReadyRoomControllerResolveInvitationTargetsPathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerResolveInvitationTargetsPathParams =
  Schema.Struct({ notificationId: Schema.String });

export type PartyReadyRoomControllerResolveInvitationTargetsRequestJson =
  PartyReadyRoomResolveInvitationTargetsDto;

export const PartyReadyRoomControllerResolveInvitationTargetsRequestJson =
  PartyReadyRoomResolveInvitationTargetsDto;

export type PartyReadyRoomControllerResolveInvitationTargets201 =
  PartyReadyRoomInvitationTargetsDto_Output;

export const PartyReadyRoomControllerResolveInvitationTargets201 =
  PartyReadyRoomInvitationTargetsDto_Output;

export type PartyReadyRoomControllerObservePartyPathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerObservePartyPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerObservePartyRequestJson =
  PartyReadyRoomObservationDto;

export const PartyReadyRoomControllerObservePartyRequestJson =
  PartyReadyRoomObservationDto;

export type PartyReadyRoomControllerObserveParty201 =
  PartyReadyRoomProjectionDto_Output;

export const PartyReadyRoomControllerObserveParty201 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerCancelPathParams = {
  readonly notificationId: string;
};

export const PartyReadyRoomControllerCancelPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerCancelRequestJson =
  PartyReadyRoomExpectedRevisionDto;

export const PartyReadyRoomControllerCancelRequestJson =
  PartyReadyRoomExpectedRevisionDto;

export type PartyReadyRoomControllerCancel201 =
  PartyReadyRoomClientUpdateDto_Output;

export const PartyReadyRoomControllerCancel201 =
  PartyReadyRoomClientUpdateDto_Output;
