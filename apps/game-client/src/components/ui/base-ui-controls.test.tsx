import "@/index.css";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    render(
      <Slider
        aria-label="Volume"
        value={[25]}
        onValueChange={onValueChange}
        onValueCommit={onValueCommit}
      />,
    );

    const sliderInput = screen.getByRole("slider", { name: "Volume" });
    const sliderControl = sliderInput.parentElement?.parentElement;

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

    expect(onValueChange).toHaveBeenCalledWith([75], expect.any(Object));

    fireEvent.pointerMove(document, {
      buttons: 1,
      clientX: 80,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });
    fireEvent.pointerUp(document, {
      button: 0,
      clientX: 80,
      clientY: 4,
      pointerId: 1,
      pointerType: "mouse",
    });

    expect(onValueChange).toHaveBeenLastCalledWith([80], expect.any(Object));
    expect(onValueCommit).toHaveBeenCalledWith([80]);
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
