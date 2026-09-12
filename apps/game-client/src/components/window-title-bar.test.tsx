import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { WindowTitleBar } from "./window-title-bar";

const renderTitleBar = (
  overrides: Partial<React.ComponentProps<typeof WindowTitleBar>> = {},
) => {
  const props = {
    title: "Timery",
    closable: true,
    opacity: 5 as const,
    isLocked: false,
    onOpacityChange: vi.fn<(opacity: number) => void>(),
    onLockToggle: vi.fn<() => void>(),
    onClose: vi.fn<() => void>(),
    ...overrides,
  };

  render(<WindowTitleBar {...props} />);

  return props;
};

describe("WindowTitleBar", () => {
  it("wraps opacity back to the most transparent level after the last one", async () => {
    const user = userEvent.setup();
    const { onOpacityChange } = renderTitleBar({ opacity: 5 });

    await user.click(
      screen.getByRole("button", { name: "Zmień przezroczystość" }),
    );

    expect(onOpacityChange).toHaveBeenCalledWith(1);
  });

  it("exposes the lock as a pressed toggle and hides close when not closable", async () => {
    const user = userEvent.setup();

    const { onLockToggle } = renderTitleBar({
      isLocked: true,
      closable: false,
    });

    const lock = screen.getByRole("button", { name: "Odblokuj okno" });

    expect(lock).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.queryByRole("button", { name: "Zamknij okno" }),
    ).not.toBeInTheDocument();

    await user.click(lock);

    expect(onLockToggle).toHaveBeenCalledTimes(1);
  });
});
