import { Module } from '@nestjs/common';
import { NpcsService } from './npcs.service';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    PrismaModule,
  ],
  controllers: [],
  providers: [NpcsService],
  exports: [NpcsService],
})
export class NpcsModule {}
