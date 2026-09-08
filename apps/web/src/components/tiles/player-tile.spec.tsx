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

describe("PlayerTile", () => {
  it("gives the profile link an accessible name", () => {
    render(
      <PlayerTile
        player={{
          id: "player-1",
          name: "Tester",
          icon: "tester.png",
        }}
        accountId={123}
      />,
    );

    const profileLink = screen.getByRole("link", {
      name: "loots.list.playerActions.openMargonemProfile",
    });

    expect(profileLink.getAttribute("href")).toBe(
      "https://www.margonem.pl/profile/view,123",
    );
  });

  it("shows and hides player details on hover without a shared tooltip provider", async () => {
    const { container } = render(
      <PlayerTile
        player={{
          id: "player-1",
          name: "Tester",
          lvl: 123,
          prof: "Warrior",
          icon: "tester.png",
        }}
      />,
    );
    const trigger = container.firstElementChild;

    if (!trigger) throw new Error("Missing player tile trigger");

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

  it("keeps the tooltip and loot action when loot controls are enabled", async () => {
    const onShowLoots = vi.fn();

    render(
      <PlayerTile
        player={{
          id: "player-1",
          name: "Tester",
          lvl: 123,
          prof: "Warrior",
          icon: "tester.png",
        }}
        onShowLoots={onShowLoots}
      />,
    );
    const actionTrigger = screen.getByLabelText(
      "loots.list.playerActions.label",
    );
    const tooltipTrigger = actionTrigger.querySelector(
      '[data-slot="tooltip-trigger"]',
    );

    if (!tooltipTrigger) throw new Error("Missing tooltip trigger");

    fireEvent.pointerEnter(tooltipTrigger, {
      pointerType: "mouse",
    });
    fireEvent.mouseEnter(tooltipTrigger);
    fireEvent.mouseMove(tooltipTrigger);

    const tooltip = await screen.findByRole("tooltip");
    expect(tooltip.textContent).toBe("Tester (123w)");

    fireEvent.contextMenu(actionTrigger);

    const showLootsAction = await screen.findByText(
      "loots.list.playerActions.showLoots",
    );
    fireEvent.click(showLootsAction);

    expect(onShowLoots).toHaveBeenCalledOnce();
  });
});
