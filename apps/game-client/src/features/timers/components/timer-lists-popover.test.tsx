import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useTimersStore } from "@/store/timers.store";
import { TimerListsPopover } from "./timer-lists-popover";

afterEach(() =>
  useTimersStore.setState(useTimersStore.getInitialState(), true),
);

describe("timer lists popover", () => {
  it("creates a list typed inside the timer context menu", async () => {
    const user = userEvent.setup();
    render(
      <ContextMenu>
        <ContextMenuTrigger>Tarolin</ContextMenuTrigger>
        <ContextMenuContent>
          <TimerListsPopover npcName="Tarolin" />
        </ContextMenuContent>
      </ContextMenu>,
    );

    fireEvent.contextMenu(screen.getByText("Tarolin"));
    await user.click(await screen.findByRole("menuitem", { name: "Listy" }));
    await user.type(
      await screen.findByRole("textbox", { name: "Nazwa listy" }),
      "Kolos{Enter}",
    );

    expect(Object.values(useTimersStore.getState().customLists)).toEqual([
      expect.objectContaining({ name: "Kolos", npcNames: ["Tarolin"] }),
    ]);
  });
});
