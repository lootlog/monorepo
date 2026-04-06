import { Module } from "@nestjs/common";
import { MembersModule } from "src/members/members.module";
import { MemberContextModule } from "src/shared/permissions/member-context.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { PrismaModule } from "src/db/prisma.module";
import { ReservationsController } from "./reservations.controller";
import { ReservationsService } from "./reservations.service";
import { ReservationsCleanupService } from "./reservations-cleanup.service";
import { RedisModule } from "src/lib/redis/redis.module";
import { HttpModule } from "@nestjs/axios";

@Module({
  imports: [
    MembersModule,
    MemberContextModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    PrismaModule,
    RedisModule,
    HttpModule,
  ],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationsCleanupService],
  exports: [ReservationsService, ReservationsCleanupService],
})
export class ReservationsModule {}
