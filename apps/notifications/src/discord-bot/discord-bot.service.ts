import { HttpService } from "@nestjs/axios";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { firstValueFrom } from "rxjs";
import type { DiscordBotServiceConfig } from "src/config/discord-bot-service.config";
import { ConfigKey } from "src/config/config-key.enum";

export type BotPermissionsStatus = {
  ok: boolean;
  missingPermissions: string[];
  checkedAt: string;
  cacheTtlSeconds: number;
  source?: "CACHE" | "LIVE";
};

@Injectable()
export class DiscordBotClientService {
  private readonly logger = new Logger(DiscordBotClientService.name);
  private readonly discordBotServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const config = this.configService.get<DiscordBotServiceConfig>(
      ConfigKey.DISCORD_BOT_SERVICE,
    );

    if (!config) {
      throw new Error("Missing discord bot service configuration");
    }

    this.discordBotServiceUrl = config.url;
  }

  async getGuildBotPermissionsStatus(options: {
    guildId: string;
    channelId: string;
    force?: boolean;
  }): Promise<BotPermissionsStatus> {
    const { guildId, channelId, force = false } = options;

    const url = `${this.discordBotServiceUrl}/internal/guilds/${guildId}/bot-permissions`;

    try {
      const response = await firstValueFrom(
        this.httpService.get<BotPermissionsStatus>(url, {
          params: {
            channelId,
            force,
          },
          timeout: 6000,
        }),
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to fetch bot permissions status for guild ${guildId}: ${error instanceof Error ? error.message : "unknown error"}`,
      );
      throw new ServiceUnavailableException("Discord bot service unavailable");
    }
  }
}
