import { Module } from "@nestjs/common";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { RedisModule } from "src/lib/redis/redis.module";
import { MessagingController } from "src/messaging/messaging.controller";
import { MessagingService } from "src/messaging/messaging.service";
import { RedisService } from "@lootlog/nest-shared/redis";
import { PartyReadyRoomController } from "src/messaging/ready-room/party-ready-room.controller";
import { ReadyRoomPublisher } from "src/messaging/ready-room/ready-room-publisher";
import { ReadyRoomRedisRepository } from "src/messaging/ready-room/ready-room-redis.repository";
import { READY_ROOM_REPOSITORY } from "src/messaging/ready-room/ready-room.repository";
import { ReadyRoomService } from "src/messaging/ready-room/ready-room.service";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RedisModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  controllers: [MessagingController, PartyReadyRoomController],
  providers: [
    MessagingService,
    ReadyRoomPublisher,
    ReadyRoomService,
    {
      provide: READY_ROOM_REPOSITORY,
      inject: [RedisService],
      useFactory: (redisService: RedisService) =>
        new ReadyRoomRedisRepository(redisService),
    },
  ],
  exports: [MessagingService],
})
export class MessagingModule {}
