import { REST } from '@discordjs/rest';
import {
  Injectable,
  OnModuleInit,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Routes, APIGuild, APIGuildMember } from 'discord-api-types/v10';
import { RedisService } from 'src/lib/redis/redis.service';
import Redlock from 'redlock';

@Injectable()
export class DiscordService implements OnModuleInit {
  private readonly logger = new Logger(DiscordService.name);
  private redlock: Redlock;
  private readonly lockTtl = 10000;
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
      driftFactor: 0.01, // time in ms
      retryCount: 10, // number of times to retry acquiring a lock
      retryDelay: 200, // time in ms to wait before retrying
      retryJitter: 200, // time in ms to add random jitter to retry delay
      automaticExtensionThreshold: 5000, // time in ms before extending a lock
    });
  }

  async getRestClient(userId: string) {
    const token = await this.authService.getIdpToken(userId);

    console.log(
      `Using token for userId: ${userId}, data: ${JSON.stringify(token)}`,
    );

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
      rejectOnRateLimit: ['/users'],
    }).setToken(token.accessToken);
  }

  async getUserGuildIds(userId: string): Promise<string[]> {
    const cacheTtl = 120;
    const cacheKey = `user:${userId}:guilds:data`;
    const lockKey = `user:${userId}:guilds:lock`;

    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return (JSON.parse(cached) as APIGuild[]).map((g) => g.id);
    }

    const lock = await this.redlock.acquire([lockKey], this.lockTtl);
    try {
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        return (JSON.parse(cachedAfterLock) as APIGuild[]).map((g) => g.id);
      }

      const rest = await this.getRestClient(userId);
      const guilds = (await rest.get(Routes.userGuilds())) as APIGuild[];

      await this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl);

      return guilds.map((g) => g.id);
    } finally {
      await lock.release();
      this.logger.debug(`Lock released: ${lockKey}`);
    }
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
  }): Promise<APIGuildMember> {
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
    } catch (error) {
      this.logger.error(
        `Failed to fetch guild member for guildId: ${guildId}, userId: ${userId}`,
        error,
      );
      await lock.release();
    } finally {
      await lock.release();
    }
  }
}
