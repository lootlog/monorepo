/** Shared input and output schemas for the internal feature. */
import * as Schema from "effect/Schema";
import { OrganizationPermissionsResponse } from "#src/contracts/guilds/schemas";

type InternalOrganizationPermissionsResponse =
  typeof InternalOrganizationPermissionsResponse.Type;

const InternalOrganizationPermissionsResponse = Schema.Struct(
  OrganizationPermissionsResponse.fields,
).annotate({ identifier: "UserGuildPermissionsDto" });

export type InternalUserPermissionsResponse =
  typeof InternalUserPermissionsResponse.Type;

export const InternalUserPermissionsResponse = Schema.Array(
  InternalOrganizationPermissionsResponse,
);

export type OrganizationLookupPath = typeof OrganizationLookupPath.Type;

export const OrganizationLookupPath = Schema.Struct({
  idOrVanityUrl: Schema.String,
});
