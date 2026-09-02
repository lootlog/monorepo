import { Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { LootsController } from "./loots.controller.js";
import { LootsService } from "./loots.service.js";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { MembersModule } from "#src/members/members.module";
import { PlayersModule } from "#src/players/players.module";
import { NpcsModule } from "#src/npcs/npcs.module";
import { ItemsModule } from "#src/items/items.module";
import { GuildsModule } from "#src/guilds/guilds.module";
import { LootlogConfigModule } from "#src/lootlog-config/lootlog-config.module";
import { UserLootlogConfigModule } from "#src/user-lootlog-config/user-lootlog-config.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { RedlockModule } from "#src/lib/redlock/redlock.module";
import { LootAllocationService } from "./loot-allocation.service.js";
import { LootSubmissionAcceptanceService } from "./loot-submission-acceptance.service.js";
import { LootQueryService } from "./services/loot-query.service.js";
import { LootQueryRepository } from "./services/loot-query.repository.js";
import { LootCommentService } from "./services/loot-comment.service.js";
import { LootStatsService } from "./services/loot-stats.service.js";
import { LootsRepository } from "./loots.repository.js";
import { LootAllocationRepository } from "./loot-allocation.repository.js";
import { LootSubmissionAcceptanceRepository } from "./loot-submission-acceptance.repository.js";

@Module({
  imports: [
    MembersModule,
    PlayersModule,
    NpcsModule,
    ItemsModule,
    GuildsModule,
    LootlogConfigModule,
    UserLootlogConfigModule,
    RedisModule,
    RedlockModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  controllers: [LootsController],
  providers: [
    LootAllocationService,
    LootAllocationRepository,
    LootSubmissionAcceptanceService,
    LootSubmissionAcceptanceRepository,
    LootsService,
    LootQueryService,
    LootQueryRepository,
    LootCommentService,
    LootStatsService,
    LootsRepository,
  ],
  exports: [LootsService],
})
export class LootsModule {}
