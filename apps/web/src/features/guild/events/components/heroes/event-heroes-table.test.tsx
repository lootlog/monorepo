import { RouterProvider } from "@tanstack/react-router";
import { createOrganizationTestRouter } from "@/lib/testing/router";
import { initializeTestTranslations } from "@/lib/testing/i18n";
// @vitest-environment happy-dom

import type { ReactNode } from "react";
import {
  cleanup,
  fireEvent,
  render as renderElement,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stubResultsTableViewport } from "@/lib/testing/viewport";
import { EMPTY_VALUE } from "@/constants/empty-value";
import { EventHeroesTable } from "./event-heroes-table";
import type { MyHeroScore } from "../../utils/my-hero-scores";

await initializeTestTranslations();

async function render(element: ReactNode) {
  const router = createOrganizationTestRouter(element);

  await router.load();

  return renderElement(<RouterProvider router={router} />);
}

beforeEach(stubResultsTableViewport);

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("EventHeroesTable", () => {
  const defaultProps = {
    canManage: true,
    eventId: "event-1",
    guildId: "guild-1",
    onAddHero: vi.fn(),
    onDeleteHero: vi.fn(),
    isDeleteHeroPending: false,
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

  it("links each hero and routes every management action to its hero", async () => {
    const onAddHero = vi.fn();
    const onDeleteHero = vi.fn();
    const onEditHero = vi.fn();
    const onManageMaps = vi.fn();

    await render(
      <EventHeroesTable
        {...defaultProps}
        onAddHero={onAddHero}
        onDeleteHero={onDeleteHero}
        onEditHero={onEditHero}
        onManageMaps={onManageMaps}
      />,
    );

    const heroLink = screen.getByRole("link");
    expect(heroLink.getAttribute("href")).toBe(
      "/guild-1/events/event-1/heroes/hero-1",
    );

    fireEvent.click(
      screen.getByRole("button", { name: "events.heroes.addButton" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "events.heroes.actions" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "events.heroes.edit" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "events.heroes.actions" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "events.heroes.manageMaps" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "events.heroes.actions" }),
    );
    fireEvent.click(
      await screen.findByRole("menuitem", {
        name: "events.heroes.deleteAction",
      }),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "events.heroes.deleteAction" }),
    );

    expect(onAddHero).toHaveBeenCalledOnce();
    expect(onEditHero).toHaveBeenCalledWith(defaultProps.rows[0]?.hero);
    expect(onManageMaps).toHaveBeenCalledWith(defaultProps.rows[0]?.hero);
    expect(onDeleteHero).toHaveBeenCalledWith("hero-1");
  });

  it("omits management controls and the whole actions column", async () => {
    await render(<EventHeroesTable {...defaultProps} canManage={false} />);

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

  it("keeps the player's place unknown while it loads, and empty only once known", async () => {
    const withScore = (score?: Omit<MyHeroScore, "hero">) =>
      defaultProps.rows.map((row) => ({
        ...row,
        score: score && { ...score, hero: row.hero },
      }));

    await render(
      <EventHeroesTable {...defaultProps} rows={withScore()} showStandings />,
    );

    expect(screen.queryByText(EMPTY_VALUE)).toBeNull();

    cleanup();
    await render(
      <EventHeroesTable
        {...defaultProps}
        rows={withScore({ playerCount: 4, points: 0, kills: 0 })}
        showStandings
      />,
    );

    expect(await screen.findByText(EMPTY_VALUE)).toBeTruthy();
  });
});
