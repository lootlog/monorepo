import { Module, forwardRef } from '@nestjs/common';
import { MembersService } from './members.service';
import { GuildsModule } from 'src/guilds/guilds.module';
import { MembersController } from './members.controller';
import { RolesModule } from 'src/roles/roles.module';
import { RetryService } from 'src/rabbitmq/retry.service';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { DiscordModule } from 'src/discord/discord.module';
import { PrismaModule } from 'src/db/prisma.module';

@Module({
  imports: [
    forwardRef(() => GuildsModule),
    forwardRef(() => RolesModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    DiscordModule,
    PrismaModule,
  ],
  controllers: [MembersController],
  providers: [MembersService, RetryService],
  exports: [MembersService],
})
export class MembersModule {}
