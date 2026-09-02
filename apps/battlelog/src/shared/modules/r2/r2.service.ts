import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { gzipSync, gunzipSync } from "node:zlib";
import type { R2Config } from "#src/config/r2.config";
import { Logger } from "#src/platform/logger";
import type { RedisStore } from "#src/shared/modules/redis/redis.service";

const CACHE_PREFIX = "battle:raw";
const LRU_KEY = "battle:raw:lru";
const MAX_CACHE_SIZE = 1000;
const CACHE_TTL = 24 * 60 * 60;

export const makeBattleObjectStorage = (
  redisStore: RedisStore,
  config: R2Config,
) => {
  const logger = new Logger("BattleObjectStorage");
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  logger.log(`R2 client initialized for bucket: ${config.bucketName}`);

  const objectStorage = {
    async uploadBattleData(battleId: string, data: unknown): Promise<void> {
      try {
        const key = `battles/${battleId}.json`;
        const jsonString = JSON.stringify(data);
        const compressedData = gzipSync(jsonString);

        const command = new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: compressedData,
          ContentType: "application/json",
          ContentEncoding: "gzip",
          Metadata: {
            "battle-id": battleId,
            "uploaded-at": new Date().toISOString(),
            compressed: "gzip",
          },
        });

        await client.send(command);
        logger.log(
          `Battle data uploaded successfully for battle ${battleId} (compressed: ${jsonString.length} -> ${compressedData.length} bytes)`,
        );
      } catch (error) {
        logger.error(`Failed to upload battle data for ${battleId}:`, error);
        throw error;
      }
    },

    async getBattleData<TData = unknown>(battleId: string): Promise<TData> {
      try {
        const cacheKey = `${CACHE_PREFIX}:${battleId}`;

        const cachedData = await redisStore.get(cacheKey);
        if (cachedData) {
          logger.debug(`Cache hit for battle ${battleId}`);
          await objectStorage.updateLRU(battleId);
          return JSON.parse(cachedData) as TData;
        }

        logger.debug(`Cache miss for battle ${battleId}, fetching from R2`);
        const key = `battles/${battleId}.json`;

        const command = new GetObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        });

        const response = await client.send(command);

        if (!response.Body) {
          throw new Error(`No data found for battle ${battleId}`);
        }

        const isCompressed =
          response.Metadata?.compressed === "gzip" ||
          response.ContentEncoding === "gzip";

        let decompressedData: string;

        if (isCompressed) {
          const compressedBuffer = await response.Body.transformToByteArray();
          const decompressedBuffer = gunzipSync(compressedBuffer);
          decompressedData = decompressedBuffer.toString("utf-8");
          logger.debug(`Decompressed battle ${battleId} data`);
        } else {
          decompressedData = await response.Body.transformToString();
          logger.debug(
            `Battle ${battleId} data is not compressed (legacy format)`,
          );
        }

        const parsedData = JSON.parse(decompressedData);

        await objectStorage.cacheData(battleId, decompressedData);
        logger.log(
          `Battle data retrieved from R2 and cached for battle ${battleId}`,
        );

        return parsedData as TData;
      } catch (error) {
        logger.error(`Failed to retrieve battle data for ${battleId}:`, error);
        throw error;
      }
    },

    async deleteBattleData(battleId: string): Promise<void> {
      try {
        const key = `battles/${battleId}.json`;

        const command = new DeleteObjectCommand({
          Bucket: config.bucketName,
          Key: key,
        });

        await client.send(command);
        await objectStorage.deleteCachedData(battleId);
        logger.log(`Battle data deleted successfully for battle ${battleId}`);
      } catch (error) {
        logger.error(`Failed to delete battle data for ${battleId}:`, error);
        throw error;
      }
    },

    async deleteBattleDataBatch(battleIds: string[]): Promise<void> {
      if (battleIds.length === 0) return;

      const results = await Promise.allSettled(
        battleIds.map(async (battleId) => {
          const key = `battles/${battleId}.json`;
          const command = new DeleteObjectCommand({
            Bucket: config.bucketName,
            Key: key,
          });
          await client.send(command);
        }),
      );

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length > 0) {
        logger.warn(
          `Failed to delete ${failed.length}/${battleIds.length} R2 objects`,
        );
      }

      const redis = redisStore.getClient();
      const pipeline = redis.pipeline();
      for (const battleId of battleIds) {
        pipeline.del(`${CACHE_PREFIX}:${battleId}`);
        pipeline.zrem(LRU_KEY, battleId);
      }
      await pipeline.exec();

      logger.log(
        `Batch deleted ${battleIds.length - failed.length}/${battleIds.length} battle files from R2`,
      );
    },

    async cacheData(battleId: string, data: string): Promise<void> {
      try {
        const cacheKey = `${CACHE_PREFIX}:${battleId}`;
        const timestamp = Date.now();

        const redis = redisStore.getClient();
        const pipeline = redis.pipeline();

        pipeline.set(cacheKey, data, "EX", CACHE_TTL);
        pipeline.zadd(LRU_KEY, timestamp, battleId);

        await pipeline.exec();

        await objectStorage.enforceLRULimit();
      } catch (error) {
        logger.warn(`Failed to cache data for battle ${battleId}:`, error);
      }
    },

    async updateLRU(battleId: string): Promise<void> {
      try {
        const timestamp = Date.now();
        const redis = redisStore.getClient();
        await redis.zadd(LRU_KEY, timestamp, battleId);
      } catch (error) {
        logger.warn(`Failed to update LRU for battle ${battleId}:`, error);
      }
    },

    async enforceLRULimit(): Promise<void> {
      try {
        const redis = redisStore.getClient();
        const count = await redis.zcard(LRU_KEY);

        if (count > MAX_CACHE_SIZE) {
          const toRemove = count - MAX_CACHE_SIZE;
          const oldestBattles = await redis.zrange(LRU_KEY, 0, toRemove - 1);

          if (oldestBattles.length > 0) {
            const pipeline = redis.pipeline();

            for (const battleId of oldestBattles) {
              const cacheKey = `${CACHE_PREFIX}:${battleId}`;
              pipeline.del(cacheKey);
            }

            pipeline.zremrangebyrank(LRU_KEY, 0, toRemove - 1);
            await pipeline.exec();

            logger.log(
              `Evicted ${oldestBattles.length} battles from cache (LRU limit: ${MAX_CACHE_SIZE})`,
            );
          }
        }
      } catch (error) {
        logger.warn("Failed to enforce LRU limit:", error);
      }
    },

    async deleteCachedData(battleId: string): Promise<void> {
      try {
        const cacheKey = `${CACHE_PREFIX}:${battleId}`;
        const redis = redisStore.getClient();
        const pipeline = redis.pipeline();

        pipeline.del(cacheKey);
        pipeline.zrem(LRU_KEY, battleId);

        await pipeline.exec();
        logger.debug(`Removed battle ${battleId} from cache`);
      } catch (error) {
        logger.warn(
          `Failed to delete cached data for battle ${battleId}:`,
          error,
        );
      }
    },
  };

  return objectStorage;
};

type BattleObjectStorageModule = ReturnType<typeof makeBattleObjectStorage>;

export type BattleObjectStorage = Pick<
  BattleObjectStorageModule,
  | "deleteBattleData"
  | "deleteBattleDataBatch"
  | "getBattleData"
  | "uploadBattleData"
>;
