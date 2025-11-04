import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import type { Logger } from 'winston';
import type { CreateLootDto } from 'src/loots/dto/create-loot.dto';
import { NpcType, type Loot, type Prisma } from 'generated/client';
import { PrismaService } from 'src/db/prisma.service';
import { RedisService } from 'src/lib/redis/redis.service';
import { ErrorKey } from 'src/loots/enum/error-key.enum';
import { randomUUID } from 'node:crypto';
import { createHash } from 'node:crypto';

const LOCK_TTL_SECONDS = 5;
const DEDUP_TTL_SECONDS = 10;

interface ProcessedLootData {
  items: Prisma.JsonValue;
  players: Prisma.JsonValue;
  npcs: Prisma.JsonValue;
  lootShare: Prisma.JsonValue;
}

@Injectable()
export class LootCreationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  createUniqueLootId(loots: CreateLootDto['loots'], world: string): string {
    const string =
      [...loots]
        .sort((a, b) => a.hid.localeCompare(b.hid))
        .map((loot) => loot.hid)
        .join('') + world;
    return createHash('sha256').update(string).digest('hex');
  }

  private getLockKey(uniqueId: string): string {
    return `loot:lock:${uniqueId}`;
  }

  private getDedupKey(
    userId: string,
    uniqueId: string,
    guildId: string,
  ): string {
    return `loot:dedup:${userId}:${uniqueId}:${guildId}`;
  }

  private async acquireLock(
    lockKey: string,
    lockValue: string,
  ): Promise<boolean> {
    const acquired = await this.redis.setNX(
      lockKey,
      lockValue,
      LOCK_TTL_SECONDS,
    );
    this.logger.log({
      level: acquired ? 'debug' : 'debug',
      message: acquired
        ? `Loot lock acquired: ${lockKey}`
        : `Loot lock acquisition failed: ${lockKey}`,
    });
    return acquired;
  }

  private async releaseLock(lockKey: string, lockValue: string): Promise<void> {
    const currentValue = await this.redis.get(lockKey);
    if (currentValue === lockValue) {
      await this.redis.del(lockKey);
      this.logger.log({
        level: 'debug',
        message: `Loot lock released: ${lockKey}`,
      });
    }
  }

  private async waitForLock(lockKey: string, maxWaitMs = 3000): Promise<void> {
    const startTime = Date.now();
    const pollInterval = 100;

    while (Date.now() - startTime < maxWaitMs) {
      const lockExists = await this.redis.get(lockKey);
      if (!lockExists) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    this.logger.log({
      level: 'warn',
      message: `Lock wait timeout for ${lockKey}`,
    });
  }

  async createLootWithLocking(
    uniqueId: string,
    userId: string,
    guildId: string,
    memberId: number,
    processedData: ProcessedLootData,
    body: CreateLootDto,
  ): Promise<{ id: number }> {
    const dedupKey = this.getDedupKey(userId, uniqueId, guildId);
    const cached = await this.redis.get(dedupKey);

    if (cached) {
      this.logger.log({
        level: 'debug',
        message: 'Returning cached loot result (deduplication)',
        uniqueId,
        guildId,
        userId,
      });
      return JSON.parse(cached);
    }

    const lockKey = this.getLockKey(uniqueId);
    const lockValue = randomUUID();
    let acquired = await this.acquireLock(lockKey, lockValue);

    if (!acquired) {
      this.logger.log({
        level: 'debug',
        message: 'Waiting for lock to be released',
        uniqueId,
      });
      await this.waitForLock(lockKey);
      acquired = await this.acquireLock(lockKey, lockValue);

      if (!acquired) {
        throw new BadRequestException(ErrorKey.LOOT_CREATION_CONFLICT);
      }
    }

    try {
      let loot = await this.prisma.loot.findUnique({ where: { uniqueId } });

      if (!loot) {
        loot = await this.prisma.loot.create({
          data: {
            uniqueId,
            items: processedData.items,
            world: body.world,
            source: body.source,
            location: body.location,
            players: processedData.players,
            npcs: processedData.npcs,
            lootShare: processedData.lootShare,
          },
        });

        this.logger.log({
          level: 'info',
          message: 'Loot created',
          lootId: loot.id,
          uniqueId,
          guildId,
        });
      } else {
        this.logger.log({
          level: 'debug',
          message: 'Loot already exists, adding submission only',
          lootId: loot.id,
          uniqueId,
          guildId,
        });
      }

      await this.prisma.lootSubmission.create({
        data: {
          lootId: loot.id,
          guildId,
          memberId,
        },
      });

      const result = { id: loot.id };
      await this.redis.set(dedupKey, JSON.stringify(result), DEDUP_TTL_SECONDS);

      return result;
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const loot = await this.prisma.loot.findUnique({ where: { uniqueId } });
        if (loot) {
          try {
            await this.prisma.lootSubmission.create({
              data: {
                lootId: loot.id,
                guildId,
                memberId,
              },
            });
          } catch (submissionError) {
            if (
              submissionError &&
              typeof submissionError === 'object' &&
              'code' in submissionError &&
              submissionError.code === 'P2002'
            ) {
              this.logger.log({
                level: 'debug',
                message: 'Submission already exists (duplicate)',
                lootId: loot.id,
                guildId,
                memberId,
              });
            } else {
              throw submissionError;
            }
          }

          const result = { id: loot.id };
          await this.redis.set(
            dedupKey,
            JSON.stringify(result),
            DEDUP_TTL_SECONDS,
          );
          return result;
        }
      }
      throw error;
    } finally {
      await this.releaseLock(lockKey, lockValue);
    }
  }
}
