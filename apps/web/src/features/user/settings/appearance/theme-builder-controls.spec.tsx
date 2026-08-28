// @vitest-environment happy-dom

import { cleanup, fireEvent, render, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRESET_THEME_CONFIGS } from "@/themes/preset-configs";
import { ThemeBuilderControls } from "./theme-builder-controls";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(cleanup);

const renderControls = () => {
  const config = structuredClone(PRESET_THEME_CONFIGS.default);
  const onConfigChange = vi.fn();
  const onGeneratePalette = vi.fn();

  const view = render(
    <ThemeBuilderControls
      name="Test"
      config={config}
      lockedAxes={new Set()}
      onNameChange={vi.fn()}
      onConfigChange={onConfigChange}
      onGeneratePalette={onGeneratePalette}
      onResetGroup={vi.fn()}
      onToggleLock={vi.fn()}
    />,
  );

  return { ...view, config, onConfigChange, onGeneratePalette };
};

describe("ThemeBuilderControls", () => {
  it("changes only the selected color token", () => {
    const { config, getByLabelText, onConfigChange } = renderControls();

    fireEvent.change(
      getByLabelText("settings.appearance.options.tokens.primary"),
      { target: { value: "#123456" } },
    );

    expect(onConfigChange).toHaveBeenCalledWith({
      ...config,
      tokens: { ...config.tokens, primary: "#123456" },
    });
    const nextConfig = onConfigChange.mock.calls[0]?.[0];
    expect(nextConfig.tokens.accent).toBe(config.tokens.accent);
    expect(nextConfig.tokens.background).toBe(config.tokens.background);
    expect(nextConfig.tokens.primaryHover).toBe(config.tokens.primaryHover);
  });

  it("generates the palette only after the explicit action", () => {
    const { getByRole, onGeneratePalette } = renderControls();

    expect(onGeneratePalette).not.toHaveBeenCalled();
    fireEvent.click(
      getByRole("button", {
        name: "settings.appearance.builder.generatePalette",
      }),
    );

    expect(onGeneratePalette).toHaveBeenCalledOnce();
  });

  it("marks the recipe as custom after a component override", () => {
    const { config, getByRole, onConfigChange } = renderControls();
    const buttonGroup = getByRole("group", {
      name: "settings.appearance.options.components.button.label",
    });
    const minimalButton = within(buttonGroup).getByRole("button", {
      name: "settings.appearance.options.components.button.minimal",
    });

    fireEvent.click(minimalButton);

    expect(onConfigChange).toHaveBeenCalledWith({
      ...config,
      recipe: "custom",
      components: { ...config.components, button: "minimal" },
    });
  });
});
