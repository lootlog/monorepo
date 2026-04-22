import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { TimerColorPicker } from "./timer-color-picker";

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipTrigger: ({ children }: { children: ReactNode }) => <>{children}</>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <span>{children}</span>
  ),
}));

describe("TimerColorPicker", () => {
  it("renders visible default and custom colors and forwards clicks", () => {
    const onColorChange = vi.fn();

    const { container } = render(
      <TimerColorPicker
        selectedColor="custom-1"
        customColors={{
          "custom-1": {
            id: "custom-1",
            name: "Custom One",
            backgroundColor: "#abc",
            borderColor: "#def",
          },
        }}
        defaultColorNames={{
          red: "Czerwony",
        }}
        overriddenDefaultColors={{
          red: {
            backgroundColor: "#111",
            borderColor: "#222",
          },
        }}
        hiddenDefaultColors={["blue"]}
        onColorChange={onColorChange}
      />,
    );

    expect(screen.getByText("Czerwony")).toBeVisible();
    expect(screen.queryByText("Granatowy")).not.toBeInTheDocument();
    expect(screen.getByText("Custom One")).toBeVisible();

    const colorButtons = container.querySelectorAll(
      "[class*='ll-custom-cursor-pointer']",
    );
    expect(colorButtons.length).toBeGreaterThan(2);

    fireEvent.click(colorButtons[0]!);
    fireEvent.click(colorButtons[colorButtons.length - 1]!);

    expect(onColorChange).toHaveBeenCalledWith("red");
    expect(onColorChange).toHaveBeenCalledWith("custom-1");
  });
});
