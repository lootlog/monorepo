// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { Storage as MemoryStorage } from "happy-dom";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { storeGuildWorld } from "@/hooks/context/use-guild-world";
import { useStatsSettings } from "./use-stats-settings";

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// Shows what a stats page reads from its settings.
const Probe = () => {
  const { settings, searchDraft, hasActiveFilters, pageIndex, resetFilters } =
    useStatsSettings();

  return (
    <>
      <output aria-label="page">{pageIndex}</output>
      <output aria-label="search">{searchDraft}</output>
      <output aria-label="filters">
        {hasActiveFilters ? "active" : "none"} {settings.minLvl}
        {settings.npcType} {settings.period}
      </output>
      <button type="button" onClick={resetFilters}>
        clear
      </button>
    </>
  );
};

const mount = async (searchParams: string) => {
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId/stats/ranking",
    component: Probe,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/one/stats/ranking"] }),
  });

  render(
    <NuqsTestingAdapter searchParams={searchParams} hasMemory>
      <RouterProvider router={router} />
    </NuqsTestingAdapter>,
  );

  await screen.findByLabelText("page");
};

it("starts the list over when the Organization's world changes", async () => {
  storeGuildWorld("one", "tempest");
  await mount("?page=3");

  expect(screen.getByLabelText("page").textContent).toBe("2");

  act(() => storeGuildWorld("one", "pandora"));

  await vi.waitFor(() =>
    expect(screen.getByLabelText("page").textContent).toBe("0"),
  );
});

it("clears every filter, the search draft and the page at once", async () => {
  await mount("?minLvl=50&period=7d&npcType=TITAN&search=Kic&page=2");

  expect(screen.getByLabelText("filters").textContent).toBe(
    "active 50TITAN 7d",
  );
  expect(screen.getByLabelText("search").textContent).toBe("Kic");

  fireEvent.click(screen.getByRole("button", { name: "clear" }));

  await vi.waitFor(() =>
    expect(screen.getByLabelText("filters").textContent).toBe("none ALL all"),
  );
  expect(screen.getByLabelText("search").textContent).toBe("");
  expect(screen.getByLabelText("page").textContent).toBe("0");
});
