import type { RawBattleData } from "#src/battles/battle-service";
import {
  S3Client,
  S3ServiceException,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { gzipSync, gunzipSync } from "node:zlib";
import type { R2Config } from "#src/config/r2.config";
import { Logger } from "#src/infrastructure/logger";
import type { RedisStore } from "#src/infrastructure/redis-store";
import { chunk } from "es-toolkit";
import { Redacted } from "effect";

const CACHE_PREFIX = "battle:raw";

const LRU_KEY = "battle:raw:lru";

const MAX_CACHE_SIZE = 1000;

// Keep unusually large raw objects in R2 instead of filling the shared cache.
const MAX_CACHE_ENTRY_BYTES = 256 * 1024;

const CACHE_TTL = 24 * 60 * 60;

export const makeBattleObjectStorage = (
  redisStore: Pick<
    RedisStore,
    | "get"
    | "set"
    | "del"
    | "expire"
    | "zremrangebyscore"
    | "zadd"
    | "zcard"
    | "zrange"
    | "zrem"
  >,
  config: R2Config,
) => {
  const logger = new Logger("BattleObjectStorage");

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: Redacted.value(config.accessKeyId),
      secretAccessKey: Redacted.value(config.secretAccessKey),
    },
  });

  logger.log(`R2 client initialized for bucket: ${config.bucketName}`);

  const objectStorage = {
    async uploadBattleData(
      battleId: string,
      data: RawBattleData,
    ): Promise<void> {
      try {
        const key = `battles/${battleId}.json`;
        const jsonString = JSON.stringify(data);
        const compressedData = gzipSync(jsonString);

        const command = new PutObjectCommand({
          Bucket: config.bucketName,
          Key: key,
          Body: compressedData,
          IfNoneMatch: "*",
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
        if (
          error instanceof S3ServiceException &&
          error.$metadata.httpStatusCode === 412
        )
          return;
        logger.error(`Failed to upload battle data for ${battleId}:`, error);
        throw error;
      }
    },

    async getBattleData<TData>(
      battleId: string,
      decodeJson: (value: string) => TData,
    ): Promise<TData> {
      try {
        const cacheKey = `${CACHE_PREFIX}:${battleId}`;

        const cachedData = await redisStore.get(cacheKey).catch((error) => {
          logger.warn("Raw battle cache unavailable", error);

          return null;
        });

        if (cachedData) {
          logger.debug(`Cache hit for battle ${battleId}`);

          if (Buffer.byteLength(cachedData, "utf8") <= MAX_CACHE_ENTRY_BYTES) {
            await objectStorage.updateLRU(battleId);
          } else {
            await Promise.all([
              redisStore.del(cacheKey),
              redisStore.zrem(LRU_KEY, battleId),
            ]).catch((error) =>
              logger.warn("Raw battle cache cleanup failed", error),
            );
          }

          return decodeJson(cachedData);
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

        const parsedData = decodeJson(decompressedData);

        await objectStorage.cacheData(battleId, decompressedData);
        logger.log(`Battle data retrieved from R2 for battle ${battleId}`);

        return parsedData;
      } catch (error) {
        logger.error(`Failed to retrieve battle data for ${battleId}:`, error);
        throw error;
      }
    },

    async deleteBattlesData(battleIds: readonly string[]): Promise<string[]> {
      const failed: string[] = [];

      for (const batch of chunk([...battleIds], 1_000)) {
        const response = await client.send(
          new DeleteObjectsCommand({
            Bucket: config.bucketName,
            Delete: {
              Objects: batch.map((id) => ({ Key: `battles/${id}.json` })),
              Quiet: true,
            },
          }),
          { abortSignal: AbortSignal.timeout(10_000) },
        );

        if (response.Errors?.some((error) => !error.Key)) {
          throw new Error(
            "R2 returned an unidentified object deletion failure",
          );
        }

        const errors = new Set(response.Errors?.map((error) => error.Key));

        const completed = batch.filter(
          (id) => !errors.has(`battles/${id}.json`),
        );

        failed.push(...batch.filter((id) => errors.has(`battles/${id}.json`)));

        if (completed.length > 0) {
          // Redis failure keeps the durable cleanup intent for a safe retry.
          await Promise.all([
            redisStore.del(...completed.map((id) => `${CACHE_PREFIX}:${id}`)),
            redisStore.zrem(LRU_KEY, ...completed),
          ]);
        }
      }

      return failed;
    },

    async cacheData(battleId: string, data: string): Promise<void> {
      try {
        const cacheKey = `${CACHE_PREFIX}:${battleId}`;
        const timestamp = Date.now();

        if (Buffer.byteLength(data, "utf8") > MAX_CACHE_ENTRY_BYTES) {
          await Promise.all([
            redisStore.del(cacheKey),
            redisStore.zrem(LRU_KEY, battleId),
          ]);

          return;
        }

        await Promise.all([
          redisStore.set(cacheKey, data, CACHE_TTL),
          redisStore.zadd(LRU_KEY, timestamp, battleId),
        ]);

        await objectStorage.enforceLRULimit();
      } catch (error) {
        logger.warn(`Failed to cache data for battle ${battleId}:`, error);
      }
    },

    async updateLRU(battleId: string): Promise<void> {
      try {
        const timestamp = Date.now();
        await Promise.all([
          redisStore.expire(`${CACHE_PREFIX}:${battleId}`, CACHE_TTL),
          redisStore.zadd(LRU_KEY, timestamp, battleId),
        ]);
      } catch (error) {
        logger.warn(`Failed to update LRU for battle ${battleId}:`, error);
      }
    },

    async enforceLRULimit(): Promise<void> {
      try {
        await redisStore.zremrangebyscore(
          LRU_KEY,
          "-inf",
          Date.now() - CACHE_TTL * 1_000,
        );
        const count = await redisStore.zcard(LRU_KEY);

        if (count > MAX_CACHE_SIZE) {
          const toRemove = count - MAX_CACHE_SIZE;

          const oldestBattles = await redisStore.zrange(
            LRU_KEY,
            0,
            toRemove - 1,
          );

          if (oldestBattles.length > 0) {
            await Promise.all([
              redisStore.del(
                ...oldestBattles.map(
                  (battleId) => `${CACHE_PREFIX}:${battleId}`,
                ),
              ),
              redisStore.zrem(LRU_KEY, ...oldestBattles),
            ]);

            logger.log(
              `Evicted ${oldestBattles.length} battles from cache (LRU limit: ${MAX_CACHE_SIZE})`,
            );
          }
        }
      } catch (error) {
        logger.warn("Failed to enforce LRU limit:", error);
      }
    },
  };

  return objectStorage;
};

type BattleObjectStorageModule = ReturnType<typeof makeBattleObjectStorage>;

export type BattleObjectStorage = Pick<
  BattleObjectStorageModule,
  "deleteBattlesData" | "getBattleData" | "uploadBattleData"
>;
