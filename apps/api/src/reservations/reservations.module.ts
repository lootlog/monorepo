import { Module } from "@nestjs/common";
import { MembersModule } from "#src/members/members.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { PrismaModule } from "#src/db/prisma.module";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReservationsCleanupService } from "./reservations-cleanup.service.js";
import { RedisModule } from "#src/lib/redis/redis.module";
import { HttpModule } from "@nestjs/axios";
import { GuildsModule } from "#src/guilds/guilds.module";
import { NotificationsModule } from "#src/notifications/notifications.module";
import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { ReservationEventsPublisher } from "./reservation-events.publisher.js";
import { ReservationReminderService } from "./reservation-reminder.service.js";
import { ReservationMutationsService } from "./reservation-mutations.service.js";
import { ReservationSharingController } from "./reservation-sharing.controller.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import { UserReservationsController } from "./user-reservations.controller.js";

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
    ReservationMutationsService,
    ReservationsCleanupService,
    ReservationCatalogService,
    ReservationEventsPublisher,
    ReservationReminderService,
    ReservationSharingService,
  ],
  exports: [ReservationsService, ReservationsCleanupService],
})
export class ReservationsModule {}
