import {
  LOOTLOG_GUILD_STATUS_COLORS,
  TIP_SECTION_END,
  TIP_SECTION_START,
} from "@/addons/extensions/online-players-glow/online-players-glow.constants";
import type {
  AddonPresenceGuildEntry,
  LootlogGuildActivityStatus,
  PresenceLootlogGuildStatus,
} from "@/addons/extensions/online-players-glow/online-players-glow.types";

const escapeHtml = (value: string): string => {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
};

export const buildPresenceKey = (
  accountId: string,
  characterId: string,
): string => {
  return `${accountId}-${characterId}`;
};

export const resolveLootlogGuildActivityStatus = (
  guildStatusByGuildId: Record<string, PresenceLootlogGuildStatus> | undefined,
  guildId: string,
): LootlogGuildActivityStatus => {
  const guildStatus = guildStatusByGuildId?.[guildId];

  if (!guildStatus) {
    return "none";
  }

  if (guildStatus.timersEnabled && guildStatus.lootEnabled) {
    return "both";
  }

  if (guildStatus.timersEnabled || guildStatus.lootEnabled) {
    return "partial";
  }

  return "none";
};

export const resolveLootlogGuildStatusColor = (
  status: LootlogGuildActivityStatus,
): string => {
  return LOOTLOG_GUILD_STATUS_COLORS[status];
};

export const stripTipSectionFromHtml = (tipHtml: string): string => {
  const start = TIP_SECTION_START.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const end = TIP_SECTION_END.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  return tipHtml.replace(new RegExp(`${start}[\\s\\S]*?${end}`, "g"), "");
};

const buildLootlogTipSection = (
  guildEntries: AddonPresenceGuildEntry[],
): string => {
  const guildsLabel =
    guildEntries.length > 0
      ? guildEntries
          .map((entry) => {
            const label = escapeHtml(entry.label);
            return `<span style="color:${entry.color};white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${label}</span>`;
          })
          .join(", ")
      : `<span style="color:${LOOTLOG_GUILD_STATUS_COLORS.none};white-space:normal;overflow-wrap:anywhere;word-break:break-word;">-</span>`;

  return `<div class="ll-lootlog-tip" style="display:block;clear:both;width:100%;margin-top:-1px;font-size:11px;line-height:1.2;white-space:normal;overflow:visible;"><div class="line"></div><div style="display:block;clear:both;text-align:left;">Lootlogi: <span style="margin-left:2px;white-space:normal;overflow-wrap:anywhere;word-break:break-word;">${guildsLabel}</span></div></div>`;
};

const upsertSectionInTipHtml = (
  tipHtml: string,
  sectionHtml: string,
): string => {
  const cleanTipHtml = stripTipSectionFromHtml(tipHtml);
  return `${cleanTipHtml}${TIP_SECTION_START}${sectionHtml}${TIP_SECTION_END}`;
};

export const syncLootlogSectionInTipHtml = (
  tipHtml: string,
  guildEntries: AddonPresenceGuildEntry[] | undefined,
): string => {
  if (!guildEntries) {
    return stripTipSectionFromHtml(tipHtml);
  }

  return upsertSectionInTipHtml(tipHtml, buildLootlogTipSection(guildEntries));
};
