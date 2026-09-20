// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlayerTile } from "./player-tile";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
});

const player = {
  id: "player-1",
  name: "Tester",
  lvl: 123,
  prof: "Warrior",
  icon: "tester.png",
};

describe("PlayerTile", () => {
  it("opens the profile link from the click popover instead of navigating directly", async () => {
    render(<PlayerTile player={player} accountId={123} />);

    const tile = screen.getByRole("button", {
      name: "loots.list.playerActions.label",
    });

    expect(tile.tagName).toBe("BUTTON");
    fireEvent.click(tile);

    const profileLink = await screen.findByRole("link", {
      name: "loots.list.playerActions.openMargonemProfile",
    });

    expect(profileLink.getAttribute("href")).toBe(
      "https://www.margonem.pl/profile/view,123",
    );
  });

  it("shows and hides player details on hover without a shared tooltip provider", async () => {
    render(<PlayerTile player={player} />);

    const trigger = screen.getByRole("button", {
      name: "loots.list.playerActions.label",
    });

    fireEvent.pointerEnter(trigger, { pointerType: "mouse" });
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseMove(trigger);

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("Tester (123w)");

    fireEvent.mouseLeave(trigger);
    fireEvent.mouseOut(trigger, { relatedTarget: document.body });

    await waitFor(() => {
      expect(screen.queryByRole("tooltip")).toBeNull();
    });
  });

  it("runs the loot action from the popover and closes it", async () => {
    const onShowLoots = vi.fn();

    render(<PlayerTile player={player} onShowLoots={onShowLoots} />);

    fireEvent.click(
      screen.getByRole("button", { name: "loots.list.playerActions.label" }),
    );

    const showLootsAction = await screen.findByRole("button", {
      name: "loots.list.playerActions.showLoots",
    });

    fireEvent.click(showLootsAction);

    expect(onShowLoots).toHaveBeenCalledOnce();

    await waitFor(() => {
      expect(
        screen.queryByRole("button", {
          name: "loots.list.playerActions.showLoots",
        }),
      ).toBeNull();
    });
  });
});
