import { Module } from "@nestjs/common";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "src/config/rabbitmq.config";
import { RedisModule } from "src/lib/redis/redis.module";
import { MessagingController } from "src/messaging/messaging.controller";
import { MessagingService } from "src/messaging/messaging.service";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RedisModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
