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
  it("links to the full loot list filtered to the killed hero", async () => {
    render(
      <MatchingLootsSection
        hasError={false}
        onRetry={() => {}}
        loots={[createLoot(1), createLoot(2)]}
        isLoading={false}
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
      { wrapper: await createLootTestWrapper() },
    );

    const showAllLink = screen.getByRole("link", {
      name: "events.loots.showAll",
    });

    const target = new URL(
      showAllLink.getAttribute("href") ?? "",
      "https://web.test",
    );

    expect(target.pathname).toBe("/guild-one");
    expect(target.searchParams.get("npcs")).toBe("Potulny Berserker");
  });

  it("reports no loots only after loading finishes", async () => {
    const { rerender } = render(
      <MatchingLootsSection
        hasError={false}
        onRetry={() => {}}
        loots={[]}
        isLoading
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
      { wrapper: await createLootTestWrapper() },
    );

    const section = () =>
      screen.getByRole("region", { name: "events.killDetail.matchingLoots" });

    expect(section().textContent).not.toContain("events.killDetail.noLoots");

    rerender(
      <MatchingLootsSection
        hasError={false}
        onRetry={() => {}}
        loots={[]}
        isLoading={false}
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
    );

    expect(section().textContent).toContain("events.killDetail.noLoots");
  });
});
