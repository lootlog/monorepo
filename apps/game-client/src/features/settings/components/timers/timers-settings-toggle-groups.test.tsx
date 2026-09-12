import { render as renderUi } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { ReactElement } from "react";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { TimersSettingsAppearance } from "./timers-settings-appearance";
import { TimersSettingsGeneral } from "./timers-settings-general";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = (element: ReactElement) =>
  renderUi(element, { wrapper: harness.wrapper });

describe("timer settings segmented controls", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
  });

  it("aligns the countdown mode control to the right edge", () => {
    const { container } = render(<TimersSettingsGeneral />);

    expect(container.querySelector('[data-slot="toggle-group"]')).toHaveClass(
      "ll:ml-auto",
    );
  });

  it("aligns the single-timer layout control to the right edge", () => {
    const { container } = render(<TimersSettingsAppearance />);

    expect(container.querySelector('[data-slot="toggle-group"]')).toHaveClass(
      "ll:ml-auto",
    );
  });
});
