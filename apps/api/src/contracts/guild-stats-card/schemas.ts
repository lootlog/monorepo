/** Shared input and output schemas for the guild-stats-card feature. */
import * as Schema from "effect/Schema";

export type RefreshStatsCardResponse = typeof RefreshStatsCardResponse.Type;

export const RefreshStatsCardResponse = Schema.Struct({
  nextRefreshAt: Schema.String,
}).annotate({ identifier: "RefreshStatsCardResponseDto_Output" });

export type StatsCardOrganizationPath = typeof StatsCardOrganizationPath.Type;

export const StatsCardOrganizationPath = Schema.Struct({
  guildId: Schema.String,
});
