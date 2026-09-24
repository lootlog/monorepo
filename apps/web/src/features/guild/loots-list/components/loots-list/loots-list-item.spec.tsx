// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createLoot } from "@/lib/testing/loot";
import { createLootTestWrapper } from "@/lib/testing/loot-wrapper";
import { LootsListItem } from "./loots-list-item";

await initializeTestTranslations({
  "loots.list.playerActions.label": "Akcje: {{name}}",
});

afterEach(cleanup);

describe("LootsListItem presentation", () => {
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

  it("uses the standalone card presentation by default", async () => {
    const { container } = render(<LootsListItem loot={createLoot()} />, {
      wrapper: await createLootTestWrapper(),
    });

    expect(container.querySelector("[data-slot='card']")).toBeTruthy();
    expect(screen.getByTestId("loot-list-item").dataset.presentation).toBe(
      "card",
    );
  });

  it("renders the same loot content without a nested card when embedded", async () => {
    const { container } = render(
      <LootsListItem loot={createLoot()} variant="embedded" />,
      { wrapper: await createLootTestWrapper() },
    );

    expect(container.querySelector("[data-slot='card']")).toBeNull();
    expect(screen.getByTestId("loot-list-item").dataset.presentation).toBe(
      "embedded",
    );
    expect(screen.getByText("Potulny Berserker (284)")).toBeTruthy();
    expect(screen.getByLabelText("Akcje: Tester")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Legendarny przedmiot" }),
    ).toBeTruthy();
  });
});
