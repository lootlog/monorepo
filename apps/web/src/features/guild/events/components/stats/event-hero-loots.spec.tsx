// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Loot } from "@/lib/loots/loot-types";
import { useEventLoots } from "../../hooks/queries/use-event-loots";
import { EventHeroLoots } from "./event-hero-loots";

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    search,
    to: _to,
    ...props
  }: {
    children: ReactNode;
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

vi.mock("../../hooks/queries/use-event-loots", () => ({
  useEventLoots: vi.fn(),
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

vi.mock(
  "@/features/guild/loots-list/components/loots-list/loot-details-dialog",
  () => ({
    LootDetailsDialog: () => <div data-testid="loot-details-dialog" />,
  }),
);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("EventHeroLoots", () => {
  it("renders recent loots as embedded rows with the action in the header", () => {
    vi.mocked(useEventLoots).mockReturnValue({
      data: [{ id: "loot-1" }, { id: "loot-2" }] as unknown as Loot[],
      isLoading: false,
    } as ReturnType<typeof useEventLoots>);

    render(
      <EventHeroLoots
        guildId="guild-one"
        heroNpcNames={["Potulny Berserker"]}
        world="Fobos"
      />,
    );

    const action = screen.getByRole("link", { name: "events.loots.showAll" });

    expect(action.closest("header")).toBeTruthy();
    expect(action.getAttribute("href")).toBe(
      "/guild-one?npcs=Potulny Berserker",
    );
    expect(screen.getByTestId("loot-loot-1").dataset.variant).toBe("embedded");
    expect(screen.getByTestId("loot-loot-2").dataset.variant).toBe("embedded");
    expect(screen.getByTestId("loot-details-dialog")).toBeTruthy();
    expect(useEventLoots).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10 }),
    );
  });
});
