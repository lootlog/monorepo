import { Module, forwardRef } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesEventsHandler } from 'src/roles/roles-events.handler';
import { RolesController } from './roles.controller';
import { MembersModule } from 'src/members/members.module';
import { GuildsModule } from 'src/guilds/guilds.module';
import { PrismaService } from 'src/db/prisma.service';
import { RetryService } from 'src/rabbitmq/retry.service';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

@Module({
  imports: [
    forwardRef(() => GuildsModule),
    forwardRef(() => MembersModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [RolesController],
  providers: [RolesService, RolesEventsHandler, PrismaService, RetryService],
  exports: [RolesService],
})
export class RolesModule {}
