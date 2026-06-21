import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { R2Module } from "src/shared/modules/r2/r2.module";
import { RedisModule } from "src/shared/modules/redis/redis.module";
import {
  BattlesController,
  PublicBattlesController,
} from "./battles.controller";
import { InternalController } from "./internal.controller";
import { BattlesService } from "./battles.service";
import { BattleAnalyticsService } from "./services/battle-analytics.service";
import { BattleAnalyticsCacheService } from "./services/battle-analytics-cache.service";
import { BattleAnalyticsDomainService } from "./services/battle-analytics-domain.service";
import { BattleAnalyticsPagingService } from "./services/battle-analytics-paging.service";
import { BattleAnalyticsQueryService } from "./services/battle-analytics-query.service";
import { BattleListFilterService } from "./services/battle-list-filter.service";
import { BattleMetadataService } from "./services/battle-metadata.service";
import { AbyssSeasonCalculatorService } from "./services/abyss-season-calculator.service";
import { BattleSummaryCalculatorService } from "./services/battle-summary-calculator.service";
import { CombatProfileCalculatorService } from "./services/combat-profile-calculator.service";
import { HeadToHeadCalculatorService } from "./services/head-to-head-calculator.service";
import { PlayerVsPlayerCalculatorService } from "./services/player-vs-player-calculator.service";
import { PaginationService } from "./services/pagination.service";
import { DeleteUserBattlesProcessor } from "./delete-user-battles.processor";
import { DELETE_USER_BATTLES_QUEUE } from "./constants/delete-user-battles-queue.constant";

@Module({
  imports: [
    R2Module,
    RedisModule,
    BullModule.registerQueue({ name: DELETE_USER_BATTLES_QUEUE }),
  ],
  controllers: [BattlesController, PublicBattlesController, InternalController],
  providers: [
    BattlesService,
    BattleListFilterService,
    BattleMetadataService,
    BattleAnalyticsService,
    BattleAnalyticsCacheService,
    BattleAnalyticsDomainService,
    BattleAnalyticsPagingService,
    BattleAnalyticsQueryService,
    AbyssSeasonCalculatorService,
    BattleSummaryCalculatorService,
    CombatProfileCalculatorService,
    HeadToHeadCalculatorService,
    PlayerVsPlayerCalculatorService,
    PaginationService,
    DeleteUserBattlesProcessor,
  ],
})
export class BattlesModule {}
