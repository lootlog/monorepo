import { Module } from "@nestjs/common";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";
import { RedisModule } from "src/lib/redis/redis.module";
import { MessagingController } from "src/messaging/messaging.controller";
import { MessagingService } from "src/messaging/messaging.service";

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RedisModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [MessagingController],
  providers: [MessagingService],
  exports: [MessagingService],
})
export class MessagingModule {}
