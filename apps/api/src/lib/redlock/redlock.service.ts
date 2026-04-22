import { Injectable } from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import Redlock from "redlock";

interface RedlockOptions {
  driftFactor?: number;
  retryCount?: number;
  retryDelay?: number;
  retryJitter?: number;
  automaticExtensionThreshold?: number;
}

const DEFAULT_OPTIONS: RedlockOptions = {
  driftFactor: 0.01,
  retryCount: 3,
  retryDelay: 100,
  retryJitter: 50,
};

@Injectable()
export class RedlockService {
  constructor(private readonly redis: RedisService) {}

  createInstance(options: RedlockOptions = {}): Redlock {
    const client = this.redis.getClient();
    return new Redlock([client], { ...DEFAULT_OPTIONS, ...options });
  }
}
