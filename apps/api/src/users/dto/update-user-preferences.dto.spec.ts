import { describe, expect, it } from "vitest";
import { UpdateUserPreferencesDto } from "./update-user-preferences.dto.js";

describe("UpdateUserPreferencesDto", () => {
  it("accepts an empty hidden guild list", () => {
    expect(
      UpdateUserPreferencesDto.schema.parse({
        hiddenGuildIds: [],
      }),
    ).toEqual({
      hiddenGuildIds: [],
    });
  });

  it("accepts unique hidden guild ids", () => {
    expect(
      UpdateUserPreferencesDto.schema.parse({
        hiddenGuildIds: ["guild-1", "guild-2"],
      }),
    ).toEqual({
      hiddenGuildIds: ["guild-1", "guild-2"],
    });
  });

  it.each([
    [["guild-1", "guild-1"], "duplicate guild ids"],
    [[""], "an empty guild id"],
  ])("rejects hidden guild ids containing %s", (hiddenGuildIds) => {
    expect(
      UpdateUserPreferencesDto.schema.safeParse({ hiddenGuildIds }).success,
    ).toBe(false);
  });

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
