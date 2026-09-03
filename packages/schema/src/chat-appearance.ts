import { Schema } from "effect";

export const CHAT_FONT_SCALE_MIN_PERCENT = 70;
export const CHAT_FONT_SCALE_MAX_PERCENT = 150;
export const CHAT_MESSAGE_GAP_MIN_PX = 0;
export const CHAT_MESSAGE_GAP_MAX_PX = 16;

export const ChatNpcLayoutSchema = Schema.Literals(["tile", "inline"]);
export type ChatNpcLayout = typeof ChatNpcLayoutSchema.Type;

export const ChatAppearancePresetSchema = Schema.Literals([
  "readable",
  "compact",
  "custom",
]);
export type ChatAppearancePreset = typeof ChatAppearancePresetSchema.Type;

export const ChatAppearanceSettingsSchema = Schema.Struct({
  npcLayout: ChatNpcLayoutSchema,
  fontScalePercent: Schema.Finite.check(
    Schema.isBetween({
      minimum: CHAT_FONT_SCALE_MIN_PERCENT,
      maximum: CHAT_FONT_SCALE_MAX_PERCENT,
    }),
  ),
  messageGapPx: Schema.Finite.check(
    Schema.isBetween({
      minimum: CHAT_MESSAGE_GAP_MIN_PX,
      maximum: CHAT_MESSAGE_GAP_MAX_PX,
    }),
  ),
  showTimestamp: Schema.Boolean,
  showGuildLabel: Schema.Boolean,
  showNpcAvatar: Schema.Boolean,
  showNpcLevel: Schema.Boolean,
  showNpcLocationAndCoordinates: Schema.Boolean,
});
export type ChatAppearanceSettings = typeof ChatAppearanceSettingsSchema.Type;

export const CHAT_APPEARANCE_READABLE_PRESET = {
  npcLayout: "tile",
  fontScalePercent: 100,
  messageGapPx: 4,
  showTimestamp: true,
  showGuildLabel: true,
  showNpcAvatar: true,
  showNpcLevel: true,
  showNpcLocationAndCoordinates: true,
} as const satisfies ChatAppearanceSettings;

export const CHAT_APPEARANCE_COMPACT_PRESET = {
  npcLayout: "inline",
  fontScalePercent: 90,
  messageGapPx: 0,
  showTimestamp: true,
  showGuildLabel: true,
  showNpcAvatar: false,
  showNpcLevel: true,
  showNpcLocationAndCoordinates: true,
} as const satisfies ChatAppearanceSettings;
