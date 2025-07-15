import { Module, forwardRef } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildsEventsHandler } from 'src/guilds/guilds-events.handler';
import { MembersModule } from 'src/members/members.module';
import { RolesModule } from 'src/roles/roles.module';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigKey } from 'src/config/config-key.enum';
import { PrismaService } from 'src/db/prisma.service';
import { UsersModule } from 'src/users/users.module';
import { LootlogConfigModule } from 'src/lootlog-config/lootlog-config.module';
import { GuildsRpcHandler } from 'src/guilds/guild-rpc.handler';
import { RetryService } from 'src/rabbitmq/retry.service';

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
  ],
  controllers: [GuildsController],
  providers: [
    GuildsService,
    GuildsEventsHandler,
    PrismaService,
    GuildsRpcHandler,
    RetryService,
  ],
  exports: [GuildsService, GuildsEventsHandler],
})
export class GuildsModule {}
