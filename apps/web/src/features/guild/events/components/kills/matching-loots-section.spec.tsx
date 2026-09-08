// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { createLoot } from "@/lib/testing/loot";
import { createLootTestWrapper } from "@/lib/testing/loot-wrapper";
import { MatchingLootsSection } from "./matching-loots-section";

await initializeTestTranslations();

afterEach(cleanup);

describe("MatchingLootsSection", () => {
  it("renders matching loots as embedded rows inside one shared card", async () => {
    render(
      <MatchingLootsSection
        loots={[createLoot(1), createLoot(2)]}
        isLoading={false}
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
      { wrapper: await createLootTestWrapper() },
    );

    const section = screen.getByTestId("matching-loots-card");
    const header = section.querySelector("header");

    expect(section.className).toContain("rounded-2xl");
    expect(section.className).toContain("border-border");
    expect(header?.className).toContain("min-h-12");
    expect(header?.className).toContain("py-2");
    expect(screen.queryByText("2")).toBeNull();
    expect(
      screen
        .getAllByTestId("loot-list-item")
        .map((row) => row.dataset.presentation),
    ).toEqual(["embedded", "embedded"]);
    const showAllLink = screen.getByRole("link", {
      name: "events.loots.showAll",
    });
    const target = new URL(
      showAllLink.getAttribute("href") ?? "",
      "https://web.test",
    );
    expect(target.pathname).toBe("/guild-one");
    expect(target.searchParams.get("npcs")).toBe("Potulny Berserker");
    expect(showAllLink.getAttribute("class")).toContain("hover:text-primary");
    expect(showAllLink.getAttribute("class")).not.toContain("hover:bg-");
  });

  it("keeps loading and empty states inside the shared card", async () => {
    const { rerender } = render(
      <MatchingLootsSection
        loots={[]}
        isLoading
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
      { wrapper: await createLootTestWrapper() },
    );

    expect(screen.getByTestId("matching-loots-card")).toBeTruthy();
    expect(
      screen
        .getByTestId("matching-loots-card")
        .querySelectorAll("[data-slot='skeleton']"),
    ).toHaveLength(3);

    rerender(
      <MatchingLootsSection
        loots={[]}
        isLoading={false}
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
    );

    expect(screen.getByTestId("matching-loots-card")).toBeTruthy();
    expect(screen.getByText("events.killDetail.noLoots")).toBeTruthy();
  });
});
