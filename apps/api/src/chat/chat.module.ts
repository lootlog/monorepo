import { Module } from '@nestjs/common';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaService } from 'src/db/prisma.service';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { ChatService } from 'src/chat/chat.service';
import { ChatController } from 'src/chat/chat.controller';
import { RedisModule } from 'src/lib/redis/redis.module';

@Module({
  imports: [
    MembersModule,
    GuildsModule,
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    RedisModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}
