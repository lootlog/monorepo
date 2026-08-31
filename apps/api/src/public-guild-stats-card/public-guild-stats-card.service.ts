import { and, not, or } from "@prisma/orm-family-sql/orm-client";
import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { RedisService } from "@lootlog/nest-shared/redis";
import sharp from "sharp";
import { serviceConfig } from "#src/config/service.config";
import { PrismaService } from "#src/db/prisma.service";
import { RuntimeEnvironment } from "@lootlog/types";

type GuildStatsCardData = {
  guild: {
    id: string;
    name: string;
    icon: string | null;
    publicStatsCardEnabled: boolean;
  };
  stats: {
    totalLoots: number;
    legendaryItems: number;
    heroicItems: number;
  };
};

type LootStatsRow = {
  total_loots: bigint | number | null;
  legendary_items: bigint | number | null;
  heroic_items: bigint | number | null;
};

type GuildStatsCardGuild = GuildStatsCardData["guild"];

const CARD_WIDTH = 1200;
const CARD_HEIGHT = 630;
const CARD_RADIUS = 8;
const CACHE_TTL_SECONDS = 86_400;
const CACHE_VERSION = "v2";
const FONT_FAMILY = "DejaVu Sans, Arial, sans-serif";
const ICON_SIZE = 112;
const ICON_LEFT = 80;
const ICON_TOP = 78;
const ICON_FETCH_TIMEOUT_MS = 2_000;
const MAX_ICON_BYTES = 2_000_000;
const REFRESH_COOLDOWN_SECONDS = 300;

@Injectable()
export class PublicGuildStatsCardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getStatsCard(guildId: string): Promise<Buffer> {
    const guild = await this.getCardGuild(guildId);
    const cacheKey = this.buildCacheKey(guildId);
    const shouldUseCache = this.shouldUseCache();
    const cached = shouldUseCache ? await this.redis.get(cacheKey) : null;

    if (cached) {
      return Buffer.from(cached, "base64");
    }

    const image = await this.renderCard({
      guild,
      stats: await this.getLootStats(guildId),
    });

    if (shouldUseCache) {
      await this.redis.set(
        cacheKey,
        image.toString("base64"),
        CACHE_TTL_SECONDS,
      );
    }

    return image;
  }

  async refreshStatsCard(guildId: string): Promise<{ nextRefreshAt: string }> {
    const guild = await this.getCardGuild(guildId);
    const nextRefreshAt = new Date(
      Date.now() + REFRESH_COOLDOWN_SECONDS * 1000,
    ).toISOString();
    const cooldownKey = this.buildRefreshCooldownKey(guildId);
    const acquired = await this.redis.setNX(
      cooldownKey,
      nextRefreshAt,
      REFRESH_COOLDOWN_SECONDS,
    );

    if (!acquired) {
      const activeNextRefreshAt = await this.redis.get(cooldownKey);

      throw new HttpException(
        {
          message: "Stats card refresh is rate limited",
          nextRefreshAt: activeNextRefreshAt ?? nextRefreshAt,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    try {
      const image = await this.renderCard({
        guild,
        stats: await this.getLootStats(guildId),
      });

      if (this.shouldUseCache()) {
        await this.redis.set(
          this.buildCacheKey(guildId),
          image.toString("base64"),
          CACHE_TTL_SECONDS,
        );
      }
    } catch (error) {
      await this.redis.del(cooldownKey);
      throw error;
    }

    return { nextRefreshAt };
  }

  private shouldUseCache() {
    return serviceConfig.env !== RuntimeEnvironment.LOCAL;
  }

  private buildCacheKey(guildId: string) {
    return `guild-stats-card:${guildId}:${CACHE_VERSION}`;
  }

  private buildRefreshCooldownKey(guildId: string) {
    return `guild-stats-card-refresh:${guildId}`;
  }

  private async getCardGuild(guildId: string): Promise<GuildStatsCardGuild> {
    const guild = await this.prisma.orm.public.Guild.where((row) =>
      and(row.id.eq(guildId), row.active.eq(true)),
    )
      .select("id", "name", "icon", "publicStatsCardEnabled")
      .first();

    if (!guild || !guild.publicStatsCardEnabled) {
      throw new NotFoundException("Guild not found");
    }

    return guild;
  }

  private async getLootStats(
    guildId: string,
  ): Promise<GuildStatsCardData["stats"]> {
    const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.sql<LootStatsRow[]>`
      WITH valid_loots AS (
        SELECT DISTINCT l.id
        FROM "OrganizationLootRecord" olr
        INNER JOIN "Loot" l ON l.id = olr."lootId"
        WHERE olr."guildId" = ${guildId}
          AND olr."archivedAt" IS NULL
          AND l."createdAt" >= ${dateFrom}
      )
      SELECT
        COUNT(DISTINCT l.id) AS total_loots,
        COUNT(li.id) FILTER (WHERE isnap.rarity = 'LEGENDARY') AS legendary_items,
        COUNT(li.id) FILTER (WHERE isnap.rarity = 'HEROIC') AS heroic_items
      FROM valid_loots vl
      INNER JOIN "Loot" l ON l.id = vl.id
      LEFT JOIN "LootItem" li ON li."lootId" = l.id
      LEFT JOIN "ItemSnapshot" isnap ON isnap.id = li."itemSnapshotId"
    `;
    const row = rows[0];

    return {
      totalLoots: this.toNumber(row?.total_loots),
      legendaryItems: this.toNumber(row?.legendary_items),
      heroicItems: this.toNumber(row?.heroic_items),
    };
  }

  private toNumber(value: bigint | number | null | undefined) {
    if (typeof value === "bigint") {
      return Number(value);
    }

    return value ?? 0;
  }

  private async renderCard(data: GuildStatsCardData): Promise<Buffer> {
    const icon = await this.fetchGuildIcon(data.guild.id, data.guild.icon);
    const base = await sharp(Buffer.from(this.buildSvg(data, !icon)))
      .png()
      .toBuffer();

    if (!icon) {
      return base;
    }

    return sharp(base)
      .composite([
        {
          input: icon,
          left: ICON_LEFT,
          top: ICON_TOP,
        },
      ])
      .png()
      .toBuffer();
  }

  private buildSvg(data: GuildStatsCardData, showInitials: boolean) {
    const guildName = this.truncate(data.guild.name, 34);
    const initials = this.getInitials(data.guild.name);

    return `
      <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="${CARD_WIDTH}" y2="${CARD_HEIGHT}" gradientUnits="userSpaceOnUse">
            <stop stop-color="#08111f"/>
            <stop offset="0.48" stop-color="#15233f"/>
            <stop offset="1" stop-color="#241426"/>
          </linearGradient>
          <radialGradient id="gold" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(930 145) rotate(127) scale(440 390)">
            <stop stop-color="#F8D76D" stop-opacity="0.34"/>
            <stop offset="1" stop-color="#F8D76D" stop-opacity="0"/>
          </radialGradient>
          <radialGradient id="blue" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(140 560) rotate(-35) scale(420 320)">
            <stop stop-color="#5BA8FF" stop-opacity="0.26"/>
            <stop offset="1" stop-color="#5BA8FF" stop-opacity="0"/>
          </radialGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="28" flood-color="#000000" flood-opacity="0.35"/>
          </filter>
        </defs>

        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CARD_RADIUS}" fill="url(#bg)"/>
        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CARD_RADIUS}" fill="url(#gold)"/>
        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="${CARD_RADIUS}" fill="url(#blue)"/>
        <path d="M80 500 C250 430 360 610 520 535 C700 450 785 500 1130 390" stroke="white" stroke-opacity="0.07" stroke-width="2"/>
        <path d="M770 82 L1120 82" stroke="white" stroke-opacity="0.08" stroke-width="1"/>
        <path d="M830 548 L1120 548" stroke="white" stroke-opacity="0.08" stroke-width="1"/>

        <g filter="url(#shadow)">
          <rect x="56" y="54" width="1088" height="522" rx="32" fill="#080D18" fill-opacity="0.52" stroke="white" stroke-opacity="0.11"/>
        </g>

        <rect x="${ICON_LEFT}" y="${ICON_TOP}" width="${ICON_SIZE}" height="${ICON_SIZE}" rx="26" fill="#182238" stroke="white" stroke-opacity="0.20" stroke-width="3"/>
        ${
          showInitials
            ? `<text x="${ICON_LEFT + ICON_SIZE / 2}" y="${ICON_TOP + 70}" text-anchor="middle" font-family="${FONT_FAMILY}" font-size="38" font-weight="800" fill="#F8D76D">${this.escapeSvg(initials)}</text>`
            : ""
        }

        <text x="222" y="134" font-family="${FONT_FAMILY}" font-size="52" font-weight="850" fill="#FFFFFF">${this.escapeSvg(guildName)}</text>
        <text x="224" y="176" font-family="${FONT_FAMILY}" font-size="18" font-weight="700" letter-spacing="3" fill="#AAB4C8">STATYSTYKI - OSTATNIE 30 DNI</text>
        <text x="1028" y="104" font-family="${FONT_FAMILY}" font-size="18" font-weight="800" fill="#FFFFFF" fill-opacity="0.58">lootlog.pl</text>

        ${this.metricBlock(82, 314, "LOOTY", data.stats.totalLoots, "#FFFFFF", "rgba(255,255,255,0.10)", "rgba(255,255,255,0.15)")}
        ${this.metricBlock(430, 314, "LEGENDY", data.stats.legendaryItems, "#FFE28A", "rgba(255,214,95,0.13)", "rgba(255,214,95,0.26)")}
        ${this.metricBlock(778, 314, "HEROIKI", data.stats.heroicItems, "#A6D8FF", "rgba(86,166,255,0.13)", "rgba(86,166,255,0.25)")}
      </svg>
    `;
  }

  private metricBlock(
    x: number,
    y: number,
    label: string,
    value: number,
    valueColor: string,
    fill: string,
    stroke: string,
  ) {
    return `
      <g>
        <rect x="${x}" y="${y}" width="312" height="176" rx="26" fill="${fill}" stroke="${stroke}" stroke-width="1"/>
        <text x="${x + 30}" y="${y + 58}" font-family="${FONT_FAMILY}" font-size="18" font-weight="800" letter-spacing="3" fill="#AAB4C8">${label}</text>
        <text x="${x + 30}" y="${y + 132}" font-family="${FONT_FAMILY}" font-size="68" font-weight="900" fill="${valueColor}">${this.formatNumber(value)}</text>
      </g>
    `;
  }

  private async fetchGuildIcon(guildId: string, icon: string | null) {
    const iconUrl = this.resolveGuildIconUrl(guildId, icon);

    if (!iconUrl) {
      return null;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        ICON_FETCH_TIMEOUT_MS,
      );
      const response = await fetch(iconUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get("content-type") ?? "";
      const contentLength = Number(response.headers.get("content-length") ?? 0);

      if (!contentType.startsWith("image/") || contentLength > MAX_ICON_BYTES) {
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();

      if (arrayBuffer.byteLength > MAX_ICON_BYTES) {
        return null;
      }

      return this.prepareIcon(Buffer.from(arrayBuffer));
    } catch {
      return null;
    }
  }

  private resolveGuildIconUrl(guildId: string, icon: string | null) {
    if (!icon) {
      return null;
    }

    if (icon.startsWith("http://") || icon.startsWith("https://")) {
      let url: URL;

      try {
        url = new URL(icon);
      } catch {
        return null;
      }

      const allowedHosts = new Set([
        "cdn.discordapp.com",
        "media.discordapp.net",
      ]);

      if (!allowedHosts.has(url.hostname)) {
        return null;
      }

      return url.toString();
    }

    const extension = icon.startsWith("a_") ? "gif" : "png";
    return `https://cdn.discordapp.com/icons/${guildId}/${icon}.${extension}?size=256`;
  }

  private prepareIcon(input: Buffer) {
    const roundedMask = Buffer.from(`
      <svg width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 ${ICON_SIZE} ${ICON_SIZE}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${ICON_SIZE}" height="${ICON_SIZE}" rx="26" ry="26" fill="#fff"/>
      </svg>
    `);

    return sharp(input, { animated: false })
      .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
      .composite([{ input: roundedMask, blend: "dest-in" }])
      .png()
      .toBuffer();
  }

  private getInitials(value: string) {
    const words = value.trim().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return "LL";
    }

    return words
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() ?? "")
      .join("");
  }

  private truncate(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value;
    }

    return `${value.slice(0, maxLength - 3)}...`;
  }

  private formatNumber(value: number) {
    return new Intl.NumberFormat("pl-PL").format(value);
  }

  private escapeSvg(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&apos;");
  }
}
