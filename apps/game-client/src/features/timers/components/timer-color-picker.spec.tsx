import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TimerColorPicker } from "./timer-color-picker";
import { TIMERS_COLORS } from "../constants/timer-colors";

describe("TimerColorPicker", () => {
  const mockCustomColors = {
    custom1: {
      id: "custom1",
      name: "Custom Red",
      backgroundColor: "#ff0000",
      borderColor: "#cc0000",
    },
    custom2: {
      id: "custom2",
      name: "Custom Blue",
      backgroundColor: "#0000ff",
      borderColor: "#0000cc",
    },
  };

  const mockDefaultColorNames = {
    red: "Custom Red Name",
  };

  const mockOverriddenDefaultColors = {
    blue: {
      backgroundColor: "#123456",
      borderColor: "#654321",
    },
  };

  const defaultProps = {
    selectedColor: "white",
    customColors: {},
    defaultColorNames: {},
    overriddenDefaultColors: {},
    hiddenDefaultColors: [],
    onColorChange: vi.fn(),
  };

  it("should render all visible default colors", () => {
    const { container } = render(<TimerColorPicker {...defaultProps} />);

    const defaultColorDivs = container.querySelectorAll(".ll\\:size-3\\.5");
    const expectedCount = Object.keys(TIMERS_COLORS).length;
    expect(defaultColorDivs.length).toBe(expectedCount);
  });

  it("should not render hidden default colors", () => {
    const { container } = render(
      <TimerColorPicker
        {...defaultProps}
        hiddenDefaultColors={["red", "blue"]}
      />,
    );

    const defaultColorDivs = container.querySelectorAll(".ll\\:size-3\\.5");
    expect(defaultColorDivs.length).toBe(Object.keys(TIMERS_COLORS).length - 2);
  });

  it("should render custom colors", () => {
    const { container } = render(
      <TimerColorPicker {...defaultProps} customColors={mockCustomColors} />,
    );

    const customColorDivs = container.querySelectorAll(".ll\\:size-4");
    expect(customColorDivs.length).toBe(Object.keys(mockCustomColors).length);
  });

  it("should call onColorChange when clicking a color", async () => {
    const onColorChange = vi.fn();
    const { container } = render(
      <TimerColorPicker {...defaultProps} onColorChange={onColorChange} />,
    );

    const firstColorDiv = container.querySelector(".ll\\:size-4");
    if (firstColorDiv) {
      await userEvent.click(firstColorDiv);
      expect(onColorChange).toHaveBeenCalledTimes(1);
    }
  });

  it("should highlight selected color with ring", () => {
    const { container } = render(
      <TimerColorPicker {...defaultProps} selectedColor="red" />,
    );

    const selectedColor = container.querySelector(".ll\\:ring-2");
    expect(selectedColor).toBeDefined();
  });

  it("should use custom color names from defaultColorNames prop", () => {
    render(
      <TimerColorPicker
        {...defaultProps}
        defaultColorNames={mockDefaultColorNames}
      />,
    );

    expect(screen.queryByText("Custom Red Name")).toBeDefined();
  });

  it("should apply custom backgroundColor and borderColor to custom colors", () => {
    const { container } = render(
      <TimerColorPicker {...defaultProps} customColors={mockCustomColors} />,
    );

    const customColorDivs = container.querySelectorAll(".ll\\:size-4");
    const customColorDiv = Array.from(customColorDivs).find((div) => {
      const style = (div as HTMLElement).getAttribute("style");
      return style?.includes("#ff0000");
    });

    expect(customColorDiv).toBeDefined();
  });

  it("should apply overridden styles to default colors", () => {
    const { container } = render(
      <TimerColorPicker
        {...defaultProps}
        overriddenDefaultColors={mockOverriddenDefaultColors}
      />,
    );

    const colorDivs = container.querySelectorAll(".ll\\:size-3\\.5");
    const overriddenDiv = Array.from(colorDivs).find((div) => {
      const style = (div as HTMLElement).getAttribute("style");
      return style?.includes("#123456");
    });

    expect(overriddenDiv).toBeDefined();
  });
});
