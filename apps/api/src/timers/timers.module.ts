import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TimersService } from "./timers.service.js";
import { TimersController } from "./timers.controller.js";
import { TimersCleanupService } from "./timers-cleanup.service.js";
import { MembersModule } from "#src/members/members.module";
import { NpcsModule } from "#src/npcs/npcs.module";
import { GuildsModule } from "#src/guilds/guilds.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { UserLootlogConfigModule } from "#src/user-lootlog-config/user-lootlog-config.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { RedlockModule } from "#src/lib/redlock/redlock.module";
import { EventTimerHooksModule } from "#src/events/event-timer-hooks.module";
import { TimersRepository } from "./timers.repository.js";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MembersModule,
    NpcsModule,
    GuildsModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    UserLootlogConfigModule,
    RedisModule,
    RedlockModule,
    EventTimerHooksModule,
  ],
  providers: [TimersService, TimersCleanupService, TimersRepository],
  controllers: [TimersController],
  exports: [TimersService],
})
export class TimersModule {}
