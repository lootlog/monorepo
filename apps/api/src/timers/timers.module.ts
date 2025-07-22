import { Module } from '@nestjs/common';
import { TimersService } from './timers.service';
import { TimersController } from './timers.controller';
import { MembersModule } from 'src/members/members.module';
import { NpcsModule } from 'src/npcs/npcs.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { UserLootlogConfigModule } from 'src/user-lootlog-config/user-lootlog-config.module';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [
    MembersModule,
    NpcsModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    UserLootlogConfigModule,
    PrismaModule,
  ],
  providers: [TimersService],
  controllers: [TimersController],
})
export class TimersModule {}
