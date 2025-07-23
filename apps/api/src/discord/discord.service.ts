import { REST } from '@discordjs/rest';
import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Routes, APIGuild, APIGuildMember } from 'discord-api-types/v10';
import { RedisService } from 'src/lib/redis/redis.service';
import Redlock from 'redlock';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private redlock: Redlock;
  private readonly lockTtl = 14000;
  private readonly requiredScopes = [
    'guilds.members.read',
    'guilds',
    'identify',
    'email',
  ];

  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    const client = await this.redisService.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 1000,
      retryJitter: 200,
      automaticExtensionThreshold: 3000,
    });
  }

  async getRestClient(userId: string) {
    const token = await this.authService.getIdpToken(userId);

    this.logger.debug(`Retrieving REST client for user: ${userId}`);
    this.logger.debug(`Token: ${JSON.stringify(token)}`);

    if (!token) {
      throw new Error('Failed to retrieve IDP token');
    }
    if (!this.requiredScopes.every((scope) => token.scopes.includes(scope))) {
      throw new UnauthorizedException(
        `Missing required scopes: ${this.requiredScopes.join(', ')}`,
      );
    }

    return new REST({
      version: '10',
      authPrefix: 'Bearer',
      timeout: 10000,
    }).setToken(token.accessToken);
  }

  async getUserGuildIds(
    userId: string,
    bypassCache?: boolean,
  ): Promise<string[]> {
<<<<<<< Updated upstream
    const cacheTtl = 60 * 60 * 4; // 4 hours
    const cacheKey = `user:${userId}:guilds:data`;
    const lockKey = `user:${userId}:guilds:lock`;
=======
    const cacheTtl = 60 * 60 * 2; // 2 hours
    const cacheKey = `user:${userId}:discord-guilds:data`;
    const lockKey = `user:${userId}:discord-guilds:lock`;
>>>>>>> Stashed changes

    if (!bypassCache) {
      const cached = await this.redisService.get(cacheKey);
      if (cached) {
        this.logger.debug(`Cache hit for user: ${userId}`);
        this.logger.debug(`Cache key: ${cacheKey}`);
        return (JSON.parse(cached) as APIGuild[]).map((g) => g.id);
      }
    }

    this.logger.debug(`Cache miss for user: ${userId}`);
    this.logger.debug(`Lock key: ${lockKey}`);

    const lock = await this.redlock.acquire([lockKey], this.lockTtl);
    try {
      if (!bypassCache) {
        const cachedAfterLock = await this.redisService.get(cacheKey);
        this.logger.debug(`Cache after lock for user: ${userId}`);
        this.logger.debug(`Cache key after lock: ${cacheKey}`);
        if (cachedAfterLock) {
          return (JSON.parse(cachedAfterLock) as APIGuild[]).map((g) => g.id);
        }
      }

      const rest = await this.getRestClient(userId);
      const guilds = (await rest.get(Routes.userGuilds())) as APIGuild[];

      this.logger.debug(`Fetched guilds for user: ${userId}`);
      this.logger.debug(`Guilds: ${JSON.stringify(guilds)}`);

      if (!guilds || guilds.length === 0) {
        this.logger.warn(`No guilds found for user: ${userId}`);
        return [];
      }

      await this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl);

      return guilds.map((g) => g.id);
    } catch (error) {
      this.logger.error(
        `Failed to fetch user guilds for userId: ${userId}`,
        error,
      );
    } finally {
      await lock.release();
      this.logger.debug(`Lock released: ${lockKey}`);
    }
  }

  async clearUserGuildIdsCache(userId: string) {
    const cacheKey = `user:${userId}:guilds:data`;

    await this.redisService.del(cacheKey);
    this.logger.debug(`Cache cleared for user: ${userId}`);
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
  }): Promise<APIGuildMember | null> {
    const cacheTtl = 60; // 1 minute
    const { guildId, userId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as APIGuildMember;
    }

    const lock = await this.redlock.acquire([lockKey], this.lockTtl);

    try {
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        return JSON.parse(cachedAfterLock) as APIGuildMember;
      }

      const rest = await this.getRestClient(userId);

      const member = (await rest.get(
        Routes.userGuildMember(guildId),
      )) as APIGuildMember;
      await this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl);

      return member;
    } catch (error: any) {
      if (error.status === 404) {
        this.logger.debug(
          `Guild member not found for guildId: ${guildId}, userId: ${userId}`,
        );

        throw new NotFoundException();
      }

      this.logger.error(
        `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      );
      return null;
    } finally {
      await lock.release();
    }
  }
}
