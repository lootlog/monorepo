import { PORTABLE_THEME_MAX_BYTES } from "@lootlog/types";
import { strToU8, zlibSync } from "fflate";
import { describe, expect, it } from "vitest";
import { PRESET_THEME_CONFIGS } from "./preset-configs";
import {
  createPortableTheme,
  decodePortableTheme,
  encodePortableThemeCode,
  getUniqueThemeName,
  serializePortableTheme,
} from "./portable-theme";

describe("portable themes", () => {
  const theme = createPortableTheme(
    "Nocny sygnał",
    PRESET_THEME_CONFIGS.default,
  );

  it("round-trips JSON files and compact codes", () => {
    expect(decodePortableTheme(serializePortableTheme(theme))).toEqual(theme);
    expect(decodePortableTheme(encodePortableThemeCode(theme))).toEqual(theme);
  });

  it("rejects future versions, corruption, and arbitrary fields", () => {
    expect(() =>
      decodePortableTheme(JSON.stringify({ ...theme, version: 2 })),
    ).toThrow("THEME_IMPORT_UNSUPPORTED_VERSION");
    expect(() => decodePortableTheme("LLT1.corrupted")).toThrow(
      "THEME_IMPORT_INVALID_CODE",
    );
    expect(() =>
      decodePortableTheme(JSON.stringify({ ...theme, premiumPack: "rias" })),
    ).toThrow("THEME_IMPORT_INVALID_SCHEMA");

    const themeWithUrl = structuredClone(theme);
    themeWithUrl.config.tokens.primary = "https://example.com/theme.css";
    expect(() => decodePortableTheme(JSON.stringify(themeWithUrl))).toThrow(
      "THEME_IMPORT_INVALID_SCHEMA",
    );
  });

  it("rejects a compressed payload before it can exceed the unpacked limit", () => {
    const compressed = zlibSync(
      strToU8("x".repeat(PORTABLE_THEME_MAX_BYTES + 1)),
    );
    let binary = "";
    for (const byte of compressed) binary += String.fromCharCode(byte);
    const code = `LLT1.${btoa(binary)
      .replace(/\+/gu, "-")
      .replace(/\//gu, "_")
      .replace(/=+$/u, "")}`;

    expect(() => decodePortableTheme(code)).toThrow("THEME_IMPORT_TOO_LARGE");
  });

  it("creates a predictable safe suffix for name collisions", () => {
    expect(getUniqueThemeName("Nocny sygnał", ["nocny sygnał"])).toBe(
      "Nocny sygnał (2)",
    );
  });
});
