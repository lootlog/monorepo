import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { R2Module } from "#src/shared/modules/r2/r2.module";
import { RedisModule } from "#src/shared/modules/redis/redis.module";
import {
  BattlesController,
  PublicBattlesController,
} from "./battles.controller.js";
import { InternalController } from "./internal.controller.js";
import { BattlesService } from "./battles.service.js";
import { BattleAnalyticsService } from "./services/battle-analytics.service.js";
import { BattleAnalyticsCacheService } from "./services/battle-analytics-cache.service.js";
import { BattleAnalyticsDomainService } from "./services/battle-analytics-domain.service.js";
import { BattleAnalyticsPagingService } from "./services/battle-analytics-paging.service.js";
import { BattleAnalyticsQueryService } from "./services/battle-analytics-query.service.js";
import { BattleListFilterService } from "./services/battle-list-filter.service.js";
import { BattleMetadataService } from "./services/battle-metadata.service.js";
import { AbyssSeasonCalculatorService } from "./services/abyss-season-calculator.service.js";
import { BattleSummaryCalculatorService } from "./services/battle-summary-calculator.service.js";
import { CombatProfileCalculatorService } from "./services/combat-profile-calculator.service.js";
import { HeadToHeadCalculatorService } from "./services/head-to-head-calculator.service.js";
import { PlayerVsPlayerCalculatorService } from "./services/player-vs-player-calculator.service.js";
import { PaginationService } from "./services/pagination.service.js";
import { DeleteUserBattlesProcessor } from "./delete-user-battles.processor.js";
import { DELETE_USER_BATTLES_QUEUE } from "./constants/delete-user-battles-queue.constant.js";

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
