import {
  PORTABLE_THEME_MAX_BYTES,
  ThemeConfigV1Schema,
  ThemeLibrarySchema,
  ThemePatchRequestSchema,
} from "@lootlog/types";
import { describe, expect, it } from "vitest";
import { TEST_THEME_CONFIG } from "./theme-test-fixture";

describe("theme contracts", () => {
  it("accepts a complete safe theme configuration", () => {
    expect(ThemeConfigV1Schema.parse(TEST_THEME_CONFIG)).toEqual(
      TEST_THEME_CONFIG,
    );
  });

  it("rejects arbitrary CSS and remote assets", () => {
    expect(
      ThemeConfigV1Schema.safeParse({
        ...TEST_THEME_CONFIG,
        css: "body { display: none }",
        backgroundUrl: "https://example.com/background.png",
      }).success,
    ).toBe(false);
  });

  it("models revisioned atomic library operations", () => {
    const library = ThemeLibrarySchema.parse({
      revision: 1,
      selection: { kind: "preset", presetId: "default" },
      customThemes: [],
      specialOverrides: {},
    });

    expect(
      ThemePatchRequestSchema.parse({
        revision: library.revision,
        operations: [
          {
            kind: "upsert",
            theme: {
              id: "theme-1",
              name: "Mój motyw",
              config: TEST_THEME_CONFIG,
            },
            activate: true,
          },
        ],
      }),
    ).toBeTruthy();
    expect(PORTABLE_THEME_MAX_BYTES).toBe(64 * 1024);
  });
});
