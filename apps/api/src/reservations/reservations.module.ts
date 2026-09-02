import { Module } from "@nestjs/common";
import { MembersModule } from "#src/members/members.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { ReservationsController } from "./reservations.controller.js";
import { ReservationsService } from "./reservations.service.js";
import { ReservationsRepository } from "./reservations.repository.js";
import { ReservationsCleanupService } from "./reservations-cleanup.service.js";
import { ReservationsCleanupRepository } from "./reservations-cleanup.repository.js";
import { RedisModule } from "#src/lib/redis/redis.module";
import { GuildsModule } from "#src/guilds/guilds.module";
import { NotificationsModule } from "#src/notifications/notifications.module";
import { ReservationCatalogService } from "./reservation-catalog.service.js";
import { ReservationEventsPublisher } from "./reservation-events.publisher.js";
import { ReservationReminderService } from "./reservation-reminder.service.js";
import { ReservationReminderRepository } from "./reservation-reminder.repository.js";
import { ReservationMutationsService } from "./reservation-mutations.service.js";
import { ReservationMutationsRepository } from "./reservation-mutations.repository.js";
import { ReservationSharingController } from "./reservation-sharing.controller.js";
import { ReservationSharingService } from "./reservation-sharing.service.js";
import { ReservationSharingRepository } from "./reservation-sharing.repository.js";
import { UserReservationsController } from "./user-reservations.controller.js";

@Module({
  imports: [
    MembersModule,
    MemberContextModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    RedisModule,
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
    ReservationsRepository,
    ReservationMutationsService,
    ReservationMutationsRepository,
    ReservationsCleanupService,
    ReservationsCleanupRepository,
    ReservationCatalogService,
    ReservationEventsPublisher,
    ReservationReminderService,
    ReservationReminderRepository,
    ReservationSharingService,
    ReservationSharingRepository,
  ],
  exports: [ReservationsService, ReservationsCleanupService],
})
export class ReservationsModule {}
