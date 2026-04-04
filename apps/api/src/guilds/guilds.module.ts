import { Module } from "@nestjs/common";
import { GuildsController } from "./guilds.controller";
import { GuildsInternalController } from "./guilds-internal.controller";
import { GuildsService } from "./guilds.service";
import { GuildsEventsHandler } from "src/guilds/guilds-events.handler";
import { MembersModule } from "src/members/members.module";
import { RolesModule } from "src/roles/roles.module";
import { MemberContextModule } from "src/shared/permissions/member-context.module";
import { ConfigService } from "@nestjs/config";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigKey } from "src/config/config-key.enum";
import { RetryService } from "src/rabbitmq/retry.service";
import { DiscordModule } from "src/discord/discord.module";
import { ChannelsModule } from "src/channels/channels.module";
import { RedisModule } from "src/lib/redis/redis.module";
import { PrismaModule } from "src/db/prisma.module";
import { MemberSyncInterceptor } from "src/shared/interceptors/member-sync.interceptor";

@Module({
  imports: [
    MembersModule,
    RolesModule,
    MemberContextModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    RedisModule,
    DiscordModule,
    ChannelsModule,
    PrismaModule,
  ],
  controllers: [GuildsController, GuildsInternalController],
  providers: [
    GuildsService,
    GuildsEventsHandler,
    RetryService,
    MemberSyncInterceptor,
  ],
  exports: [GuildsService, GuildsEventsHandler, MemberContextModule],
})
export class GuildsModule {}
