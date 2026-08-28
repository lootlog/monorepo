import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "./drawer";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";
import { PortalContainerProvider } from "./portal-container-provider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

describe("Base UI overlays", () => {
  it("renders provider-aware portals inside the scoped container", () => {
    const portalContainer = document.createElement("div");
    document.body.append(portalContainer);

    const { unmount } = render(
      <PortalContainerProvider container={portalContainer}>
        <Dialog defaultOpen>
          <DialogContent>
            <DialogTitle>Scoped dialog</DialogTitle>
          </DialogContent>
        </Dialog>
        <Tooltip defaultOpen>
          <TooltipTrigger>Scoped tooltip trigger</TooltipTrigger>
          <TooltipContent>Scoped tooltip</TooltipContent>
        </Tooltip>
        <Select
          items={[{ label: "Scoped option", value: "option" }]}
          defaultValue="option"
          defaultOpen
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="option">Scoped option</SelectItem>
          </SelectContent>
        </Select>
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Scoped menu trigger</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Scoped menu item</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </PortalContainerProvider>,
    );

    expect(
      portalContainer.querySelector('[data-slot="dialog-content"]'),
    ).toBeInTheDocument();
    expect(
      portalContainer.querySelector('[data-slot="tooltip-content"]'),
    ).toBeInTheDocument();
    expect(
      portalContainer.querySelector('[data-slot="select-content"]'),
    ).toBeInTheDocument();
    expect(
      portalContainer.querySelector('[data-slot="dropdown-menu-content"]'),
    ).toBeInTheDocument();

    unmount();
    portalContainer.remove();
  });

  it("opens a dialog and closes it with Escape", async () => {
    const handleOpenChange = vi.fn();
    render(
      <Dialog onOpenChange={handleOpenChange}>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogTitle>Dialog title</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    expect(screen.getByRole("dialog", { name: "Dialog title" })).toBeVisible();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(Object),
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Open dialog" })).toHaveFocus(),
    );
  });

  it("keeps dialog exit styles applied until Base UI unmounts the portal", () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Animated dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    );

    const overlay = document.querySelector('[data-slot="dialog-overlay"]');
    const popup = screen.getByRole("dialog", { name: "Animated dialog" });

    expect(overlay).toHaveClass(
      "transition-opacity",
      "data-ending-style:opacity-0",
    );
    expect(popup).toHaveClass(
      "transition-[scale,opacity]",
      "data-ending-style:opacity-0",
      "data-ending-style:scale-95",
    );
    expect(overlay).not.toHaveClass("data-closed:animate-out");
    expect(popup).not.toHaveClass("data-closed:animate-out");
  });

  it("opens an alert dialog and closes it with its cancel action", async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open alert</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Alert title</AlertDialogTitle>
          <AlertDialogCancel>Cancel alert</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open alert" }));
    expect(
      screen.getByRole("alertdialog", { name: "Alert title" }),
    ).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Cancel alert" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("closes an alert dialog with its confirm action", async () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open confirmation</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Confirmation title</AlertDialogTitle>
          <AlertDialogAction>Confirm action</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open confirmation" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm action" }));

    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
  });

  it("keeps an alert dialog open when its confirm handler prevents Base UI", () => {
    render(
      <AlertDialog>
        <AlertDialogTrigger>Open persistent confirmation</AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogTitle>Persistent confirmation title</AlertDialogTitle>
          <AlertDialogAction onClick={(event) => event.preventBaseUIHandler()}>
            Keep open
          </AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Open persistent confirmation" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep open" }));

    expect(
      screen.getByRole("alertdialog", {
        name: "Persistent confirmation title",
      }),
    ).toBeVisible();
  });

  it("opens a sheet and closes it with Escape", () => {
    const handleOpenChange = vi.fn();
    render(
      <Sheet onOpenChange={handleOpenChange}>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Sheet title</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open sheet" }));
    expect(screen.getByRole("dialog", { name: "Sheet title" })).toBeVisible();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(handleOpenChange).toHaveBeenLastCalledWith(
      false,
      expect.any(Object),
    );
  });

  it("opens a popover and closes it on outside press", async () => {
    render(
      <Popover>
        <PopoverTrigger>Open popover</PopoverTrigger>
        <PopoverContent>Popover content</PopoverContent>
      </Popover>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open popover" }));

    expect(screen.getByText("Popover content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Open popover" }),
    ).toHaveAttribute("aria-expanded", "true");

    fireEvent.pointerDown(document.body);
    fireEvent.click(document.body);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Open popover" }),
      ).toHaveAttribute("aria-expanded", "false"),
    );
  });

  it("shows a tooltip on focus", () => {
    render(
      <Tooltip>
        <TooltipTrigger>Tooltip trigger</TooltipTrigger>
        <TooltipContent>Tooltip content</TooltipContent>
      </Tooltip>,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Tooltip trigger" }));

    expect(screen.getByText("Tooltip content")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tooltip trigger" }),
    ).toHaveAttribute("data-popup-open");
  });

  it("opens a drawer", () => {
    render(
      <Drawer>
        <DrawerTrigger>Open drawer</DrawerTrigger>
        <DrawerContent>
          <DrawerTitle>Drawer title</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open drawer" }));

    expect(screen.getByRole("dialog", { name: "Drawer title" })).toBeVisible();
  });

  it("configures a drawer for a downward swipe", async () => {
    render(
      <Drawer defaultOpen swipeDirection="down">
        <DrawerContent>
          <DrawerTitle>Swipe drawer</DrawerTitle>
        </DrawerContent>
      </Drawer>,
    );

    const drawer = screen.getByRole("dialog", { name: "Swipe drawer" });
    await waitFor(() => expect(drawer).toHaveAttribute("data-open"));
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => resolve()),
    );
    const viewport = drawer.parentElement;
    expect(viewport).toHaveAttribute("data-slot", "drawer-viewport");
    expect(drawer).toHaveAttribute("data-swipe-direction", "down");
  });
});
