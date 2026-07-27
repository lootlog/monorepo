import { describe, expect, it } from "vitest";
import {
  CAT_THEME_VARIANTS,
  DEFAULT_THEME_ID,
  THEME_CATALOG,
  THEME_IDS,
} from "./catalog";
import {
  applyThemeClassToRoot,
  getThemeFamily,
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

  it("always applies the permanent dark theme invariant", () => {
    const classes = new Set(["light", "cyberpunk"]);
    const root = {
      classList: {
        add: (...classNames: string[]) => {
          for (const className of classNames) classes.add(className);
        },
        contains: (className: string) => classes.has(className),
        remove: (...classNames: string[]) => {
          for (const className of classNames) classes.delete(className);
        },
      },
      style: {},
    } as unknown as HTMLElement;

    applyThemeClassToRoot({
      root,
      resolvedTheme: "default",
    });

    expect(classes.has("dark")).toBe(true);
    expect(classes.has("light")).toBe(false);
    expect(classes.has("cyberpunk")).toBe(false);
  });
});
