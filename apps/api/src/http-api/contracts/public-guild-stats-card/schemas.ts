/** Transport schemas owned by the public-guild-stats-card HTTP module. */
import * as Schema from "effect/Schema";

export type PublicGuildStatsCardControllerGetStatsCardPathParams = {
  readonly guildId: string;
};

export const PublicGuildStatsCardControllerGetStatsCardPathParams =
  Schema.Struct({ guildId: Schema.String });
