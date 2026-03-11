import { Module } from "@nestjs/common";
import { PrismaModule } from "src/shared/modules/prisma/prisma.module";
import { R2Module } from "src/shared/modules/r2/r2.module";
import { RedisModule } from "src/shared/modules/redis/redis.module";
import {
  BattlesController,
  PublicBattlesController,
} from "./battles.controller";
import { BattlesService } from "./battles.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { PaginationService } from "./services/pagination.service";

@Module({
  imports: [PrismaModule, R2Module, RedisModule],
  controllers: [BattlesController, PublicBattlesController],
  providers: [BattlesService, BattleAnalyticsService, PaginationService],
})
export class BattlesModule {}
