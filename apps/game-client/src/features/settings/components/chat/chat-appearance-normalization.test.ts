import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";
import { normalizeChatAppearanceSettings } from "@lootlog/domain/chat-appearance";
import { describe, expect, it } from "vitest";

describe("chat appearance location metadata", () => {
  it("normalizes location and coordinates as one field", () => {
    const normalizedSettings = normalizeChatAppearanceSettings({
      ...CHAT_APPEARANCE_READABLE_PRESET,
      showNpcLocationAndCoordinates: false,
    });

    expect(normalizedSettings.showNpcLocationAndCoordinates).toBe(false);
    expect(normalizedSettings).not.toHaveProperty("showNpcLocation");
    expect(normalizedSettings).not.toHaveProperty("showNpcCoordinates");
  });
});
