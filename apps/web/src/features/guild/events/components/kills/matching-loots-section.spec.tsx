// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import { MatchingLootsSection } from "./matching-loots-section";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    search,
    to: _to,
    ...props
  }: {
    children: React.ReactNode;
    params: { guildId: string };
    search: { npcs: string };
    to: string;
    [key: string]: unknown;
  }) => (
    <a href={`/${params.guildId}?npcs=${search.npcs}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock(
  "@/features/guild/loots-list/components/loots-list/loots-list-item",
  () => ({
    LootsListItem: ({
      loot,
      variant,
    }: {
      loot: Loot;
      variant?: "card" | "embedded";
    }) => (
      <div data-testid={`loot-${loot.id}`} data-variant={variant}>
        loot-item
      </div>
    ),
  }),
);

afterEach(cleanup);

describe("MatchingLootsSection", () => {
  it("renders matching loots as embedded rows inside one shared card", () => {
    render(
      <MatchingLootsSection
        loots={[createLoot(1), createLoot(2)]}
        isLoading={false}
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
    );

    const section = screen.getByTestId("matching-loots-card");
    const header = section.querySelector("header");

    expect(section.className).toContain("rounded-2xl");
    expect(section.className).toContain("border-border");
    expect(header?.className).toContain("min-h-12");
    expect(header?.className).toContain("py-2");
    expect(screen.queryByText("2")).toBeNull();
    expect(screen.getByTestId("loot-1").dataset.variant).toBe("embedded");
    expect(screen.getByTestId("loot-2").dataset.variant).toBe("embedded");
    const showAllLink = screen.getByRole("link", {
      name: "events.loots.showAll",
    });
    expect(showAllLink.getAttribute("href")).toBe(
      "/guild-one?npcs=Potulny Berserker",
    );
    expect(showAllLink.getAttribute("class")).toContain("hover:text-primary");
    expect(showAllLink.getAttribute("class")).not.toContain("hover:bg-");
  });

  it("keeps loading and empty states inside the shared card", () => {
    const { rerender } = render(
      <MatchingLootsSection
        loots={[]}
        isLoading
        guildId="guild-one"
        npcName="Potulny Berserker"
      />,
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

function createLoot(id: number): Loot {
  return { id } as Loot;
}
