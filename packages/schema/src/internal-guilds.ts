import { Schema } from "effect";
import { FiniteNumber } from "./http-scalars.js";

export const INTERNAL_USER_PERMISSIONS_PATH =
  "/internal/guilds/user-permissions";

export const InternalUserPermissionsQuery = Schema.Struct({
  discordId: Schema.String,
  userId: Schema.String,
  freshness: Schema.optionalKey(Schema.Literal("required")),
});

export type InternalUserPermissionsQuery =
  typeof InternalUserPermissionsQuery.Type;

export const INTERNAL_MEMBER_IDENTITY_PATH =
  "/internal/guilds/:guildId/members/:discordId/identity";

export const InternalMemberIdentityPath = Schema.Struct({
  guildId: Schema.String,
  discordId: Schema.String,
});

export type InternalMemberIdentityPath = typeof InternalMemberIdentityPath.Type;

export const internalMemberIdentityPath = ({
  guildId,
  discordId,
}: InternalMemberIdentityPath) =>
  INTERNAL_MEMBER_IDENTITY_PATH.replace(
    ":guildId",
    encodeURIComponent(guildId),
  ).replace(":discordId", encodeURIComponent(discordId));

export const InternalMemberIdentityResponse = Schema.Struct({
  userId: Schema.String,
  memberId: FiniteNumber,
}).annotate({ identifier: "InternalMemberIdentityDto" });

export type InternalMemberIdentityResponse =
  typeof InternalMemberIdentityResponse.Type;
