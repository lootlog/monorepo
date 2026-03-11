import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { DiscordRateLimiterService } from 'src/discord/discord-rate-limiter.service';
import { DiscordService } from 'src/discord/discord.service';
import { RedisModule } from 'src/lib/redis/redis.module';

@Module({
  imports: [AuthModule, RedisModule],
  providers: [DiscordService, DiscordRateLimiterService],
  exports: [DiscordService, DiscordRateLimiterService],
})
export class DiscordModule {}
