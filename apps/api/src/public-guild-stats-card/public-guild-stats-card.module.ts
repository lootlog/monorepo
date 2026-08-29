import { Module } from "@nestjs/common";
import { PrismaModule } from "#src/db/prisma.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { AuthenticatedGuildStatsCardController } from "./authenticated-guild-stats-card.controller.js";
import { PublicGuildStatsCardController } from "./public-guild-stats-card.controller.js";
import { PublicGuildStatsCardService } from "./public-guild-stats-card.service.js";

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [
    AuthenticatedGuildStatsCardController,
    PublicGuildStatsCardController,
  ],
  providers: [PublicGuildStatsCardService],
})
export class PublicGuildStatsCardModule {}
