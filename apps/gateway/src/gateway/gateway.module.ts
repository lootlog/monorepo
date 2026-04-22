import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { GatewayService } from "./gateway.service";
import { Gateway } from "./gateway";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { GatewayQueueHandler } from "src/gateway/gateway-queue.handler";
import { GuildsModule } from "src/guilds/guilds.module";
import { RedisModule } from "src/lib/redis/redis.module";
import { RetryService } from "src/gateway/retry.service";
import {
  ConnectionService,
  PresenceService,
  SubscriptionService,
  ActivityService,
} from "./services";
import { rabbitmqConfig } from "src/config/rabbitmq.config";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    RabbitMQModule.forRoot(rabbitmqConfig),
    GuildsModule,
    RedisModule,
  ],
  providers: [
    GatewayService,
    Gateway,
    GatewayQueueHandler,
    RetryService,
    ConnectionService,
    PresenceService,
    SubscriptionService,
    ActivityService,
  ],
})
export class GatewayModule {}
