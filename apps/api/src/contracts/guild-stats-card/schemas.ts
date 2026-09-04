/** Shared input and output schemas for the guild-stats-card feature. */
import * as Schema from "effect/Schema";

export type RefreshStatsCardResponseDto_Output =
  typeof RefreshStatsCardResponseDto_Output.Type;

export const RefreshStatsCardResponseDto_Output = Schema.Struct({
  nextRefreshAt: Schema.String,
}).annotate({ identifier: "RefreshStatsCardResponseDto_Output" });

export type AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams =
  typeof AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams.Type;

export const AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams =
  Schema.Struct({ guildId: Schema.String });

export type AuthenticatedGuildStatsCardControllerRefreshStatsCard200 =
  typeof AuthenticatedGuildStatsCardControllerRefreshStatsCard200.Type;

export const AuthenticatedGuildStatsCardControllerRefreshStatsCard200 =
  RefreshStatsCardResponseDto_Output;
