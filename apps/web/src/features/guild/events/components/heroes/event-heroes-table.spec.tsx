// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EventHeroesTable } from "./event-heroes-table";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "events.heroes.columns.idValue") {
        return `ID: ${String(options?.id)}`;
      }

      return key;
    },
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    className,
    params,
  }: {
    children: ReactNode;
    className?: string;
    params: Record<string, string>;
  }) => (
    <a
      href={`/${params.guildId}/events/${params.eventId}/heroes/${params.heroId}`}
      className={className}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/tiles", () => ({
  NpcTile: ({ npc }: { npc: { name: string } }) => <span>{npc.name}</span>,
}));

vi.mock("./hero-window-status-badge", () => ({
  HeroWindowStatusBadge: () => <span>hero-status</span>,
}));

vi.mock("./hero-timer-display", () => ({
  HeroTimerDisplay: () => <span>hero-timer</span>,
}));

vi.mock("@lootlog/ui/components/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
  }: {
    children: ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
  DropdownMenuTrigger: ({ render }: { render: ReactNode }) => render,
}));

vi.mock("@lootlog/ui/components/confirm-delete-dialog", () => ({
  ConfirmDeleteDialog: ({
    onConfirm,
    trigger,
  }: {
    onConfirm: () => void;
    trigger: ReactNode;
  }) => (
    <div>
      {trigger}
      <button type="button" onClick={onConfirm}>
        confirm-delete
      </button>
    </div>
  ),
}));

afterEach(cleanup);

describe("EventHeroesTable", () => {
  const defaultProps = {
    canManage: true,
    eventId: "event-1",
    guildId: "guild-1",
    onAddHero: vi.fn(),
    onDeleteHero: vi.fn(),
    onEditHero: vi.fn(),
    onManageMaps: vi.fn(),
    rows: [
      {
        hero: {
          id: "hero-1",
          locations: [
            {
              id: "location-1",
              name: "Pustynne Katakumby",
              order: 0,
              maps: [
                {
                  id: "map-1",
                  mapId: 1,
                  mapName: "Wschodni Tunel",
                  locationId: "location-1",
                  assignedMembers: [],
                },
              ],
            },
          ],
          maps: [
            {
              id: "map-2",
              mapId: 2,
              mapName: "Gvar Hamryd",
              locationId: null,
              assignedMembers: [],
            },
          ],
          npcIcon: "zorin.gif",
          npcId: 410452,
          npcLvl: 284,
          npcName: "Potulny Berserker",
        },
        stats: {
          killCount: 125,
          npcId: 410452,
          npcProf: "W",
        },
        timer: {
          npcId: 410452,
          world: "Luvia",
          minSpawnTime: "2026-08-12T09:00:00Z",
          maxSpawnTime: "2026-08-12T09:30:00Z",
          npc: { name: "Potulny Berserker", icon: "zorin.gif" },
        },
      },
    ],
  };

  it("renders responsive hero data and preserves all interactions", () => {
    const onAddHero = vi.fn();
    const onDeleteHero = vi.fn();
    const onEditHero = vi.fn();
    const onManageMaps = vi.fn();

    const { container } = render(
      <EventHeroesTable
        {...defaultProps}
        onAddHero={onAddHero}
        onDeleteHero={onDeleteHero}
        onEditHero={onEditHero}
        onManageMaps={onManageMaps}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "events.heroes.title" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("button", { name: "events.heroes.addButton" })
        .getAttribute("class"),
    ).toContain("pr-4!");
    expect(
      screen.getByRole("columnheader", { name: "events.heroes.columns.hero" }),
    ).toBeTruthy();
    expect(
      screen
        .getByRole("columnheader", { name: "events.heroes.columns.maps" })
        .getAttribute("class"),
    ).toContain("lg:table-cell");
    expect(
      screen
        .getByRole("columnheader", { name: "events.heroes.columns.kills" })
        .getAttribute("class"),
    ).toContain("lg:table-cell");
    expect(
      screen.getByRole("columnheader", { name: "events.heroes.columns.timer" }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("columnheader").map((header) => header.textContent),
    ).toEqual([
      "events.heroes.columns.hero",
      "events.heroes.columns.timer",
      "events.heroes.columns.maps",
      "events.heroes.columns.kills",
      "events.heroes.columns.actions",
    ]);
    const actionsHeader = screen.getByRole("columnheader", {
      name: "events.heroes.columns.actions",
    });
    expect(actionsHeader.querySelector(".sr-only")).toBeTruthy();

    expect(screen.getByText("Potulny Berserker (284w)")).toBeTruthy();
    expect(screen.getByText("hero-status")).toBeTruthy();
    expect(screen.getByText("hero-timer")).toBeTruthy();
    expect(container.querySelector(".lucide-chevron-right")).toBeNull();
    expect(
      screen
        .getByRole("button", { name: "events.heroes.actions" })
        .closest("td")
        ?.getAttribute("class"),
    ).toContain("w-16");
    expect(screen.getByText("ID: 410452")).toBeTruthy();
    expect(screen.getByText("events.maps.mapCount")).toBeTruthy();
    expect(screen.getByText("events.heroes.killCount")).toBeTruthy();
    const heroLink = screen.getByRole("link");
    expect(heroLink.getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1",
    );
    expect(heroLink.getAttribute("class")).toContain("hover:text-primary");
    expect(
      screen.getByText("Potulny Berserker (284w)").getAttribute("class"),
    ).not.toContain("underline");

    fireEvent.click(
      screen.getByRole("button", { name: "events.heroes.addButton" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "events.heroes.edit" }));
    fireEvent.click(
      screen.getByRole("button", { name: "events.heroes.manageMaps" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));

    expect(onAddHero).toHaveBeenCalledOnce();
    expect(onEditHero).toHaveBeenCalledWith(defaultProps.rows[0]?.hero);
    expect(onManageMaps).toHaveBeenCalledWith(defaultProps.rows[0]?.hero);
    expect(onDeleteHero).toHaveBeenCalledWith("hero-1");
  });

  it("omits management controls and the whole actions column", () => {
    render(<EventHeroesTable {...defaultProps} canManage={false} />);

    expect(
      screen.queryByRole("button", { name: "events.heroes.addButton" }),
    ).toBeNull();
    expect(
      screen.queryByRole("columnheader", {
        name: "events.heroes.columns.actions",
      }),
    ).toBeNull();
    expect(
      screen.queryByRole("button", { name: "events.heroes.actions" }),
    ).toBeNull();
  });

  it("keeps the empty state inside the card", () => {
    render(<EventHeroesTable {...defaultProps} rows={[]} />);

    const emptyState = screen.getByText("events.heroes.empty");
    expect(emptyState.closest('[data-slot="card"]')).toBeTruthy();
  });
});
