import "@/index.css";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Input } from "./input";

const renderInsideLootlogRoot = (element: ReactElement) => {
  const lootlogRoot = document.createElement("div");
  lootlogRoot.id = "lootlog-root";
  lootlogRoot.className = "dark-theme";
  document.body.append(lootlogRoot);

  return render(element, { container: lootlogRoot });
};

const expectContentInsideThemeBoundary = (testId: string) => {
  const content = screen.getByTestId(testId);

  expect(content.closest("#lootlog-root.dark-theme")).not.toBeNull();
};

const expectSmallRadius = (testId: string) => {
  expect(["4px", "calc(8px - 4px)"]).toContain(
    getComputedStyle(screen.getByTestId(testId)).borderRadius,
  );
};

describe("overlay theme boundary", () => {
  afterEach(() => {
    document.getElementById("lootlog-root")?.remove();
  });

  it("keeps tooltip content inside the Lootlog theme boundary", () => {
    renderInsideLootlogRoot(
      <Tooltip open>
        <TooltipTrigger>Tooltip trigger</TooltipTrigger>
        <TooltipContent data-testid="tooltip-content">Tooltip</TooltipContent>
      </Tooltip>,
    );

    expectContentInsideThemeBoundary("tooltip-content");
    expectSmallRadius("tooltip-content");
  });

  it("keeps context-menu content inside the Lootlog theme boundary", () => {
    renderInsideLootlogRoot(
      <ContextMenu>
        <ContextMenuTrigger>Context menu trigger</ContextMenuTrigger>
        <ContextMenuContent data-testid="context-menu-content">
          <ContextMenuItem>Context menu item</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );
    fireEvent.contextMenu(screen.getByText("Context menu trigger"), {
      clientX: 10,
      clientY: 10,
    });

    expectContentInsideThemeBoundary("context-menu-content");
    expect(["6px", "calc(8px - 2px)"]).toContain(
      getComputedStyle(screen.getByTestId("context-menu-content")).borderRadius,
    );
  });

  it("keeps popover content inside the Lootlog theme boundary", () => {
    renderInsideLootlogRoot(
      <Popover open>
        <PopoverTrigger>Popover trigger</PopoverTrigger>
        <PopoverContent data-testid="popover-content">
          <Input aria-label="Popover input" />
        </PopoverContent>
      </Popover>,
    );

    expectContentInsideThemeBoundary("popover-content");
    expectSmallRadius("popover-content");
    const input = screen.getByRole("textbox", { name: "Popover input" });
    fireEvent.focus(input);
    expect(input).toHaveClass(
      "ll:focus-visible:ring-ring/50",
      "ll:focus-visible:ring-[3px]",
    );
  });

  it("keeps select content inside the Lootlog theme boundary", () => {
    renderInsideLootlogRoot(
      <Select open value="one">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-testid="select-content">
          <SelectItem value="one">One</SelectItem>
        </SelectContent>
      </Select>,
    );

    expectContentInsideThemeBoundary("select-content");
    expectSmallRadius("select-content");
  });
});
