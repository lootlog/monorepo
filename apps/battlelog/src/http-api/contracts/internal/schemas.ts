/** Transport schemas owned by the internal HTTP module. */
import * as Schema from "effect/Schema";

export type DeleteUserDataDto = typeof DeleteUserDataDto.Type;

export const DeleteUserDataDto = Schema.Struct({
  userId: Schema.String,
}).annotate({ identifier: "DeleteUserDataDto" });

export type BattleAcceptedResponseDto_Output =
  typeof BattleAcceptedResponseDto_Output.Type;

export const BattleAcceptedResponseDto_Output = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
}).annotate({ identifier: "BattleAcceptedResponseDto_Output" });

export type InternalControllerDeleteUserDataRequestJson =
  typeof InternalControllerDeleteUserDataRequestJson.Type;

export const InternalControllerDeleteUserDataRequestJson = DeleteUserDataDto;

export type InternalControllerDeleteUserData201 =
  typeof InternalControllerDeleteUserData201.Type;

export const InternalControllerDeleteUserData201 =
  BattleAcceptedResponseDto_Output;

export const InternalControllerListPvpWinsQuery = Schema.Struct({
  afterBattleId: Schema.optional(Schema.String),
  since: Schema.String,
  before: Schema.String,
  limit: Schema.optional(Schema.NumberFromString),
});

export const InternalControllerListPvpWins200 = Schema.Struct({
  wins: Schema.Array(
    Schema.Struct({
      battleId: Schema.String,
      userId: Schema.String,
      wonAt: Schema.String,
    }),
  ),
}).annotate({ identifier: "PvpWinsResponseDto" });
