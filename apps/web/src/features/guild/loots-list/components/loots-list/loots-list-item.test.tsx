// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createLoot } from "@/lib/testing/loot";
import { createLootTestWrapper } from "@/lib/testing/loot-wrapper";
import { LootsListItem } from "./loots-list-item";

await initializeTestTranslations();

afterEach(cleanup);

describe("LootsListItem", () => {
  it("opens and closes item stacks outside a live list", async () => {
    const loot = createLoot();
    const item = loot.items[0];

    if (!item) throw new Error("Missing test loot item");
    loot.items.push({ ...item, id: 2, hid: "item-2" });
    loot.lootShare = { "player-1": [item.hid, "item-2"] };
    render(<LootsListItem loot={loot} />, {
      wrapper: await createLootTestWrapper(),
    });

    const stack = screen.getByRole("button", {
      name: "Legendarny przedmiot",
      expanded: false,
    });

    fireEvent.click(stack);
    expect(stack.getAttribute("aria-expanded")).toBe("true");
    fireEvent.pointerDown(document.body);
    expect(stack.getAttribute("aria-expanded")).toBe("false");
  });

  it("keeps a stored winner after the Organization excludes its boss", async () => {
    const loot = createLoot();
    const npc = loot.npcs[0];

    if (!npc) throw new Error("Missing test loot NPC");
    loot.npcs = [{ ...npc, type: "HERO" }];

    const { unmount } = render(<LootsListItem loot={loot} />, {
      wrapper: await createLootTestWrapper(),
    });

    // An excluded hero's legend gets no wheel to start a draw.
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: /loots.details.draw/ }),
      ).toBeNull(),
    );
    unmount();

    // The same loot of an elite still gets one.
    loot.npcs = [{ ...npc, type: "ELITE2" }];

    const elite = render(<LootsListItem loot={loot} />, {
      wrapper: await createLootTestWrapper(),
    });

    expect(
      await screen.findByRole("button", { name: "loots.details.draw.openFor" }),
    ).toBeTruthy();
    elite.unmount();
    loot.npcs = [{ ...npc, type: "HERO" }];

    loot.standingDraws = [
      {
        drawId: 1,
        itemHid: "item-1",
        winner: { name: "Zwycięzca", prof: "MAGE", lvl: 284 },
      },
    ];

    const { rerender } = render(<LootsListItem loot={loot} />, {
      wrapper: await createLootTestWrapper(),
    });

    const [trophy] = await screen.findAllByRole("button", {
      name: "loots.details.draw.wonByItem",
    });

    if (!trophy) throw new Error("Missing standing winner");
    fireEvent.click(trophy);
    expect(await screen.findByRole("dialog")).toBeTruthy();

    // Voiding refreshes the loot without its result; the open draw stays.
    rerender(<LootsListItem loot={{ ...loot, standingDraws: [] }} />);
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});
