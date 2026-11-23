import { Schema } from "effect";
import { FiniteNumber } from "./http-scalars.js";

export const InternalUserPermissionsQuery = Schema.Struct({
  discordId: Schema.String,
  userId: Schema.String,
  freshness: Schema.optionalKey(Schema.Literal("required")),
});

export type InternalUserPermissionsQuery =
  typeof InternalUserPermissionsQuery.Type;

export const InternalMemberIdentityResponse = Schema.Struct({
  userId: Schema.String,
  memberId: FiniteNumber,
}).annotate({ identifier: "InternalMemberIdentityDto" });

export type InternalMemberIdentityResponse =
  typeof InternalMemberIdentityResponse.Type;
