/** Transport schemas owned by the party-ready-room HTTP module. */
import * as Schema from "effect/Schema";
import { DateTimeString, FiniteNumber } from "../scalars.js";

export type PartyReadyRoomProjectionDto_Output =
  typeof PartyReadyRoomProjectionDto_Output.Type;

export const PartyReadyRoomProjectionDto_Output = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  notificationId: Schema.String,
  organizerDiscordId: Schema.String,
  organizerCharacter: Schema.Struct({
    lvl: FiniteNumber,
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
        id: Schema.optionalKey(FiniteNumber),
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
  minLvl: Schema.optionalKey(FiniteNumber),
  maxLvl: Schema.optionalKey(FiniteNumber),
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
  createdAt: DateTimeString,
  updatedAt: DateTimeString,
  expiresAt: DateTimeString,
  viewer: Schema.Literals(["ORGANIZER", "PARTICIPANT"]),
  participants: Schema.Record(
    Schema.String,
    Schema.Struct({
      participantId: Schema.String,
      discordId: Schema.String,
      character: Schema.Struct({
        lvl: FiniteNumber,
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
            id: Schema.optionalKey(FiniteNumber),
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
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
    }),
  ),
  ownedParticipantIds: Schema.optionalKey(Schema.Array(Schema.String)),
}).annotate({ identifier: "PartyReadyRoomProjectionDto_Output" });

export type CreatePartyGatheringDto = typeof CreatePartyGatheringDto.Type;

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
    lvl: FiniteNumber,
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
        id: Schema.optionalKey(FiniteNumber),
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
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(500).annotate({
        expected: "a value less than or equal to 500",
      }),
    ),
  ),
  maxLvl: Schema.optionalKey(
    FiniteNumber.check(
      Schema.isGreaterThanOrEqualTo(1).annotate({
        expected: "a value greater than or equal to 1",
      }),
    ).check(
      Schema.isLessThanOrEqualTo(500).annotate({
        expected: "a value less than or equal to 500",
      }),
    ),
  ),
}).annotate({ identifier: "CreatePartyGatheringDto" });

export type PartyReadyRoomApplicationDto =
  typeof PartyReadyRoomApplicationDto.Type;

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
    lvl: FiniteNumber,
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
        id: Schema.optionalKey(FiniteNumber),
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

export type PartyReadyRoomParticipantIdentityDto =
  typeof PartyReadyRoomParticipantIdentityDto.Type;

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

export type PartyReadyRoomClientUpdateDto_Output =
  typeof PartyReadyRoomClientUpdateDto_Output.Type;

export const PartyReadyRoomClientUpdateDto_Output = Schema.Struct({
  schemaVersion: Schema.Literal(3),
  type: Schema.Literals(["UPSERT", "REMOVE"]),
  projection: Schema.optionalKey(
    Schema.Struct({
      schemaVersion: Schema.Literal(3),
      notificationId: Schema.String,
      organizerDiscordId: Schema.String,
      organizerCharacter: Schema.Struct({
        lvl: FiniteNumber,
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
            id: Schema.optionalKey(FiniteNumber),
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
      minLvl: Schema.optionalKey(FiniteNumber),
      maxLvl: Schema.optionalKey(FiniteNumber),
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
      createdAt: DateTimeString,
      updatedAt: DateTimeString,
      expiresAt: DateTimeString,
      viewer: Schema.Literals(["ORGANIZER", "PARTICIPANT"]),
      participants: Schema.Record(
        Schema.String,
        Schema.Struct({
          participantId: Schema.String,
          discordId: Schema.String,
          character: Schema.Struct({
            lvl: FiniteNumber,
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
                id: Schema.optionalKey(FiniteNumber),
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
          createdAt: DateTimeString,
          updatedAt: DateTimeString,
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

export type PartyReadyRoomParticipantActionDto =
  typeof PartyReadyRoomParticipantActionDto.Type;

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

export type PartyReadyRoomResolveInvitationTargetsDto =
  typeof PartyReadyRoomResolveInvitationTargetsDto.Type;

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

export type PartyReadyRoomInvitationTargetsDto_Output =
  typeof PartyReadyRoomInvitationTargetsDto_Output.Type;

export const PartyReadyRoomInvitationTargetsDto_Output = Schema.Struct({
  targets: Schema.Array(
    Schema.Struct({ participantId: Schema.String, characterId: Schema.String }),
  ),
}).annotate({ identifier: "PartyReadyRoomInvitationTargetsDto_Output" });

export type PartyReadyRoomObservationDto =
  typeof PartyReadyRoomObservationDto.Type;

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

export type PartyReadyRoomExpectedRevisionDto =
  typeof PartyReadyRoomExpectedRevisionDto.Type;

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
  typeof PartyReadyRoomControllerList200.Type;

export const PartyReadyRoomControllerList200 = Schema.Array(
  PartyReadyRoomProjectionDto_Output,
);

export type PartyReadyRoomControllerCreateRequestJson =
  typeof PartyReadyRoomControllerCreateRequestJson.Type;

export const PartyReadyRoomControllerCreateRequestJson =
  CreatePartyGatheringDto;

export type PartyReadyRoomControllerCreate201 =
  typeof PartyReadyRoomControllerCreate201.Type;

export const PartyReadyRoomControllerCreate201 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerGetPathParams =
  typeof PartyReadyRoomControllerGetPathParams.Type;

export const PartyReadyRoomControllerGetPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerGet200 =
  typeof PartyReadyRoomControllerGet200.Type;

export const PartyReadyRoomControllerGet200 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerApplyPathParams =
  typeof PartyReadyRoomControllerApplyPathParams.Type;

export const PartyReadyRoomControllerApplyPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerApplyRequestJson =
  typeof PartyReadyRoomControllerApplyRequestJson.Type;

export const PartyReadyRoomControllerApplyRequestJson =
  PartyReadyRoomApplicationDto;

export type PartyReadyRoomControllerApply201 =
  typeof PartyReadyRoomControllerApply201.Type;

export const PartyReadyRoomControllerApply201 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerWithdrawPathParams =
  typeof PartyReadyRoomControllerWithdrawPathParams.Type;

export const PartyReadyRoomControllerWithdrawPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerWithdrawRequestJson =
  typeof PartyReadyRoomControllerWithdrawRequestJson.Type;

export const PartyReadyRoomControllerWithdrawRequestJson =
  PartyReadyRoomParticipantIdentityDto;

export type PartyReadyRoomControllerWithdraw200 =
  typeof PartyReadyRoomControllerWithdraw200.Type;

export const PartyReadyRoomControllerWithdraw200 =
  PartyReadyRoomClientUpdateDto_Output;

export type PartyReadyRoomControllerRemovePathParams =
  typeof PartyReadyRoomControllerRemovePathParams.Type;

export const PartyReadyRoomControllerRemovePathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerRemoveRequestJson =
  typeof PartyReadyRoomControllerRemoveRequestJson.Type;

export const PartyReadyRoomControllerRemoveRequestJson =
  PartyReadyRoomParticipantActionDto;

export type PartyReadyRoomControllerRemove200 =
  typeof PartyReadyRoomControllerRemove200.Type;

export const PartyReadyRoomControllerRemove200 =
  PartyReadyRoomClientUpdateDto_Output;

export type PartyReadyRoomControllerResolveInvitationTargetsPathParams =
  typeof PartyReadyRoomControllerResolveInvitationTargetsPathParams.Type;

export const PartyReadyRoomControllerResolveInvitationTargetsPathParams =
  Schema.Struct({ notificationId: Schema.String });

export type PartyReadyRoomControllerResolveInvitationTargetsRequestJson =
  typeof PartyReadyRoomControllerResolveInvitationTargetsRequestJson.Type;

export const PartyReadyRoomControllerResolveInvitationTargetsRequestJson =
  PartyReadyRoomResolveInvitationTargetsDto;

export type PartyReadyRoomControllerResolveInvitationTargets201 =
  typeof PartyReadyRoomControllerResolveInvitationTargets201.Type;

export const PartyReadyRoomControllerResolveInvitationTargets201 =
  PartyReadyRoomInvitationTargetsDto_Output;

export type PartyReadyRoomControllerObservePartyPathParams =
  typeof PartyReadyRoomControllerObservePartyPathParams.Type;

export const PartyReadyRoomControllerObservePartyPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerObservePartyRequestJson =
  typeof PartyReadyRoomControllerObservePartyRequestJson.Type;

export const PartyReadyRoomControllerObservePartyRequestJson =
  PartyReadyRoomObservationDto;

export type PartyReadyRoomControllerObserveParty201 =
  typeof PartyReadyRoomControllerObserveParty201.Type;

export const PartyReadyRoomControllerObserveParty201 =
  PartyReadyRoomProjectionDto_Output;

export type PartyReadyRoomControllerCancelPathParams =
  typeof PartyReadyRoomControllerCancelPathParams.Type;

export const PartyReadyRoomControllerCancelPathParams = Schema.Struct({
  notificationId: Schema.String,
});

export type PartyReadyRoomControllerCancelRequestJson =
  typeof PartyReadyRoomControllerCancelRequestJson.Type;

export const PartyReadyRoomControllerCancelRequestJson =
  PartyReadyRoomExpectedRevisionDto;

export type PartyReadyRoomControllerCancel201 =
  typeof PartyReadyRoomControllerCancel201.Type;

export const PartyReadyRoomControllerCancel201 =
  PartyReadyRoomClientUpdateDto_Output;
