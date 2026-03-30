import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TimersService } from "./timers.service";
import { TimersController } from "./timers.controller";
import { TimersCleanupService } from "./timers-cleanup.service";
import { MembersModule } from "src/members/members.module";
import { NpcsModule } from "src/npcs/npcs.module";
import { GuildsModule } from "src/guilds/guilds.module";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";
import { UserLootlogConfigModule } from "src/user-lootlog-config/user-lootlog-config.module";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";
import { RedlockModule } from "src/lib/redlock/redlock.module";
import { EventTimerHooksModule } from "src/events/event-timer-hooks.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MembersModule,
    NpcsModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    UserLootlogConfigModule,
    PrismaModule,
    RedisModule,
    RedlockModule,
    EventTimerHooksModule,
  ],
  providers: [TimersService, TimersCleanupService],
  controllers: [TimersController],
  exports: [TimersService],
})
export class TimersModule {}
