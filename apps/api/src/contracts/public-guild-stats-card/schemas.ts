/** Shared input and output schemas for the public-guild-stats-card feature. */
import * as Schema from "effect/Schema";

export type PublicGuildStatsCardControllerGetStatsCardPathParams =
  typeof PublicGuildStatsCardControllerGetStatsCardPathParams.Type;

export const PublicGuildStatsCardControllerGetStatsCardPathParams =
  Schema.Struct({ guildId: Schema.String });
