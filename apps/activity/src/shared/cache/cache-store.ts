import KeyvRedis from "@keyv/redis";
import { RuntimeEnvironment } from "@lootlog/types";
import { Keyv } from "keyv";
import type { ActivityAppConfig } from "../../config/env.js";

function createRedisUrl(config: ActivityAppConfig["redis"]) {
  const credentials =
    config.username || config.password
      ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password)}@`
      : "";

  return `redis://${credentials}${config.host}:${config.port}`;
}

export class CacheStore {
  private readonly keyv: Keyv;

  constructor(private readonly appConfig: ActivityAppConfig) {
    this.keyv =
      appConfig.env === RuntimeEnvironment.LOCAL
        ? new Keyv()
        : new Keyv({
            store: new KeyvRedis(createRedisUrl(appConfig.redis)),
          });
  }

  async get<T>(key: string) {
    return (await this.keyv.get<T>(key)) ?? undefined;
  }

  async set<T>(key: string, value: T, ttlMs?: number) {
    await this.keyv.set(key, value, ttlMs);
  }

  async delete(key: string) {
    await this.keyv.delete(key);
  }

  async close() {
    await this.keyv.disconnect();
  }
}
