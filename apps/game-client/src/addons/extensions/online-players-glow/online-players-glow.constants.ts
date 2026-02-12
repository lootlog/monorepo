export const DEFAULT_LOOTLOG_GLOW_COLOR = "#00d1ff";
export const DEFAULT_NON_LOOTLOG_GLOW_COLOR = "#ff3b30";

export const TOOLTIP_SECTION_ID = "lootlog-presence";
export const TIP_SECTION_START = `<!--ll-tip:${TOOLTIP_SECTION_ID}:start-->`;
export const TIP_SECTION_END = `<!--ll-tip:${TOOLTIP_SECTION_ID}:end-->`;

export const GLOW_RETRY_DELAY_MS = 150;
export const MAX_GLOW_RETRIES_PER_OTHER = 20;

export const WHO_IS_HERE_LOOTLOG_CLASS = "ll-whoishere-has-lootlog";
export const WHO_IS_HERE_BADGE_STYLE_ID = "ll-whoishere-lootlog-style";

export const LOOTLOG_GUILD_STATUS_COLORS = {
  both: "#4ade80",
  partial: "#facc15",
  none: "#9ca3af",
} as const;
