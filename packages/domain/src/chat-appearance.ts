import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
  CHAT_FONT_SCALE_MAX_PERCENT,
  CHAT_FONT_SCALE_MIN_PERCENT,
  CHAT_MESSAGE_GAP_MAX_PX,
  CHAT_MESSAGE_GAP_MIN_PX,
  type ChatAppearancePreset,
  type ChatAppearanceSettings,
} from "@lootlog/schema/chat-appearance";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeNumber = (
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number,
) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(maximum, Math.max(minimum, value));
};

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

export const normalizeChatAppearanceSettings = (
  value: unknown,
  fallback: ChatAppearanceSettings = CHAT_APPEARANCE_READABLE_PRESET,
): ChatAppearanceSettings => {
  const settings = isRecord(value) ? value : {};
  return {
    npcLayout:
      settings.npcLayout === "tile" || settings.npcLayout === "inline"
        ? settings.npcLayout
        : fallback.npcLayout,
    fontScalePercent: normalizeNumber(
      settings.fontScalePercent,
      fallback.fontScalePercent,
      CHAT_FONT_SCALE_MIN_PERCENT,
      CHAT_FONT_SCALE_MAX_PERCENT,
    ),
    messageGapPx: normalizeNumber(
      settings.messageGapPx,
      fallback.messageGapPx,
      CHAT_MESSAGE_GAP_MIN_PX,
      CHAT_MESSAGE_GAP_MAX_PX,
    ),
    showTimestamp: normalizeBoolean(
      settings.showTimestamp,
      fallback.showTimestamp,
    ),
    showGuildLabel: normalizeBoolean(
      settings.showGuildLabel,
      fallback.showGuildLabel,
    ),
    showNpcAvatar: normalizeBoolean(
      settings.showNpcAvatar,
      fallback.showNpcAvatar,
    ),
    showNpcLevel: normalizeBoolean(
      settings.showNpcLevel,
      fallback.showNpcLevel,
    ),
    showNpcLocationAndCoordinates: normalizeBoolean(
      settings.showNpcLocationAndCoordinates,
      fallback.showNpcLocationAndCoordinates,
    ),
  };
};

export const mergeChatAppearanceSettings = (
  currentSettings: unknown,
  patch: Partial<ChatAppearanceSettings>,
) => {
  const normalizedCurrentSettings =
    normalizeChatAppearanceSettings(currentSettings);

  return normalizeChatAppearanceSettings(
    {
      ...normalizedCurrentSettings,
      ...patch,
    },
    normalizedCurrentSettings,
  );
};

const chatAppearanceSettingsEqual = (
  left: ChatAppearanceSettings,
  right: ChatAppearanceSettings,
) =>
  left.npcLayout === right.npcLayout &&
  left.fontScalePercent === right.fontScalePercent &&
  left.messageGapPx === right.messageGapPx &&
  left.showTimestamp === right.showTimestamp &&
  left.showGuildLabel === right.showGuildLabel &&
  left.showNpcAvatar === right.showNpcAvatar &&
  left.showNpcLevel === right.showNpcLevel &&
  left.showNpcLocationAndCoordinates === right.showNpcLocationAndCoordinates;

export const getChatAppearancePreset = (
  value: unknown,
): ChatAppearancePreset => {
  const settings = normalizeChatAppearanceSettings(value);

  if (chatAppearanceSettingsEqual(settings, CHAT_APPEARANCE_READABLE_PRESET)) {
    return "readable";
  }

  if (chatAppearanceSettingsEqual(settings, CHAT_APPEARANCE_COMPACT_PRESET)) {
    return "compact";
  }

  return "custom";
};
