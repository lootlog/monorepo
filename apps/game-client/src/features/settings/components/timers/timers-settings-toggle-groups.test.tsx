import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TimersSettingsAppearance } from "./timers-settings-appearance";
import { TimersSettingsGeneral } from "./timers-settings-general";

describe("timer settings segmented controls", () => {
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
