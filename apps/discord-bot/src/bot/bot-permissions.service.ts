import { Injectable, Logger } from '@nestjs/common';
import {
  ChannelType,
  Client,
  PermissionFlagsBits,
  type GuildMember,
  type PermissionsBitField,
} from 'discord.js';
import type { BotPermissionsStatusDto } from 'src/bot/dto/bot-permissions-status.dto';

const CACHE_TTL_SECONDS = 300;
const CACHE_TTL_MS = CACHE_TTL_SECONDS * 1000;

const REQUIRED_PERMISSIONS: ReadonlyArray<{
  key: string;
  flag: bigint;
}> = [
  { key: 'ViewChannel', flag: PermissionFlagsBits.ViewChannel },
  { key: 'SendMessages', flag: PermissionFlagsBits.SendMessages },
  { key: 'EmbedLinks', flag: PermissionFlagsBits.EmbedLinks },
  { key: 'ReadMessageHistory', flag: PermissionFlagsBits.ReadMessageHistory },
];

type CachedStatus = {
  expiresAt: number;
  value: BotPermissionsStatusDto;
};

@Injectable()
export class BotPermissionsService {
  private readonly logger = new Logger(BotPermissionsService.name);
  private readonly cache = new Map<string, CachedStatus>();

  constructor(private readonly client: Client) {}

  async getGuildPermissionsStatus(options: {
    guildId: string;
    channelId?: string;
    force?: boolean;
  }): Promise<BotPermissionsStatusDto> {
    const { guildId, channelId, force = false } = options;

    if (!channelId) {
      return this.buildStatus({
        missingPermissions: ['CHANNEL_NOT_CONFIGURED'],
        source: 'LIVE',
      });
    }

    const cacheKey = this.getCacheKey(guildId, channelId);
    const now = Date.now();

    if (!force) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        return {
          ...cached.value,
          source: 'CACHE',
          cacheTtlSeconds: Math.max(
            0,
            Math.ceil((cached.expiresAt - now) / 1000),
          ),
          checkedAt: new Date(now).toISOString(),
        };
      }
      if (cached && cached.expiresAt <= now) {
        this.cache.delete(cacheKey);
      }
    }

    const status = await this.fetchStatus(guildId, channelId);

    this.cache.set(cacheKey, {
      value: {
        ...status,
        source: 'LIVE',
      },
      expiresAt: now + CACHE_TTL_MS,
    });

    return status;
  }

  private async fetchStatus(
    guildId: string,
    channelId: string,
  ): Promise<BotPermissionsStatusDto> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);

    if (!guild) {
      return this.buildStatus({
        missingPermissions: ['BOT_NOT_IN_GUILD'],
        source: 'LIVE',
      });
    }

    const channel = await guild.channels.fetch(channelId).catch(() => null);

    if (!channel) {
      return this.buildStatus({
        missingPermissions: ['CHANNEL_NOT_FOUND'],
        source: 'LIVE',
      });
    }

    if (
      channel.type === ChannelType.GuildVoice ||
      channel.type === ChannelType.GuildStageVoice ||
      channel.type === ChannelType.GuildCategory
    ) {
      return this.buildStatus({
        missingPermissions: ['CHANNEL_NOT_TEXT_BASED'],
        source: 'LIVE',
      });
    }

    const botMember =
      guild.members.me ??
      (await guild.members.fetchMe().catch(() => null as GuildMember | null));

    if (!botMember) {
      return this.buildStatus({
        missingPermissions: ['BOT_MEMBER_NOT_FOUND'],
        source: 'LIVE',
      });
    }

    const permissions = channel.permissionsFor(
      botMember,
    ) as PermissionsBitField | null;

    if (!permissions) {
      return this.buildStatus({
        missingPermissions: ['PERMISSIONS_UNAVAILABLE'],
        source: 'LIVE',
      });
    }

    const missingPermissions = REQUIRED_PERMISSIONS.filter(
      (permission) => !permissions.has(permission.flag),
    ).map((permission) => permission.key);

    return this.buildStatus({
      missingPermissions,
      source: 'LIVE',
    });
  }

  private buildStatus(options: {
    missingPermissions: string[];
    source: 'CACHE' | 'LIVE';
  }): BotPermissionsStatusDto {
    const { missingPermissions, source } = options;

    return {
      ok: missingPermissions.length === 0,
      missingPermissions,
      checkedAt: new Date().toISOString(),
      cacheTtlSeconds: CACHE_TTL_SECONDS,
      source,
    };
  }

  private getCacheKey(guildId: string, channelId: string): string {
    return `discord-bot:guild:${guildId}:permissions-status:${channelId}`;
  }
}
