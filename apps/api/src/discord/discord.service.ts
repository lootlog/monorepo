import { REST } from '@discordjs/rest';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { Routes, APIGuild, APIGuildMember } from 'discord-api-types/v10';
import { RedisService } from 'src/lib/redis/redis.service';
import Redlock from 'redlock';

@Injectable()
export class DiscordService implements OnModuleInit {
  private redlock: Redlock;

  constructor(
    private readonly authService: AuthService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    const client = await this.redisService.getClient();
    this.redlock = new Redlock([client], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });
  }

  async getRestClient(userId: string) {
    const token = await this.authService.getIdpToken(userId);
    if (!token) {
      throw new Error('Failed to retrieve IDP token');
    }
    return new REST({
      version: '10',
      authPrefix: 'Bearer',
      rejectOnRateLimit: ['/users'],
    }).setToken(token.accessToken);
  }

  async getUserGuilds(userId: string): Promise<APIGuild[]> {
    const cacheKey = `user:${userId}:guilds:data`;
    const lockKey = `user:${userId}:guilds:lock`;
    const lockTtl = 10000; // 10 sekund w milisekundach
    const cacheTtl = 120; // 2 minuty cache

    console.log(`Checking cache for key: ${cacheKey}`);

    // Sprawdź cache najpierw
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for user ${userId} guilds`);
      return JSON.parse(cached) as APIGuild[];
    }

    console.log(`Cache miss, acquiring lock: ${lockKey}`);

    // Użyj Redlock do distributed locking
    const lock = await this.redlock.acquire([lockKey], lockTtl);

    try {
      // Sprawdź cache ponownie po uzyskaniu locka
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        console.log(`Cache hit after acquiring lock for user ${userId} guilds`);
        return JSON.parse(cachedAfterLock) as APIGuild[];
      }

      const rest = await this.getRestClient(userId);

      console.log(`Fetching guilds for user ${userId}`);
      const guilds = (await rest.get(Routes.userGuilds())) as APIGuild[];
      console.log(
        `Guilds fetched from Discord API: ${guilds.length} guilds for user ${userId}`,
      );

      // Zapisz do cache
      await this.redisService.set(cacheKey, JSON.stringify(guilds), cacheTtl);
      console.log(`Guilds cached with TTL ${cacheTtl}s for key: ${cacheKey}`);

      return guilds;
    } finally {
      await lock.release();
      console.log(`Lock released: ${lockKey}`);
    }
  }

  async getGuildMember(options: {
    guildId: string;
    userId: string;
  }): Promise<APIGuildMember> {
    const { guildId, userId } = options;
    const cacheKey = `guild:${guildId}:member:${userId}:data`;
    const lockKey = `guild:${guildId}:member:${userId}:lock`;
    const lockTtl = 10000; // 10 sekund w milisekundach
    const cacheTtl = 60; // 1 minuta cache

    console.log(`Checking cache for key: ${cacheKey}`);

    // Sprawdź cache najpierw
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      console.log(`Cache hit for guild ${guildId} and user ${userId}`);
      return JSON.parse(cached) as APIGuildMember;
    }

    console.log(`Cache miss, acquiring lock: ${lockKey}`);

    // Użyj Redlock do distributed locking
    const lock = await this.redlock.acquire([lockKey], lockTtl);

    try {
      // Sprawdź cache ponownie po uzyskaniu locka
      const cachedAfterLock = await this.redisService.get(cacheKey);
      if (cachedAfterLock) {
        console.log(
          `Cache hit after acquiring lock for guild ${guildId} and user ${userId}`,
        );
        return JSON.parse(cachedAfterLock) as APIGuildMember;
      }

      const rest = await this.getRestClient(userId);

      console.log(`Fetching member for guild ${guildId} and user ${userId}`);
      const member = (await rest.get(
        Routes.userGuildMember(guildId),
      )) as APIGuildMember;
      console.log(
        `Member fetched from Discord API: ${member.user.id} in guild ${guildId}`,
      );

      // Zapisz do cache
      await this.redisService.set(cacheKey, JSON.stringify(member), cacheTtl);
      console.log(`Member cached with TTL ${cacheTtl}s for key: ${cacheKey}`);

      return member;
    } finally {
      await lock.release();
      console.log(`Lock released: ${lockKey}`);
    }
  }
}
