/** Transport schemas owned by the internal HTTP module. */
import * as Schema from "effect/Schema";

export type DeleteUserDataDto = { readonly userId: string };

export const DeleteUserDataDto = Schema.Struct({
  userId: Schema.String,
}).annotate({ identifier: "DeleteUserDataDto" });

export type BattleAcceptedResponseDto_Output = { readonly status: "ACCEPTED" };

export const BattleAcceptedResponseDto_Output = Schema.Struct({
  status: Schema.Literal("ACCEPTED"),
}).annotate({ identifier: "BattleAcceptedResponseDto_Output" });

export type InternalControllerDeleteUserDataRequestJson = DeleteUserDataDto;

export const InternalControllerDeleteUserDataRequestJson = DeleteUserDataDto;

export type InternalControllerDeleteUserData201 =
  BattleAcceptedResponseDto_Output;

export const InternalControllerDeleteUserData201 =
  BattleAcceptedResponseDto_Output;
