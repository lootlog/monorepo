/** Transport schemas owned by the internal HTTP module. */
import * as Schema from "effect/Schema";

type DeleteUserDataDto = typeof DeleteUserDataDto.Type;

const DeleteUserDataDto = Schema.Struct({
  userId: Schema.String,
}).annotate({ identifier: "DeleteUserDataDto" });

type BattleAcceptedResponseDto_Output =
  typeof BattleAcceptedResponseDto_Output.Type;

const BattleAcceptedResponseDto_Output = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
}).annotate({ identifier: "BattleAcceptedResponseDto_Output" });

export type InternalControllerDeleteUserDataRequestJson =
  typeof InternalControllerDeleteUserDataRequestJson.Type;

export const InternalControllerDeleteUserDataRequestJson = DeleteUserDataDto;

export type InternalControllerDeleteUserData201 =
  typeof InternalControllerDeleteUserData201.Type;

export const InternalControllerDeleteUserData201 =
  BattleAcceptedResponseDto_Output;
