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
import { PrismaModule } from "#src/db/prisma.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { RedlockModule } from "#src/lib/redlock/redlock.module";
import { LootAllocationService } from "./loot-allocation.service.js";
import { LootSubmissionAcceptanceService } from "./loot-submission-acceptance.service.js";
import { LootQueryService } from "./services/loot-query.service.js";
import { LootCommentService } from "./services/loot-comment.service.js";
import { LootStatsService } from "./services/loot-stats.service.js";

@Module({
  imports: [
    MembersModule,
    PlayersModule,
    NpcsModule,
    ItemsModule,
    GuildsModule,
    LootlogConfigModule,
    UserLootlogConfigModule,
    PrismaModule,
    RedisModule,
    RedlockModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  controllers: [LootsController],
  providers: [
    LootAllocationService,
    LootSubmissionAcceptanceService,
    LootsService,
    LootQueryService,
    LootCommentService,
    LootStatsService,
  ],
  exports: [LootsService],
})
export class LootsModule {}
