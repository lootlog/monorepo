import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { AuthModule } from 'src/auth/auth.module';
import { RedisModule } from 'src/lib/redis/redis.module';

@Module({
  imports: [AuthModule, RedisModule],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
