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

  it("renders one thumb per value and forwards keyboard changes", () => {
    const onValueChange =
      vi.fn<NonNullable<ComponentProps<typeof Slider>["onValueChange"]>>();

    const onValueCommitted =
      vi.fn<NonNullable<ComponentProps<typeof Slider>["onValueCommitted"]>>();

    const { rerender } = render(
      <Slider
        aria-label="Volume"
        value={25}
        onValueChange={onValueChange}
        onValueCommitted={onValueCommitted}
      />,
    );

    const slider = screen.getByRole("slider", { name: "Volume" });
    expect(slider).toHaveValue("25");

    fireEvent.keyDown(slider, { key: "ArrowRight" });
    fireEvent.keyUp(slider, { key: "ArrowRight" });

    expect(onValueChange).toHaveBeenCalledWith(26, expect.any(Object));
    expect(onValueCommitted).toHaveBeenCalledWith(26, expect.any(Object));

    rerender(<Slider aria-label="Range" value={[10, 40]} />);
    expect(screen.getAllByRole("slider")).toHaveLength(2);
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
