import { Module, forwardRef } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildsEventsHandler } from 'src/guilds/guilds-events.handler';
import { MembersModule } from 'src/members/members.module';
import { RolesModule } from 'src/roles/roles.module';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigKey } from 'src/config/config-key.enum';
import { UsersModule } from 'src/users/users.module';
import { LootlogConfigModule } from 'src/lootlog-config/lootlog-config.module';
import { GuildsRpcHandler } from 'src/guilds/guild-rpc.handler';
import { RetryService } from 'src/rabbitmq/retry.service';
import { DiscordModule } from 'src/discord/discord.module';
import { RedisModule } from 'src/lib/redis/redis.module';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [
    forwardRef(() => MembersModule),
    forwardRef(() => RolesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => LootlogConfigModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    RedisModule,
    DiscordModule,
    PrismaModule,
  ],
  controllers: [GuildsController],
  providers: [
    GuildsService,
    GuildsEventsHandler,
    GuildsRpcHandler,
    RetryService,
  ],
  exports: [GuildsService, GuildsEventsHandler],
})
export class GuildsModule {}
