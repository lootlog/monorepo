import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "./drawer";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./sheet";

describe("Base UI overlays", () => {
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
