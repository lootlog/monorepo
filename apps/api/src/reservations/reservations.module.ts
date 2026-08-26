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
import { GuildsModule } from "src/guilds/guilds.module";
import { NotificationsModule } from "src/notifications/notifications.module";
import { ReservationCatalogService } from "./reservation-catalog.service";
import { ReservationEventsPublisher } from "./reservation-events.publisher";
import { ReservationReminderService } from "./reservation-reminder.service";
import { ReservationSharingController } from "./reservation-sharing.controller";
import { ReservationSharingService } from "./reservation-sharing.service";
import { UserReservationsController } from "./user-reservations.controller";

@Module({
  imports: [
    MembersModule,
    MemberContextModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    PrismaModule,
    RedisModule,
    HttpModule,
    GuildsModule,
    NotificationsModule,
  ],
  controllers: [
    ReservationsController,
    ReservationSharingController,
    UserReservationsController,
  ],
  providers: [
    ReservationsService,
    ReservationsCleanupService,
    ReservationCatalogService,
    ReservationEventsPublisher,
    ReservationReminderService,
    ReservationSharingService,
  ],
  exports: [ReservationsService, ReservationsCleanupService],
})
export class ReservationsModule {}
