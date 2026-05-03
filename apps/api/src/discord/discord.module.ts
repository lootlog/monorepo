import { Module } from "@nestjs/common";
import { AuthModule } from "src/auth/auth.module";
import { DiscordGuildMemberClient } from "src/discord/discord-guild-member.client";
import { DiscordRateLimiterService } from "src/discord/discord-rate-limiter.service";
import { DiscordRestClientFactory } from "src/discord/discord-rest-client.factory";
import { DiscordService } from "src/discord/discord.service";
import { DiscordSyncDiagnosticsService } from "src/discord/discord-sync-diagnostics.service";
import { DiscordUserGuildsClient } from "src/discord/discord-user-guilds.client";
import { RedisModule } from "src/lib/redis/redis.module";
import { RedlockModule } from "src/lib/redlock/redlock.module";

@Module({
  imports: [AuthModule, RedisModule, RedlockModule],
  providers: [
    DiscordService,
    DiscordRestClientFactory,
    DiscordUserGuildsClient,
    DiscordGuildMemberClient,
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
