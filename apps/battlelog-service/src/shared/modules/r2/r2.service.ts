import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { gunzipSync, gzipSync } from "node:zlib";
import type { Logger } from "winston";
import type { BattlelogAppConfig } from "../../../config/env.js";
import { RedisService } from "../redis/redis.service.js";

type R2Config = BattlelogAppConfig["r2"];

export class R2Service {
  private readonly client: S3Client;
  private readonly CACHE_PREFIX = "battle:raw";
  private readonly LRU_KEY = "battle:raw:lru";
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_TTL = 24 * 60 * 60;

  constructor(
    private readonly config: R2Config,
    private readonly redisService: RedisService,
    private readonly winstonLogger: Logger,
  ) {
    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.winstonLogger.info("R2 client initialized", {
      bucketName: this.config.bucketName,
    });
  }

  async uploadBattleData(battleId: string, data: unknown): Promise<void> {
    try {
      const key = `battles/${battleId}.json`;
      const jsonString = JSON.stringify(data);
      const compressedData = gzipSync(jsonString);

      await this.client.send(
        new PutObjectCommand({
          Bucket: this.config.bucketName,
          Key: key,
          Body: compressedData,
          ContentType: "application/json",
          ContentEncoding: "gzip",
          Metadata: {
            "battle-id": battleId,
            "uploaded-at": new Date().toISOString(),
            compressed: "gzip",
          },
        }),
      );

      this.winstonLogger.info("Battle data uploaded successfully", {
        battleId,
        compressedBytes: compressedData.length,
        originalBytes: jsonString.length,
      });
    } catch (error) {
      this.winstonLogger.error("Failed to upload battle data", {
        battleId,
        error,
      });
      throw error;
    }
  }

  async getBattleData<T>(battleId: string): Promise<T> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${battleId}`;
      const cachedData = await this.redisService.get(cacheKey);

      if (cachedData) {
        await this.updateLRU(battleId);
        return JSON.parse(cachedData) as T;
      }

      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucketName,
          Key: `battles/${battleId}.json`,
        }),
      );

      if (!response.Body) {
        throw new Error(`No data found for battle ${battleId}`);
      }

      const isCompressed =
        response.Metadata?.compressed === "gzip" ||
        response.ContentEncoding === "gzip";

      const payload = isCompressed
        ? gunzipSync(await response.Body.transformToByteArray()).toString(
            "utf-8",
          )
        : await response.Body.transformToString();

      await this.cacheData(battleId, payload);

      return JSON.parse(payload) as T;
    } catch (error) {
      this.winstonLogger.error("Failed to retrieve battle data", {
        battleId,
        error,
      });
      throw error;
    }
  }

  async deleteBattleData(battleId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.config.bucketName,
          Key: `battles/${battleId}.json`,
        }),
      );

      await this.deleteCachedData(battleId);
      this.winstonLogger.info("Battle data deleted successfully", { battleId });
    } catch (error) {
      this.winstonLogger.error("Failed to delete battle data", {
        battleId,
        error,
      });
      throw error;
    }
  }

  async deleteBattleDataBatch(battleIds: string[]): Promise<void> {
    if (battleIds.length === 0) {
      return;
    }

    const results = await Promise.allSettled(
      battleIds.map(async (battleId) => {
        await this.client.send(
          new DeleteObjectCommand({
            Bucket: this.config.bucketName,
            Key: `battles/${battleId}.json`,
          }),
        );
      }),
    );

    const failed = results.filter((result) => result.status === "rejected");
    if (failed.length > 0) {
      this.winstonLogger.warn("Failed to delete some R2 objects", {
        failedCount: failed.length,
        totalCount: battleIds.length,
      });
    }

    const redis = this.redisService.getClient();
    const pipeline = redis.pipeline();
    for (const battleId of battleIds) {
      pipeline.del(`${this.CACHE_PREFIX}:${battleId}`);
      pipeline.zrem(this.LRU_KEY, battleId);
    }
    await pipeline.exec();
  }

  private async cacheData(battleId: string, data: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const pipeline = redis.pipeline();
      const cacheKey = `${this.CACHE_PREFIX}:${battleId}`;

      pipeline.set(cacheKey, data, "EX", this.CACHE_TTL);
      pipeline.zadd(this.LRU_KEY, Date.now(), battleId);

      await pipeline.exec();
      await this.enforceLRULimit();
    } catch (error) {
      this.winstonLogger.warn("Failed to cache battle data", {
        battleId,
        error,
      });
    }
  }

  private async updateLRU(battleId: string): Promise<void> {
    try {
      await this.redisService
        .getClient()
        .zadd(this.LRU_KEY, Date.now(), battleId);
    } catch (error) {
      this.winstonLogger.warn("Failed to update R2 LRU cache", {
        battleId,
        error,
      });
    }
  }

  private async enforceLRULimit(): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const count = await redis.zcard(this.LRU_KEY);

      if (count <= this.MAX_CACHE_SIZE) {
        return;
      }

      const toRemove = count - this.MAX_CACHE_SIZE;
      const oldestBattles = await redis.zrange(this.LRU_KEY, 0, toRemove - 1);

      if (oldestBattles.length === 0) {
        return;
      }

      const pipeline = redis.pipeline();
      for (const battleId of oldestBattles) {
        pipeline.del(`${this.CACHE_PREFIX}:${battleId}`);
      }
      pipeline.zremrangebyrank(this.LRU_KEY, 0, toRemove - 1);
      await pipeline.exec();
    } catch (error) {
      this.winstonLogger.warn("Failed to enforce R2 cache LRU limit", {
        error,
      });
    }
  }

  private async deleteCachedData(battleId: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const pipeline = redis.pipeline();
      pipeline.del(`${this.CACHE_PREFIX}:${battleId}`);
      pipeline.zrem(this.LRU_KEY, battleId);
      await pipeline.exec();
    } catch (error) {
      this.winstonLogger.warn("Failed to delete cached battle data", {
        battleId,
        error,
      });
    }
  }
}
