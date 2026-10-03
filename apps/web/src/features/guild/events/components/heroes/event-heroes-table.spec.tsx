import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
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
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { EventHeroesTable } from "./event-heroes-table";

await initializeTestTranslations({
  "events.heroes.columns.idValue": "ID: {{id}}",
});

async function render(element: ReactNode) {
  const queryClient = new QueryClient();
  onTestFinished(() => queryClient.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async () =>
          Response.json({
            hasTimer: true,
            windowStatus: "WAITING",
            minSpawnTime: "2026-08-12T09:00:00Z",
            maxSpawnTime: "2026-08-12T09:30:00Z",
            overdueMs: null,
          }),
      },
    }),
  );

  const router = createOrganizationTestRouter(
    <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>,
  );

  await router.load();

  return renderElement(<RouterProvider router={router} />);
}

afterEach(cleanup);

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

  it("renders responsive hero data and preserves all interactions", async () => {
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

    expect(
      screen.getByRole("heading", { name: "events.heroes.title" }),
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

    expect(screen.getByText("Potulny Berserker")).toBeTruthy();
    expect(screen.getByText("284w")).toBeTruthy();
    expect(
      await screen.findByText("events.respawn.status.waiting"),
    ).toBeTruthy();
    expect(screen.getByText("ID: 410452")).toBeTruthy();
    expect(screen.getByText("events.maps.mapCount")).toBeTruthy();
    expect(screen.getByText("events.heroes.killCount")).toBeTruthy();
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

  it("keeps the empty state inside the card", async () => {
    await render(<EventHeroesTable {...defaultProps} rows={[]} />);

    const emptyState = screen.getByText("events.heroes.empty");
    expect(emptyState.closest('[data-slot="card"]')).toBeTruthy();
  });
});
