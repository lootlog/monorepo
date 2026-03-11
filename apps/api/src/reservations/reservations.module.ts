import { Module } from "@nestjs/common";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";
import { PrismaModule } from "src/db/prisma.module";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import { ReservationsCleanupService } from "./reservations-cleanup.service";
import { RedisModule } from "src/lib/redis/redis.module";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    PrismaModule,
    RedisModule,
    HttpModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsCleanupService],
  exports: [ReservationsService, ReservationsCleanupService],
})
export class ReservationsModule {}
