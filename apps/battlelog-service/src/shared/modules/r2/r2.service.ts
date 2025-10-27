import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigKey } from 'src/config/config-key.enum';
import type { R2Config } from 'src/config/r2.config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class R2Service {
  private readonly logger = new Logger(R2Service.name);
  private readonly client: S3Client;
  private readonly config: R2Config;

  private readonly CACHE_PREFIX = 'battle:raw';
  private readonly LRU_KEY = 'battle:raw:lru';
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    this.config = this.configService.get<R2Config>(ConfigKey.R2)!;

    this.client = new S3Client({
      region: this.config.region,
      endpoint: this.config.endpoint,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
      },
    });

    this.logger.log(
      `R2 client initialized for bucket: ${this.config.bucketName}`,
    );
  }

  async uploadBattleData(battleId: string, data: any): Promise<void> {
    try {
      const key = `battles/${battleId}.json`;

      const command = new PutObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
        Body: JSON.stringify(data, null, 2),
        ContentType: 'application/json',
        Metadata: {
          'battle-id': battleId,
          'uploaded-at': new Date().toISOString(),
        },
      });

      await this.client.send(command);
      this.logger.log(
        `Battle data uploaded successfully for battle ${battleId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to upload battle data for ${battleId}:`, error);
      throw error;
    }
  }

  async getBattleData(battleId: string): Promise<any> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${battleId}`;

      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.debug(`Cache hit for battle ${battleId}`);
        await this.updateLRU(battleId);
        return JSON.parse(cachedData);
      }

      this.logger.debug(`Cache miss for battle ${battleId}, fetching from R2`);
      const key = `battles/${battleId}.json`;

      const command = new GetObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error(`No data found for battle ${battleId}`);
      }

      const data = await response.Body.transformToString();
      const parsedData = JSON.parse(data);

      await this.cacheData(battleId, data);
      this.logger.log(
        `Battle data retrieved from R2 and cached for battle ${battleId}`,
      );

      return parsedData;
    } catch (error) {
      this.logger.error(
        `Failed to retrieve battle data for ${battleId}:`,
        error,
      );
      throw error;
    }
  }

  async deleteBattleData(battleId: string): Promise<void> {
    try {
      const key = `battles/${battleId}.json`;

      const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucketName,
        Key: key,
      });

      await this.client.send(command);
      await this.deleteCachedData(battleId);
      this.logger.log(
        `Battle data deleted successfully for battle ${battleId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to delete battle data for ${battleId}:`, error);
      throw error;
    }
  }

  private async cacheData(battleId: string, data: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${battleId}`;
      const timestamp = Date.now();

      const redis = await this.redisService.getClient();
      const pipeline = redis.pipeline();

      pipeline.set(cacheKey, data, 'EX', this.CACHE_TTL);
      pipeline.zadd(this.LRU_KEY, timestamp, battleId);

      await pipeline.exec();

      await this.enforceLRULimit();
    } catch (error) {
      this.logger.warn(`Failed to cache data for battle ${battleId}:`, error);
    }
  }

  private async updateLRU(battleId: string): Promise<void> {
    try {
      const timestamp = Date.now();
      const redis = await this.redisService.getClient();
      await redis.zadd(this.LRU_KEY, timestamp, battleId);
    } catch (error) {
      this.logger.warn(`Failed to update LRU for battle ${battleId}:`, error);
    }
  }

  private async enforceLRULimit(): Promise<void> {
    try {
      const redis = await this.redisService.getClient();
      const count = await redis.zcard(this.LRU_KEY);

      if (count > this.MAX_CACHE_SIZE) {
        const toRemove = count - this.MAX_CACHE_SIZE;
        const oldestBattles = await redis.zrange(this.LRU_KEY, 0, toRemove - 1);

        if (oldestBattles.length > 0) {
          const pipeline = redis.pipeline();

          for (const battleId of oldestBattles) {
            const cacheKey = `${this.CACHE_PREFIX}:${battleId}`;
            pipeline.del(cacheKey);
          }

          pipeline.zremrangebyrank(this.LRU_KEY, 0, toRemove - 1);
          await pipeline.exec();

          this.logger.log(
            `Evicted ${oldestBattles.length} battles from cache (LRU limit: ${this.MAX_CACHE_SIZE})`,
          );
        }
      }
    } catch (error) {
      this.logger.warn('Failed to enforce LRU limit:', error);
    }
  }

  private async deleteCachedData(battleId: string): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_PREFIX}:${battleId}`;
      const redis = await this.redisService.getClient();
      const pipeline = redis.pipeline();

      pipeline.del(cacheKey);
      pipeline.zrem(this.LRU_KEY, battleId);

      await pipeline.exec();
      this.logger.debug(`Removed battle ${battleId} from cache`);
    } catch (error) {
      this.logger.warn(
        `Failed to delete cached data for battle ${battleId}:`,
        error,
      );
    }
  }
}
