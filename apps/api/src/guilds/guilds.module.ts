import { Module } from "@nestjs/common";
import { GuildsController } from "./guilds.controller.js";
import { GuildsInternalController } from "./guilds-internal.controller.js";
import { GuildsService } from "./guilds.service.js";
import { GuildsEventsHandler } from "#src/guilds/guilds-events.handler";
import { MembersModule } from "#src/members/members.module";
import { RolesModule } from "#src/roles/roles.module";
import { MemberContextModule } from "#src/shared/permissions/member-context.module";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { rabbitmqConfig } from "#src/config/rabbitmq.config";
import { RetryService } from "#src/rabbitmq/retry.service";
import { DiscordModule } from "#src/discord/discord.module";
import { ChannelsModule } from "#src/channels/channels.module";
import { RedisModule } from "#src/lib/redis/redis.module";
import { MemberSyncInterceptor } from "#src/shared/interceptors/member-sync.interceptor";
import { MemberSyncRepository } from "#src/shared/interceptors/member-sync.repository";
import { UserGuildAccessResolver } from "./user-guild-access-resolver.service.js";
import { GuildsRepository } from "./guilds.repository.js";

@Module({
  imports: [
    MembersModule,
    RolesModule,
    MemberContextModule,
    RabbitMQModule.forRoot(rabbitmqConfig),
    RedisModule,
    DiscordModule,
    ChannelsModule,
  ],
  controllers: [GuildsController, GuildsInternalController],
  providers: [
    GuildsService,
    GuildsRepository,
    UserGuildAccessResolver,
    GuildsEventsHandler,
    RetryService,
    MemberSyncRepository,
    MemberSyncInterceptor,
  ],
  exports: [GuildsService, GuildsEventsHandler, MemberContextModule],
})
export class GuildsModule {}
