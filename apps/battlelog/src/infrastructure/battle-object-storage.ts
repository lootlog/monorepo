import {
  S3Client,
  GetObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { gunzipSync } from "node:zlib";
import type { R2Config } from "#src/config/r2.config";
import { ContextLogger } from "@lootlog/instrumentation";
import type { RedisStore } from "#src/infrastructure/redis-store";
import { chunk } from "es-toolkit";
import { Effect, Redacted, Schema } from "effect";
import { TaggedError as TaggedErrorClass } from "effect/Schema";

const CACHE_PREFIX = "battle:raw";

const LRU_KEY = "battle:raw:lru";

const MAX_CACHE_SIZE = 1000;

const MAX_CACHE_ENTRY_BYTES = 256 * 1024;

const CACHE_TTL = 24 * 60 * 60;

export type BattleObjectCache = Pick<
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
>;

class BattleObjectStorageError extends TaggedErrorClass<
  BattleObjectStorageError,
  { readonly brand: unique symbol }
>()("BattleObjectStorageError", { cause: Schema.Defect() }) {}

const r2 = <A>(send: (signal: AbortSignal) => Promise<A>) =>
  Effect.tryPromise({
    try: send,
    catch: (cause) => new BattleObjectStorageError({ cause }),
  });

export const makeBattleObjectStorage = (
  redisStore: BattleObjectCache,
  config: R2Config,
) => {
  const logger = new ContextLogger("BattleObjectStorage");

  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: Redacted.value(config.accessKeyId),
      secretAccessKey: Redacted.value(config.secretAccessKey),
    },
  });

  logger.info(`R2 client initialized for bucket: ${config.bucketName}`);

  const forgetCached = (battleId: string) =>
    Effect.all(
      [
        redisStore.del(`${CACHE_PREFIX}:${battleId}`),
        redisStore.zrem(LRU_KEY, battleId),
      ],
      { concurrency: "unbounded", discard: true },
    );

  const updateLRU = (battleId: string) =>
    Effect.all(
      [
        redisStore.expire(`${CACHE_PREFIX}:${battleId}`, CACHE_TTL),
        redisStore.zadd(LRU_KEY, Date.now(), battleId),
      ],
      { concurrency: "unbounded", discard: true },
    ).pipe(
      Effect.catch((error) =>
        Effect.sync(() =>
          logger.warn(`Failed to update LRU for battle ${battleId}:`, error),
        ),
      ),
    );

  const enforceLRULimit = Effect.gen(function* () {
    yield* redisStore.zremrangebyscore(
      LRU_KEY,
      "-inf",
      Date.now() - CACHE_TTL * 1_000,
    );
    const count = yield* redisStore.zcard(LRU_KEY);

    if (count <= MAX_CACHE_SIZE) return;

    const oldestBattles = yield* redisStore.zrange(
      LRU_KEY,
      0,
      count - MAX_CACHE_SIZE - 1,
    );

    if (oldestBattles.length === 0) return;

    yield* Effect.all(
      [
        redisStore.del(
          ...oldestBattles.map((battleId) => `${CACHE_PREFIX}:${battleId}`),
        ),
        redisStore.zrem(LRU_KEY, ...oldestBattles),
      ],
      { concurrency: "unbounded", discard: true },
    );

    logger.info(
      `Evicted ${oldestBattles.length} battles from cache (LRU limit: ${MAX_CACHE_SIZE})`,
    );
  }).pipe(
    Effect.catch((error) =>
      Effect.sync(() => logger.warn("Failed to enforce LRU limit:", error)),
    ),
  );

  const cacheData = (battleId: string, data: string) =>
    (Buffer.byteLength(data, "utf8") > MAX_CACHE_ENTRY_BYTES
      ? forgetCached(battleId)
      : Effect.all(
          [
            redisStore.set(`${CACHE_PREFIX}:${battleId}`, data, CACHE_TTL),
            redisStore.zadd(LRU_KEY, Date.now(), battleId),
          ],
          { concurrency: "unbounded", discard: true },
        ).pipe(Effect.andThen(enforceLRULimit))
    ).pipe(
      Effect.catch((error) =>
        Effect.sync(() =>
          logger.warn(`Failed to cache data for battle ${battleId}:`, error),
        ),
      ),
    );

  const readObject = (battleId: string) =>
    Effect.gen(function* () {
      logger.debug(`Cache miss for battle ${battleId}, fetching from R2`);

      const response = yield* r2((abortSignal) =>
        client.send(
          new GetObjectCommand({
            Bucket: config.bucketName,
            Key: `battles/${battleId}.json`,
          }),
          { abortSignal },
        ),
      );

      const body = response.Body;

      if (!body) {
        return yield* Effect.die(
          new Error(`R2 returned no body for battle ${battleId}`),
        );
      }

      const isCompressed =
        response.Metadata?.compressed === "gzip" ||
        response.ContentEncoding === "gzip";

      if (isCompressed) {
        const compressed = yield* r2(() => body.transformToByteArray());
        logger.debug(`Decompressed battle ${battleId} data`);

        return gunzipSync(compressed).toString("utf-8");
      }

      logger.debug(`Battle ${battleId} data is not compressed (legacy format)`);

      return yield* r2(() => body.transformToString());
    });

  const getBattleData = <TData>(
    battleId: string,
    decodeJson: (value: string) => TData,
  ) =>
    Effect.gen(function* () {
      const cacheKey = `${CACHE_PREFIX}:${battleId}`;

      const cachedData = yield* redisStore.get(cacheKey).pipe(
        Effect.catch((error) =>
          Effect.sync(() => {
            logger.warn("Raw battle cache unavailable", error);

            return null;
          }),
        ),
      );

      if (cachedData) {
        logger.debug(`Cache hit for battle ${battleId}`);

        if (Buffer.byteLength(cachedData, "utf8") <= MAX_CACHE_ENTRY_BYTES) {
          yield* updateLRU(battleId);
        } else {
          yield* forgetCached(battleId).pipe(
            Effect.catch((error) =>
              Effect.sync(() =>
                logger.warn("Raw battle cache cleanup failed", error),
              ),
            ),
          );
        }

        return yield* Effect.try({
          try: () => decodeJson(cachedData),
          catch: (cause) => new BattleObjectStorageError({ cause }),
        });
      }

      const data = yield* readObject(battleId);

      const parsedData = yield* Effect.try({
        try: () => decodeJson(data),
        catch: (cause) => new BattleObjectStorageError({ cause }),
      });

      yield* cacheData(battleId, data);
      logger.info(`Battle data retrieved from R2 for battle ${battleId}`);

      return parsedData;
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() =>
          logger.error(
            `Failed to retrieve battle data for ${battleId}:`,
            error,
          ),
        ),
      ),
    );

  const deleteBattlesData = (battleIds: readonly string[]) =>
    Effect.gen(function* () {
      const failed: string[] = [];

      for (const batch of chunk(battleIds, 1_000)) {
        const response = yield* r2(() =>
          client.send(
            new DeleteObjectsCommand({
              Bucket: config.bucketName,
              Delete: {
                Objects: batch.map((id) => ({ Key: `battles/${id}.json` })),
                Quiet: true,
              },
            }),
            { abortSignal: AbortSignal.timeout(10_000) },
          ),
        );

        if (response.Errors?.some((error) => !error.Key)) {
          return yield* new BattleObjectStorageError({
            cause: response.Errors,
          });
        }

        const errors = new Set(response.Errors?.map((error) => error.Key));

        const completed = batch.filter(
          (id) => !errors.has(`battles/${id}.json`),
        );

        failed.push(...batch.filter((id) => errors.has(`battles/${id}.json`)));

        if (completed.length > 0) {
          yield* Effect.all(
            [
              redisStore.del(...completed.map((id) => `${CACHE_PREFIX}:${id}`)),
              redisStore.zrem(LRU_KEY, ...completed),
            ],
            { concurrency: "unbounded", discard: true },
          );
        }
      }

      return failed;
    });

  return { getBattleData, deleteBattlesData, cacheData };
};

export type BattleObjectStorage = Pick<
  ReturnType<typeof makeBattleObjectStorage>,
  "deleteBattlesData" | "getBattleData"
>;
