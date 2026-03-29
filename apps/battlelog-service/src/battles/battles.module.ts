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
    BattleAnalyticsService,
    PaginationService,
    DeleteUserBattlesProcessor,
  ],
})
export class BattlesModule {}
