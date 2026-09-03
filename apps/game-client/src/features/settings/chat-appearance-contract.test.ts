import {
  CHAT_APPEARANCE_COMPACT_PRESET,
  CHAT_APPEARANCE_READABLE_PRESET,
} from "@lootlog/schema/chat-appearance";
import {
  getChatAppearancePreset,
  mergeChatAppearanceSettings,
} from "@lootlog/domain/chat-appearance";
import { describe, expect, it } from "vitest";

describe("chat appearance contract", () => {
  it("recognizes readable and compact presets", () => {
    expect(getChatAppearancePreset(CHAT_APPEARANCE_READABLE_PRESET)).toBe(
      "readable",
    );
    expect(getChatAppearancePreset(CHAT_APPEARANCE_COMPACT_PRESET)).toBe(
      "compact",
    );
  });

  it("marks a changed preset as custom", () => {
    expect(
      getChatAppearancePreset({
        ...CHAT_APPEARANCE_READABLE_PRESET,
        messageGapPx: 9,
      }),
    ).toBe("custom");
  });

  it("clamps numeric patches and preserves omitted flags", () => {
    expect(
      mergeChatAppearanceSettings(CHAT_APPEARANCE_COMPACT_PRESET, {
        fontScalePercent: 1_000,
        messageGapPx: -5,
      }),
    ).toEqual({
      ...CHAT_APPEARANCE_COMPACT_PRESET,
      fontScalePercent: 150,
      messageGapPx: 0,
    });
  });
});
