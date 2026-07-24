import "@/index.css";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { Collapsible, CollapsibleContent } from "./collapsible";
import { Progress } from "./progress";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("Base UI control adapters", () => {
  it("preserves the switch checked contract", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();

    render(<Switch checked onCheckedChange={onCheckedChange} />);

    const switchControl = screen.getByRole("switch");
    expect(switchControl).toHaveAttribute("data-checked");

    await user.click(switchControl);
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it("keeps equal thumb insets in the checked switch", () => {
    render(<Switch checked />);

    const switchControl = screen.getByRole("switch");
    const switchThumb = switchControl.querySelector<HTMLElement>(
      ":scope > [data-checked]",
    );

    expect(switchThumb).not.toBeNull();
    if (!switchThumb) {
      throw new Error("Switch thumb was not rendered");
    }
    expect(getComputedStyle(switchControl).boxSizing).toBe("border-box");
    expect(switchThumb).toHaveClass("ll:data-[checked]:translate-x-4");
  });

  it("marks the selected tab and reports tab changes", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <Tabs value="first" onValueChange={onValueChange}>
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First panel</TabsContent>
        <TabsContent value="second">Second panel</TabsContent>
      </Tabs>,
    );

    expect(screen.getByRole("tab", { name: "First" })).toHaveAttribute(
      "data-active",
    );
    await user.click(screen.getByRole("tab", { name: "Second" }));
    expect(onValueChange).toHaveBeenCalledWith("second", expect.any(Object));
  });

  it("keeps the single-value toggle-group interface", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleGroup type="single" value="row" onValueChange={onValueChange}>
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole("button", { name: "Row" })).toHaveAttribute(
      "data-pressed",
    );
    await user.click(screen.getByRole("button", { name: "Column" }));
    expect(onValueChange).toHaveBeenCalledWith("column");
  });

  it("renders the toggle group as a compact segmented switch", () => {
    const { container } = render(
      <ToggleGroup type="single" value="row">
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
      </ToggleGroup>,
    );

    const toggleGroup = container.querySelector('[data-slot="toggle-group"]');
    expect(toggleGroup).toHaveClass(
      "ll:rounded-sm",
      "ll:border-gray-400",
      "ll:bg-gray-700",
      "ll:before:bg-purple-500/80",
      "ll:before:duration-[120ms]",
      "ll:motion-reduce:before:transition-none",
    );
    expect(screen.getByRole("button", { name: "Row" })).toHaveClass(
      "ll:bg-transparent",
      "ll:data-[pressed]:bg-transparent",
      "ll:data-[pressed]:text-white",
    );
  });

  it("moves one indicator between unequal single-value segments", async () => {
    const segmentGeometry = {
      Row: { left: 2, width: 45 },
      Column: { left: 47, width: 70 },
      Stack: { left: 117, width: 58 },
    };
    const offsetLeft = vi
      .spyOn(HTMLElement.prototype, "offsetLeft", "get")
      .mockImplementation(function getOffsetLeft(this: HTMLElement) {
        return (
          segmentGeometry[this.textContent as keyof typeof segmentGeometry]
            ?.left ?? 0
        );
      });
    const offsetWidth = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockImplementation(function getOffsetWidth(this: HTMLElement) {
        return (
          segmentGeometry[this.textContent as keyof typeof segmentGeometry]
            ?.width ?? 0
        );
      });

    const { container, rerender } = render(
      <ToggleGroup type="single" value="row">
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
        <ToggleGroupItem value="stack">Stack</ToggleGroupItem>
      </ToggleGroup>,
    );
    const toggleGroup = container.querySelector<HTMLElement>(
      '[data-slot="toggle-group"]',
    );

    await waitFor(() => {
      expect(toggleGroup).toHaveAttribute("data-indicator-visible");
      expect(toggleGroup?.style.getPropertyValue("--toggle-indicator-x")).toBe(
        "2px",
      );
      expect(
        toggleGroup?.style.getPropertyValue("--toggle-indicator-width"),
      ).toBe("45px");
    });

    rerender(
      <ToggleGroup type="single" value="stack">
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
        <ToggleGroupItem value="stack">Stack</ToggleGroupItem>
      </ToggleGroup>,
    );

    await waitFor(() => {
      expect(toggleGroup?.style.getPropertyValue("--toggle-indicator-x")).toBe(
        "117px",
      );
      expect(
        toggleGroup?.style.getPropertyValue("--toggle-indicator-width"),
      ).toBe("58px");
    });

    offsetLeft.mockRestore();
    offsetWidth.mockRestore();
  });

  it("keeps independent pressed backgrounds in multiple-value groups", () => {
    const { container } = render(
      <ToggleGroup type="multiple" value={["row", "stack"]}>
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
        <ToggleGroupItem value="stack">Stack</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(
      container.querySelector('[data-slot="toggle-group"]'),
    ).not.toHaveAttribute("data-indicator-visible");
    expect(screen.getByRole("button", { name: "Row" })).toHaveClass(
      "ll:data-[pressed]:bg-purple-500/80",
    );
    expect(screen.getByRole("button", { name: "Stack" })).toHaveAttribute(
      "data-pressed",
    );
  });

  it("remeasures the indicator after an uncontrolled selection change", async () => {
    const user = userEvent.setup();
    const offsetLeft = vi
      .spyOn(HTMLElement.prototype, "offsetLeft", "get")
      .mockImplementation(function getOffsetLeft(this: HTMLElement) {
        return this.textContent === "Column" ? 42 : 2;
      });
    const offsetWidth = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockImplementation(function getOffsetWidth(this: HTMLElement) {
        return this.textContent === "Column" ? 80 : 40;
      });

    const { container } = render(
      <ToggleGroup type="single" defaultValue="row">
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
      </ToggleGroup>,
    );
    const toggleGroup = container.querySelector<HTMLElement>(
      '[data-slot="toggle-group"]',
    );

    await waitFor(() =>
      expect(
        toggleGroup?.style.getPropertyValue("--toggle-indicator-width"),
      ).toBe("40px"),
    );
    await user.click(screen.getByRole("button", { name: "Column" }));

    await waitFor(() => {
      expect(toggleGroup?.style.getPropertyValue("--toggle-indicator-x")).toBe(
        "42px",
      );
      expect(
        toggleGroup?.style.getPropertyValue("--toggle-indicator-width"),
      ).toBe("80px");
    });

    offsetLeft.mockRestore();
    offsetWidth.mockRestore();
  });

  it("preserves a consumer ref while measuring the indicator", () => {
    const toggleGroupRef = createRef<HTMLDivElement>();

    const { container } = render(
      <ToggleGroup type="single" value="row" ref={toggleGroupRef}>
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(toggleGroupRef.current).toBe(
      container.querySelector('[data-slot="toggle-group"]'),
    );
  });

  it("keeps keyboard selection for segmented controls", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleGroup type="single" value="row" onValueChange={onValueChange}>
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
      </ToggleGroup>,
    );

    screen.getByRole("button", { name: "Row" }).focus();
    await user.keyboard("{ArrowRight} ");

    expect(screen.getByRole("button", { name: "Column" })).toHaveFocus();
    expect(onValueChange).toHaveBeenCalledWith("column");
  });

  it("keeps the array-valued slider interface and accessible name", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();

    render(
      <Slider
        aria-label="Volume"
        value={[25]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveValue("25");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyUp(slider, { key: "ArrowRight" });

    expect(onValueChange).toHaveBeenCalledWith([26], expect.any(Object));
    expect(onValueCommit).toHaveBeenCalledWith([26]);
  });

  it("renders the slider in the segmented-switch visual language", () => {
    const { container } = render(
      <Slider aria-label="Volume" defaultValue={[25]} />,
    );

    const sliderRoot = container.querySelector('[data-slot="slider"]');
    const sliderInput = screen.getByRole("slider", { name: "Volume" });
    const sliderThumb = sliderInput.parentElement;
    const sliderTrack = sliderThumb?.parentElement?.firstElementChild;

    expect(sliderRoot).toHaveAttribute("data-interaction", "snap");
    expect(sliderTrack).toHaveClass(
      "ll:h-2",
      "ll:box-border",
      "ll:rounded-sm",
      "ll:border-gray-400",
      "ll:bg-gray-700",
    );
    expect(sliderThumb).toHaveClass(
      "ll:rounded-sm",
      "ll:bg-white",
      "ll:group-data-[interaction=direct]/slider:scale-90",
      "ll:group-data-[interaction=direct]/slider:transition-none",
      "ll:motion-reduce:transition-none",
      "ll:motion-reduce:scale-100",
    );
  });

  it("positions the slider thumb directly inside the control", () => {
    render(<Slider aria-label="Volume" defaultValue={[25]} />);

    const sliderInput = screen.getByRole("slider", { name: "Volume" });
    const sliderThumb = sliderInput.parentElement;
    const sliderControl = sliderThumb?.parentElement;

    expect(sliderThumb).not.toBeNull();
    expect(sliderControl).toHaveClass("ll:touch-none");
    expect(sliderControl?.firstElementChild).not.toBe(sliderThumb);
  });

  it("keeps the array-valued slider interface for pointer changes", () => {
    const onValueChange = vi.fn();
    const onValueCommit = vi.fn();

    const { container } = render(
      <Slider
        aria-label="Volume"
        value={[25]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );

    const sliderInput = screen.getByRole("slider", { name: "Volume" });
    const sliderControl = sliderInput.parentElement?.parentElement;
    const sliderRoot = container.querySelector('[data-slot="slider"]');

    expect(sliderControl).not.toBeNull();
    if (!sliderControl) {
      throw new Error("Slider control was not rendered");
    }

    sliderControl.getBoundingClientRect = () =>
      ({
        bottom: 8,
        height: 8,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect;
    sliderControl.setPointerCapture = vi.fn();
    sliderControl.hasPointerCapture = vi.fn(() => true);
    sliderControl.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(sliderControl, {
      button: 0,
      clientX: 75,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });
    expect(sliderRoot).toHaveAttribute("data-interaction", "snap");

    expect(onValueChange).toHaveBeenCalledWith([75], expect.any(Object));

    fireEvent.pointerMove(document, {
      buttons: 1,
      clientX: 80,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });
    expect(sliderRoot).toHaveAttribute("data-interaction", "direct");
    fireEvent.pointerUp(document, {
      button: 0,
      clientX: 80,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });
    expect(sliderRoot).toHaveAttribute("data-interaction", "snap");

    expect(onValueChange).toHaveBeenLastCalledWith([80], expect.any(Object));
    expect(onValueCommit).toHaveBeenCalledWith([80]);
  });

  it("uses direct motion for thumb drags and resets it on pointer cancel", () => {
    const { container } = render(
      <Slider aria-label="Volume" defaultValue={[25]} />,
    );
    const sliderRoot = container.querySelector('[data-slot="slider"]');
    const sliderThumb = screen.getByRole("slider", {
      name: "Volume",
    }).parentElement;

    fireEvent.pointerDown(sliderThumb as HTMLElement, {
      button: 0,
      clientX: 25,
      pointerId: 2,
      pointerType: "mouse",
    });
    expect(sliderRoot).toHaveAttribute("data-interaction", "direct");

    fireEvent.pointerCancel(document, {
      pointerId: 2,
      pointerType: "mouse",
    });
    expect(sliderRoot).toHaveAttribute("data-interaction", "snap");
  });

  it("reflects controlled collapsible and progress values", () => {
    const { rerender } = render(
      <Collapsible open>
        <CollapsibleContent>Details</CollapsibleContent>
      </Collapsible>,
    );

    expect(screen.getByText("Details")).toBeVisible();

    rerender(
      <Collapsible open={false}>
        <CollapsibleContent>Details</CollapsibleContent>
      </Collapsible>,
    );
    expect(screen.queryByText("Details")).not.toBeInTheDocument();

    rerender(<Progress value={40} aria-label="Loading" />);
    expect(
      screen.getByRole("progressbar", { name: "Loading" }),
    ).toHaveAttribute("aria-valuenow", "40");
  });
});
