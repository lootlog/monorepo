import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RedisService } from "@lootlog/nest-shared";

export interface GameMap {
  id: number;
  name: string;
}

const CACHE_KEY = "maps:all";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async getMaps(): Promise<GameMap[]> {
    // Try to get from cache first
    const cached = await this.redisService.get(CACHE_KEY);
    if (cached) {
      this.logger.debug("Returning maps from cache");
      return JSON.parse(cached);
    }

    // Fetch from external API
    const apiUrl = this.configService.get<string>("MAPS_API_URL");
    if (!apiUrl) {
      this.logger.error("MAPS_API_URL is not configured");
      return [];
    }

    try {
      this.logger.debug(`Fetching maps from ${apiUrl}`);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const maps: GameMap[] = await response.json();

      // Cache the result
      await this.redisService.set(
        CACHE_KEY,
        JSON.stringify(maps),
        CACHE_TTL_SECONDS,
      );
      this.logger.debug(`Cached ${maps.length} maps for ${CACHE_TTL_SECONDS}s`);

      return maps;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to fetch maps: ${message}`);
      return [];
    }
  }
}
