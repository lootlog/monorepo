import { describe, expect, it } from "vitest";
import { UpdateUserPreferencesDto } from "./update-user-preferences.dto";

describe("UpdateUserPreferencesDto", () => {
  it("accepts a partial chat appearance patch", () => {
    expect(
      UpdateUserPreferencesDto.schema.parse({
        chatAppearance: { messageGapPx: 8 },
      }),
    ).toEqual({
      chatAppearance: { messageGapPx: 8 },
    });
  });

  it("rejects an unsupported NPC layout", () => {
    expect(
      UpdateUserPreferencesDto.schema.safeParse({
        chatAppearance: { npcLayout: "card" },
      }).success,
    ).toBe(false);
  });
});
