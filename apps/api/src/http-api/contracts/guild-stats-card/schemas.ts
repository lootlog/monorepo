/** Transport schemas owned by the guild-stats-card HTTP module. */
import * as Schema from "effect/Schema";

export type RefreshStatsCardResponseDto_Output = {
  readonly nextRefreshAt: string;
};

export const RefreshStatsCardResponseDto_Output = Schema.Struct({
  nextRefreshAt: Schema.String,
}).annotate({ identifier: "RefreshStatsCardResponseDto_Output" });

export type AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams = {
  readonly guildId: string;
};

export const AuthenticatedGuildStatsCardControllerRefreshStatsCardPathParams =
  Schema.Struct({ guildId: Schema.String });

export type AuthenticatedGuildStatsCardControllerRefreshStatsCard200 =
  RefreshStatsCardResponseDto_Output;

export const AuthenticatedGuildStatsCardControllerRefreshStatsCard200 =
  RefreshStatsCardResponseDto_Output;
