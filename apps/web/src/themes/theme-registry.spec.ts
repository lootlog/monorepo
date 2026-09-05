// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  CAT_THEME_VARIANTS,
  DEFAULT_THEME_ID,
  THEME_CATALOG,
  THEME_CLASS_IDS,
  THEME_IDS,
} from "./catalog";
import {
  applyThemeClassToRoot,
  getThemeFamily,
  getRootResolvedTheme,
  isCatTheme,
  isRukiaTheme,
  resolveThemeClass,
} from "./resolver";

describe("theme registry", () => {
  it("covers every supported theme in the catalog", () => {
    expect(THEME_CATALOG.map((theme) => theme.name)).toEqual(THEME_IDS);
  });

  it("classifies cat themes and rukia correctly", () => {
    expect(getThemeFamily("default")).toBe("standard");
    expect(getThemeFamily("rukia")).toBe("rukia");
    expect(getThemeFamily("cat-random")).toBe("cat");
    expect(getThemeFamily("cat-blue")).toBe("cat");
    expect(isCatTheme("cat-random")).toBe(true);
    expect(isCatTheme("cat-purple")).toBe(true);
    expect(isRukiaTheme("rukia")).toBe(true);
    expect(isRukiaTheme("default")).toBe(false);
  });

  it("keeps the existing cat variant when resolving cat-random", () => {
    expect(resolveThemeClass("cat-random", "cat-blue")).toBe("cat-blue");
  });

  it("returns a concrete cat variant for cat-random without an existing variant", () => {
    expect(CAT_THEME_VARIANTS).toContain(resolveThemeClass("cat-random"));
  });

  it("passes non-random themes through unchanged", () => {
    expect(resolveThemeClass("rukia")).toBe("rukia");
    expect(resolveThemeClass(DEFAULT_THEME_ID)).toBe(DEFAULT_THEME_ID);
  });

  it.each(THEME_CLASS_IDS)(
    "switches default → %s → default without leaking theme classes",
    (theme) => {
      const root = document.createElement("html");
      root.classList.add("light", "theme-ready");
      const defaultTheme = resolveThemeClass(DEFAULT_THEME_ID);

      for (const resolvedTheme of [defaultTheme, theme, defaultTheme]) {
        applyThemeClassToRoot({ root, resolvedTheme });

        expect(root.classList.contains("dark")).toBe(true);
        expect(root.classList.contains("light")).toBe(false);
        expect(root.classList.contains("theme-ready")).toBe(true);
        expect(root.style.colorScheme).toBe("dark");
        expect(getRootResolvedTheme(root)).toBe(resolvedTheme);
        expect(
          THEME_CLASS_IDS.filter((id) => root.classList.contains(id)),
        ).toEqual([resolvedTheme]);
      }
    },
  );
});
