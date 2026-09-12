import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsNumberField } from "./settings-number-field";

describe("SettingsNumberField", () => {
  it("commits the clamped value on blur and ignores half-typed input", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn<(value: number) => void>();

    render(
      <SettingsNumberField
        aria-label="Sekundy"
        value={30}
        min={0}
        max={120}
        unit="s"
        onCommit={onCommit}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Sekundy" });

    await user.clear(input);
    await user.type(input, "500");
    expect(onCommit).not.toHaveBeenCalled();

    await user.tab();
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith(120);
  });

  it("does not commit when the value is unchanged and restores the draft on Escape", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn<(value: number) => void>();

    render(
      <SettingsNumberField
        aria-label="Sekundy"
        value={30}
        min={0}
        max={120}
        onCommit={onCommit}
      />,
    );

    const input = screen.getByRole("spinbutton", { name: "Sekundy" });

    await user.clear(input);
    await user.type(input, "99{Escape}");
    expect(input).toHaveValue(30);

    await user.click(input);
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });
});
