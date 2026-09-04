/** Shared input and output schemas for the roles feature. */
import * as Schema from "effect/Schema";
import { CapabilitySchema } from "@lootlog/schema/permissions";
import { FiniteNumber } from "#src/contracts/scalars";

export type RoleResponse = typeof RoleResponse.Type;

export const MemberRole = Schema.Struct({
  id: Schema.String,
  guildId: Schema.String,
  name: Schema.String,
  color: Schema.Union([FiniteNumber, Schema.Null]),
  position: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
  permissions: Schema.Array(CapabilitySchema),
  lvlRangeFrom: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
  lvlRangeTo: Schema.optionalKey(Schema.Union([FiniteNumber, Schema.Null])),
});

export const RoleResponse = MemberRole.annotate({
  identifier: "RoleResponseDto_Output",
});

export type UpdateRolePermissionsRequest =
  typeof UpdateRolePermissionsRequest.Type;

export const UpdateRolePermissionsRequest = Schema.Struct({
  permissions: Schema.Array(CapabilitySchema),
  lvlRangeFrom: FiniteNumber,
  lvlRangeTo: FiniteNumber,
}).annotate({ identifier: "UpdateRolePermissionsDto" });

export type RoleOrganizationPath = typeof RoleOrganizationPath.Type;

export const RoleOrganizationPath = Schema.Struct({
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});

export type RolesResponse = typeof RolesResponse.Type;

export const RolesResponse = Schema.Array(RoleResponse);

export type RolePath = typeof RolePath.Type;

export const RolePath = Schema.Struct({
  roleId: Schema.String.annotate({ examples: ["role_123"] }),
  guildId: Schema.Json.annotate({ expected: "JSON value" }),
});
