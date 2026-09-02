import { Module } from "@nestjs/common";
import { DrizzleDatabaseModule } from "#src/database/drizzle/drizzle-database.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { AuthenticatedGuildStatsCardController } from "./authenticated-guild-stats-card.controller.js";
import { PublicGuildStatsCardController } from "./public-guild-stats-card.controller.js";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service.js";
import { PublicGuildStatsCardRepository } from "./public-guild-stats-card.repository.js";

@Module({
  imports: [DrizzleDatabaseModule, RedisModule],
  controllers: [
    AuthenticatedGuildStatsCardController,
    PublicGuildStatsCardController,
  ],
  providers: [PublicGuildStatsCardService, PublicGuildStatsCardRepository],
})
export class PublicGuildStatsCardModule {}
