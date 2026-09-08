// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createLoot } from "@/lib/testing/loot";
import { createLootTestWrapper } from "@/lib/testing/loot-wrapper";
import { LootsListItem } from "./loots-list-item";

await initializeTestTranslations({
  "loots.list.playerActions.label": "Akcje: {{name}}",
});

afterEach(cleanup);

describe("LootsListItem presentation", () => {
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
