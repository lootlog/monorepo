import { Module, forwardRef } from '@nestjs/common';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { GuildsEventsHandler } from 'src/guilds/guilds-events.handler';
import { DiscordModule } from 'src/discord/discord.module';
import { MembersModule } from 'src/members/members.module';
import { RolesModule } from 'src/roles/roles.module';
import { ConfigService } from '@nestjs/config';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigKey } from 'src/config/config-key.enum';
import { PrismaService } from 'src/db/prisma.service';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';
import { LootlogConfigModule } from 'src/lootlog-config/lootlog-config.module';

@Module({
  imports: [
    forwardRef(() => MembersModule),
    forwardRef(() => DiscordModule),
    forwardRef(() => RolesModule),
    forwardRef(() => UsersModule),
    forwardRef(() => LootlogConfigModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const config = configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ);

        return config;
      },
    }),
  ],
  controllers: [GuildsController],
  providers: [GuildsService, GuildsEventsHandler, PrismaService],
  exports: [GuildsService, GuildsEventsHandler],
})
export class GuildsModule {}
