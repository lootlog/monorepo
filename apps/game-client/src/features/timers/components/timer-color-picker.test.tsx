import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TimerColorPicker } from "./timer-color-picker";

describe("TimerColorPicker", () => {
  it("selects visible default and custom colors using pointer and keyboard", async () => {
    const user = userEvent.setup();
    const onColorChange = vi.fn<(color: string) => void>();
    render(
      <TimerColorPicker
        selectedColor="custom-1"
        customColors={{
          "custom-1": {
            id: "custom-1",
            name: "Custom One",
            backgroundColor: "#aabbcc",
            borderColor: "#ddeeff",
          },
        }}
        defaultColorNames={{ red: "Czerwony" }}
        overriddenDefaultColors={{
          red: { backgroundColor: "#111111", borderColor: "#222222" },
        }}
        hiddenDefaultColors={["blue"]}
        onColorChange={onColorChange}
      />,
    );
    const red = screen.getByRole("button", { name: "Czerwony" });
    const custom = screen.getByRole("button", { name: "Custom One" });
    expect(
      screen.queryByRole("button", { name: "Granatowy" }),
    ).not.toBeInTheDocument();
    expect(red).toHaveStyle({
      backgroundColor: "#111111",
      borderColor: "#222222",
    });
    expect(custom).toHaveAttribute("aria-pressed", "true");
    await user.hover(red);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Czerwony");
    await user.click(red);
    custom.focus();
    await user.keyboard("{Enter}");
    expect(onColorChange.mock.calls).toEqual([["red"], ["custom-1"]]);
  });
});
