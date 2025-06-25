import { Module, forwardRef } from '@nestjs/common';
import { MembersEventsHandler } from './members-events.handler';
import { MembersService } from './members.service';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersController } from './members.controller';
import { RolesModule } from 'src/roles/roles.module';
import { PrismaService } from 'src/db/prisma.service';
import { RetryService } from 'src/rabbitmq/retry.service';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';

@Module({
  imports: [
    forwardRef(() => GuildsModule),
    forwardRef(() => RolesModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
  ],
  controllers: [MembersController],
  providers: [
    MembersService,
    MembersEventsHandler,
    PrismaService,
    RetryService,
  ],
  exports: [MembersService],
})
export class MembersModule {}
