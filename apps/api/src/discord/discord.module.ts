import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { DiscordRateLimiterService } from "src/discord/discord-rate-limiter.service";
import { DiscordService } from "src/discord/discord.service";
import { DiscordSyncDiagnosticsService } from "src/discord/discord-sync-diagnostics.service";
import { RedisModule } from "src/lib/redis/redis.module";
import { RedlockModule } from "src/lib/redlock/redlock.module";

@Module({
  imports: [AuthModule, RedisModule, RedlockModule],
  providers: [
    DiscordService,
    DiscordRateLimiterService,
    DiscordSyncDiagnosticsService,
  ],
  exports: [
    DiscordService,
    DiscordRateLimiterService,
    DiscordSyncDiagnosticsService,
  ],
})
export class DiscordModule {}
