import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ScheduleModule } from "@nestjs/schedule";
import { GatewayService } from "./gateway.service.js";
import { Gateway } from "./gateway.js";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { GatewayQueueHandler } from "#src/gateway/gateway-queue.handler";
import { GuildsModule } from "#src/guilds/guilds.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { RetryService } from "#src/gateway/retry.service";
import { ActivityService } from "./services/activity.service.js";
import { ConnectionService } from "./services/connection.service.js";
import { PresenceService } from "./services/presence.service.js";
import { SubscriptionService } from "./services/subscription.service.js";
import { GatewayAuthService } from "./services/gateway-auth.service.js";
import { MargonemAccountProofService } from "./services/margonem-account-proof.service.js";
import { MapPingService } from "./services/map-ping.service.js";
import { AirTagService } from "./services/air-tag.service.js";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";

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
    AirTagService,
  ],
})
export class GatewayModule {}
