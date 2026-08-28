// @vitest-environment happy-dom

import { ThemeConfigV1Schema, normalizeThemeConfigV1 } from "@lootlog/types";
import { describe, expect, it } from "vitest";
import { PRESET_THEME_CONFIGS } from "./preset-configs";
import {
  applyThemeConfig,
  clearThemeConfig,
  parseThemeSnapshot,
  serializeThemeSnapshot,
  THEME_DERIVED_PROPERTIES,
  THEME_TOKEN_PROPERTIES,
} from "./runtime";
import runtimeCss from "./runtime.css?raw";
import { getThemeContrastIssues } from "./theme-colors";

describe("theme runtime", () => {
  it("normalizes only the current internal v1 draft into the final v1 shape", () => {
    const currentDraft = {
      version: 1,
      tokens: {
        background: "#07111f",
        foreground: "#f7f8f2",
        card: "#091428",
        cardForeground: "#f7f8f2",
        popover: "#0a162e",
        popoverForeground: "#f7f8f2",
        primary: "#3157f6",
        primaryForeground: "#f7f8f2",
        secondary: "#0c1937",
        secondaryForeground: "#f7f8f2",
        muted: "#222a37",
        mutedForeground: "#afb3ba",
        accent: "#35d3e4",
        accentForeground: "#07111f",
        destructive: "#ff665b",
        destructiveForeground: "#07111f",
        border: "#35404a",
        input: "#45505b",
        ring: "#35d3e4",
        sidebar: "#06101c",
        sidebarForeground: "#f7f8f2",
        sidebarPrimary: "#3157f6",
        sidebarPrimaryForeground: "#f7f8f2",
        sidebarAccent: "#0c1937",
        sidebarAccentForeground: "#f7f8f2",
        sidebarBorder: "#2e3945",
        sidebarRing: "#35d3e4",
        signalLive: "#35d3e4",
        signalReady: "#c8f135",
        signalTimer: "#ffbd3f",
        signalAlert: "#ff665b",
      },
      recipe: "signal",
      radius: "default",
      density: "standard",
      surface: "flat",
      typography: { heading: "geist", body: "geist" },
      navigation: { surface: "solid", active: "filled" },
      charts: ["#3157f6", "#35d3e4", "#c8f135", "#ffbd3f", "#ff665b"],
      motion: "standard",
    };

    expect(ThemeConfigV1Schema.safeParse(currentDraft).success).toBe(false);

    const normalized = normalizeThemeConfigV1(currentDraft);
    expect(normalized).not.toBeNull();
    expect(ThemeConfigV1Schema.parse(normalized)).toMatchObject({
      recipe: "signal",
      components: {
        button: "solid",
        card: "outline",
        input: "outline",
        badge: "solid",
        table: "separated",
      },
      border: "subtle",
      chartStyle: { grid: "subtle", stroke: "default", fill: "soft" },
      typography: {
        heading: "geist",
        body: "geist",
        headingWeight: "semibold",
        bodyWeight: "regular",
        tracking: "normal",
      },
    });
    expect(normalized?.tokens.primaryHover).toBe(currentDraft.tokens.primary);
    expect(normalizeThemeConfigV1({ ...currentDraft, version: 2 })).toBeNull();
    expect(
      normalizeThemeConfigV1({ ...currentDraft, css: "body{}" }),
    ).toBeNull();
  });

  it("applies and cleans semantic variables and component axes", () => {
    const element = document.createElement("div");
    applyThemeConfig(element, PRESET_THEME_CONFIGS.default);

    expect(element.style.getPropertyValue("--primary")).toBe("#3157f6");
    expect(element.dataset.themeRecipe).toBe("signal");
    expect(element.dataset.themeDensity).toBe("standard");
    expect(element.dataset.themeButton).toBe("solid");
    expect(element.dataset.themeCard).toBe("outline");
    expect(element.dataset.themeChartGrid).toBe("subtle");
    expect(element.style.getPropertyValue("--theme-button-hover")).toBe(
      "var(--primary-hover)",
    );
    expect(element.style.getPropertyValue("--theme-card-background")).toBe(
      "var(--card)",
    );
    expect(Object.keys(THEME_TOKEN_PROPERTIES).sort()).toEqual(
      Object.keys(PRESET_THEME_CONFIGS.default.tokens).sort(),
    );
    for (const [token, property] of Object.entries(THEME_TOKEN_PROPERTIES)) {
      expect(element.style.getPropertyValue(property)).toBe(
        PRESET_THEME_CONFIGS.default.tokens[
          token as keyof typeof PRESET_THEME_CONFIGS.default.tokens
        ],
      );
    }

    clearThemeConfig(element);
    expect(element.style.getPropertyValue("--primary")).toBe("");
    for (const property of THEME_DERIVED_PROPERTIES) {
      expect(element.style.getPropertyValue(property)).toBe("");
    }
    expect(element.dataset.themeRecipe).toBeUndefined();
  });

  it("keeps nested theme scopes independent from ancestor component recipes", () => {
    const ancestor = document.createElement("div");
    const nested = document.createElement("div");
    const softAncestor = {
      ...PRESET_THEME_CONFIGS.default,
      components: {
        ...PRESET_THEME_CONFIGS.default.components,
        button: "soft" as const,
        card: "soft" as const,
      },
    };
    ancestor.append(nested);

    applyThemeConfig(ancestor, softAncestor);
    applyThemeConfig(nested, PRESET_THEME_CONFIGS.default);

    expect(ancestor.style.getPropertyValue("--theme-button-hover")).toBe(
      "var(--secondary-hover)",
    );
    expect(nested.style.getPropertyValue("--theme-button-hover")).toBe(
      "var(--primary-hover)",
    );
    expect(nested.style.getPropertyValue("--theme-card-background")).toBe(
      "var(--card)",
    );

    expect(runtimeCss).not.toMatch(
      /\[data-theme-(?:badge|border|button|card|input|surface|table)=[^\]]+\]/,
    );
  });

  it("round-trips a valid bootstrap snapshot and rejects corruption", () => {
    const serialized = serializeThemeSnapshot({
      version: 1,
      presetId: "default",
      config: PRESET_THEME_CONFIGS.default,
    });
    expect(parseThemeSnapshot(serialized)?.config).toEqual(
      PRESET_THEME_CONFIGS.default,
    );
    expect(parseThemeSnapshot("not-json")).toBeNull();
  });

  it("ships presets with accessible text and focus pairs", () => {
    for (const config of Object.values(PRESET_THEME_CONFIGS)) {
      expect(getThemeContrastIssues(config)).toEqual([]);
    }
  });
});
