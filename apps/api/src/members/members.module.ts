import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MembersService } from './members.service';
import { MembersConsumer } from './members.consumer';
import { MemberBulkRefreshProcessor } from './member-bulk-refresh.processor';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersController } from './members.controller';
import { MembersInternalController } from './members-internal.controller';
import { RolesModule } from 'src/roles/roles.module';
import { RetryService } from 'src/rabbitmq/retry.service';
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { DiscordModule } from 'src/discord/discord.module';
import { PrismaModule } from 'src/db/prisma.module';
import type { RedisConfig } from 'src/config/redis.config';
import { RedisModule } from 'src/lib/redis/redis.module';
import {
  MEMBER_BULK_REFRESH_QUEUE,
  MEMBER_REFRESH_QUEUE,
} from './constants/member-refresh-queue.constant';

@Module({
  imports: [
    forwardRef(() => GuildsModule),
    forwardRef(() => RolesModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisConfig = configService.get<RedisConfig>(ConfigKey.REDIS);
        return {
          connection: {
            host: redisConfig.host,
            port: redisConfig.port,
            password: redisConfig.password,
            username: redisConfig.username,
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
          },
          prefix: '{bull}',
        };
      },
    }),
    BullModule.registerQueue(
      { name: MEMBER_REFRESH_QUEUE },
      { name: MEMBER_BULK_REFRESH_QUEUE },
    ),
    DiscordModule,
    PrismaModule,
    RedisModule,
  ],
  controllers: [MembersController, MembersInternalController],
  providers: [
    MembersService,
    MembersConsumer,
    MemberBulkRefreshProcessor,
    RetryService,
  ],
  exports: [MembersService],
})
export class MembersModule {}
