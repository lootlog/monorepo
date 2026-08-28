// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRESET_THEME_CONFIGS } from "@/themes/preset-configs";
import { ThemeBuilderPreview } from "./theme-builder-preview";

afterEach(cleanup);

describe("ThemeBuilderPreview", () => {
  it("applies a draft only inside the preview surface", () => {
    const rootPrimary =
      document.documentElement.style.getPropertyValue("--primary");
    const { container, rerender } = render(
      <ThemeBuilderPreview
        config={PRESET_THEME_CONFIGS.cyberpunk}
        focused={false}
        label="Preview"
        onFocusedChange={() => undefined}
      />,
    );
    const preview = container.querySelector<HTMLElement>(".theme-preview");

    expect(preview?.hasAttribute("inert")).toBe(false);
    expect(preview?.style.getPropertyValue("--primary")).toBe(
      PRESET_THEME_CONFIGS.cyberpunk.tokens.primary,
    );
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      rootPrimary,
    );

    rerender(
      <ThemeBuilderPreview
        config={PRESET_THEME_CONFIGS.pastel}
        focused={false}
        label="Preview"
        onFocusedChange={() => undefined}
      />,
    );

    expect(preview?.style.getPropertyValue("--primary")).toBe(
      PRESET_THEME_CONFIGS.pastel.tokens.primary,
    );
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      rootPrimary,
    );
  });

  it("keeps interactive overlay portals inside the themed canvas", () => {
    const { container } = render(
      <ThemeBuilderPreview
        config={PRESET_THEME_CONFIGS.default}
        focused={false}
        label="Preview"
        onFocusedChange={() => undefined}
      />,
    );
    const preview = container.querySelector<HTMLElement>(".theme-preview");

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.appearance.preview.scenarios.states",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.appearance.preview.states.dialog",
      }),
    );

    expect(
      preview?.querySelector('[data-slot="dialog-content"]'),
    ).not.toBeNull();
    expect(document.body.querySelector('[data-slot="dialog-content"]')).toBe(
      preview?.querySelector('[data-slot="dialog-content"]'),
    );
  });

  it("switches between product contexts and exposes focus mode", () => {
    const onFocusedChange = vi.fn();
    const { container } = render(
      <ThemeBuilderPreview
        config={PRESET_THEME_CONFIGS.default}
        focused={false}
        label="Preview"
        onFocusedChange={onFocusedChange}
      />,
    );

    expect(
      container.querySelector('[data-slot="preview-world-rail"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-slot="preview-page-header"]'),
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.appearance.preview.scenarios.loots",
      }),
    );

    const activeNavigation = container.querySelector('[aria-current="page"]');
    expect(activeNavigation?.textContent).toContain(
      "layout.navigation.lootlog",
    );
    expect(
      container.querySelector('[data-slot="preview-loot-card"]'),
    ).not.toBeNull();

    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.appearance.preview.focusPreview",
      }),
    );
    expect(onFocusedChange).toHaveBeenCalledWith(true);
  });
});
