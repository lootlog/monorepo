import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";
import { GatewayService } from "./gateway.service";
import { Gateway } from "./gateway";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { GatewayQueueHandler } from "src/gateway/gateway-queue.handler";
import { GuildsModule } from "src/guilds/guilds.module";
import { RedisModule } from "src/lib/redis/redis.module";
import { RetryService } from "src/gateway/retry.service";
import { ActivityService } from "./services/activity.service";
import { ConnectionService } from "./services/connection.service";
import { PresenceService } from "./services/presence.service";
import { SubscriptionService } from "./services/subscription.service";
import { GatewayAuthService } from "./services/gateway-auth.service";
import { MargonemAccountProofService } from "./services/margonem-account-proof.service";
import { MapPingService } from "./services/map-ping.service";
import { rabbitmqConfig } from "src/config/rabbitmq.config";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    HttpModule,
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
    GatewayAuthService,
    MargonemAccountProofService,
    MapPingService,
  ],
})
export class GatewayModule {}
