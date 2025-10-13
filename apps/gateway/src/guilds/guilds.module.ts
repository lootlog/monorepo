import { Module } from '@nestjs/common';
import { RabbitMQConfig, RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import { GuildsService } from 'src/guilds/guilds.service';
import { RedisModule } from 'src/lib/redis/redis.module';
import { CircuitBreakerModule } from 'src/lib/circuit-breaker/circuit-breaker.module';

@Module({
  imports: [
    RabbitMQModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) =>
        configService.get<RabbitMQConfig>(ConfigKey.RABBITMQ),
    }),
    RedisModule,
    CircuitBreakerModule,
  ],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
