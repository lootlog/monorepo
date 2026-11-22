import * as Schema from "effect/Schema";

export type PublicStatsCardOrganizationPath =
  typeof PublicStatsCardOrganizationPath.Type;

export const PublicStatsCardOrganizationPath = Schema.Struct({
  guildId: Schema.String,
});
