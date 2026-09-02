import { RedisService } from "@lootlog/nest-shared/redis";
import { Effect } from "effect";

interface GameMap {
  id: number;
  name: string;
}

const CACHE_KEY = "maps:all";
const CACHE_TTL_SECONDS = 60 * 60; // 1 hour

export class MapsService {
  constructor(
    private readonly redisService: RedisService,
    private readonly mapsApiUrl: URL,
  ) {}

  async getMaps(): Promise<GameMap[]> {
    // Try to get from cache first
    const cached = await this.redisService.get(CACHE_KEY);
    if (cached) {
      Effect.runSync(Effect.logDebug("Returning maps from cache"));
      return JSON.parse(cached);
    }

    // Fetch from external API
    const apiUrl = this.mapsApiUrl;

    try {
      Effect.runSync(Effect.logDebug(`Fetching maps from ${apiUrl}`));
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
      Effect.runSync(
        Effect.logDebug(`Cached ${maps.length} maps for ${CACHE_TTL_SECONDS}s`),
      );

      return maps;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      Effect.runSync(Effect.logError(`Failed to fetch maps: ${message}`));
      return [];
    }
  }
}
