import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, onTestFinished, vi } from "vitest";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "./context-menu";
import { Button } from "./button";

it("keeps native button semantics for a menu item rendered as a Button", async () => {
  const onClick = vi.fn();

  const consoleError = vi
    .spyOn(console, "error")
    .mockImplementation(() => undefined);

  onTestFinished(() => consoleError.mockRestore());

  const user = userEvent.setup();

  render(
    <ContextMenu>
      <ContextMenuTrigger>Item</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem render=<Button variant="ghost" /> onClick={onClick}>
          Copy id
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>,
  );

  fireEvent.contextMenu(screen.getByText("Item"));
  await user.click(screen.getByText("Copy id"));

  expect(onClick).toHaveBeenCalledOnce();
  expect(consoleError).not.toHaveBeenCalled();
});
