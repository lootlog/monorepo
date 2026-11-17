import userEvent from "@testing-library/user-event";
import { useTimersStore } from "@/store/timers.store";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { TimersSettingsAppearance } from "./timers-settings-appearance";

describe("timer settings controls", () => {
  beforeEach(() => {
    useTimersStore.setState(useTimersStore.getInitialState(), true);
  });

  it("toggles legacy appearance with the keyboard and preserves the remaining display preferences", async () => {
    const user = userEvent.setup();
    const original = useTimersStore.getState().displayConfig;
    render(<TimersSettingsAppearance />);
    const toggle = screen.getByRole("switch", { name: "Poprzedni wygląd" });
    expect(toggle).not.toBeChecked();
    toggle.focus();
    await user.keyboard(" ");
    expect(useTimersStore.getState().displayConfig).toEqual({
      ...original,
      legacyAppearance: true,
    });
    expect(toggle).toBeChecked();
    await user.keyboard(" ");
    expect(useTimersStore.getState().displayConfig).toEqual(original);
    expect(toggle).not.toBeChecked();
  });
});
