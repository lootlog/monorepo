// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
