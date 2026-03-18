import { Module, forwardRef } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RolesEventsHandler } from "src/roles/roles-events.handler";
import { RolesController } from "./roles.controller";
import { MembersModule } from "src/members/members.module";
import { GuildsModule } from "src/guilds/guilds.module";
import { RetryService } from "src/rabbitmq/retry.service";
import {
  RabbitMQModule,
  type RabbitMQConfig,
} from "@golevelup/nestjs-rabbitmq";
import { ConfigService } from "@nestjs/config";
import { ConfigKey } from "src/config/config-key.enum";
import { PrismaModule } from "src/db/prisma.module";
import { RedisModule } from "src/lib/redis/redis.module";

@Module({
  imports: [
    forwardRef(() => GuildsModule),
    forwardRef(() => MembersModule),
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    PrismaModule,
    RedisModule,
  ],
  controllers: [RolesController],
  providers: [RolesService, RolesEventsHandler, RetryService],
  exports: [RolesService],
})
export class RolesModule {}
