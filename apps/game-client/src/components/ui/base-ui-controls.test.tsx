import "@/index.css";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { Collapsible, CollapsibleContent } from "./collapsible";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

describe("Base UI control adapters", () => {
  it("preserves the switch checked contract", async () => {
    const user = userEvent.setup();

    const onCheckedChange =
      vi.fn<NonNullable<ComponentProps<typeof Switch>["onCheckedChange"]>>();

    render(<Switch checked onCheckedChange={onCheckedChange} />);

    const switchControl = screen.getByRole("switch");
    expect(switchControl).toHaveAttribute("data-checked");

    await user.click(switchControl);
    expect(onCheckedChange).toHaveBeenCalledWith(false, expect.any(Object));
  });

  it("marks the selected tab and reports tab changes", async () => {
    const user = userEvent.setup();

    const onValueChange =
      vi.fn<NonNullable<ComponentProps<typeof Tabs>["onValueChange"]>>();

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

  it("keeps the toggle-group value contract", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <ToggleGroup value={["row"]} onValueChange={onValueChange}>
        <ToggleGroupItem value="row">Row</ToggleGroupItem>
        <ToggleGroupItem value="column">Column</ToggleGroupItem>
      </ToggleGroup>,
    );

    expect(screen.getByRole("button", { name: "Row" })).toHaveAttribute(
      "data-pressed",
    );

    await user.click(screen.getByRole("button", { name: "Column" }));
    expect(onValueChange).toHaveBeenCalledWith(["column"], expect.any(Object));
  });

  it("keeps the array-valued slider interface and accessible name", () => {
    const onValueChange =
      vi.fn<NonNullable<ComponentProps<typeof Slider>["onValueChange"]>>();

    const onValueCommit =
      vi.fn<NonNullable<ComponentProps<typeof Slider>["onValueCommit"]>>();

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

  it("starts the slider in snap interaction mode", () => {
    const { container } = render(
      <Slider aria-label="Volume" defaultValue={[25]} />,
    );

    const sliderRoot = container.querySelector('[data-slot="slider"]');

    expect(sliderRoot).toHaveAttribute("data-interaction", "snap");
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
    const onValueChange =
      vi.fn<NonNullable<ComponentProps<typeof Slider>["onValueChange"]>>();

    const onValueCommit =
      vi.fn<NonNullable<ComponentProps<typeof Slider>["onValueCommit"]>>();

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

    sliderControl.getBoundingClientRect = () => ({
      bottom: 8,
      height: 8,
      left: 0,
      right: 100,
      top: 0,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });
    sliderControl.setPointerCapture = vi.fn<HTMLElement["setPointerCapture"]>();
    sliderControl.hasPointerCapture = vi.fn<() => boolean>(() => true);
    sliderControl.releasePointerCapture =
      vi.fn<HTMLElement["releasePointerCapture"]>();

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

    if (!sliderThumb) throw new Error("Slider thumb was not rendered");
    fireEvent.pointerDown(sliderThumb, {
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

  it("reflects controlled collapsible values", () => {
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
  });
});
