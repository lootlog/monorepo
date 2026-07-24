import { describe, expect, it } from "vitest";
import { getChatDensityStyle } from "./chat-density";

describe("getChatDensityStyle", () => {
  it.each([
    [70, "8.4px", "19.6px"],
    [100, "12px", "28px"],
    [150, "18px", "42px"],
  ])(
    "scales the whole chat geometry at %s%%",
    (fontScalePercent, fontSize, avatarHeight) => {
      const densityStyle = getChatDensityStyle(fontScalePercent);

      expect(densityStyle["--ll-chat-font-size"]).toBe(fontSize);
      expect(densityStyle["--ll-chat-avatar-height"]).toBe(avatarHeight);
    },
  );
});
