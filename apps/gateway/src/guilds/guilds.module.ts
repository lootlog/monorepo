import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { GuildsService } from 'src/guilds/guilds.service';
import { RedisModule } from 'src/lib/redis/redis.module';
import { CircuitBreakerModule } from 'src/lib/circuit-breaker/circuit-breaker.module';

@Module({
  imports: [
    HttpModule,
    RedisModule,
    CircuitBreakerModule,
  ],
  providers: [GuildsService],
  exports: [GuildsService],
})
export class GuildsModule {}
