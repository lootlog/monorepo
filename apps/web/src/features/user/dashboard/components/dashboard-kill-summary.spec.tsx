import { configureApiClients } from "@lootlog/client/transport";
import type { UserKillStatsResponseDtoOutput } from "@lootlog/client/main";
// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeContext } from "@/contexts/theme-context";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import "@/i18n/config";
import { DashboardKillSummary } from "./dashboard-kill-summary";

afterEach(cleanup);

it("filters lifetime totals by world and carries the selection to statistics", async () => {
  const requests: URL[] = [];
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input) => {
          const url = new URL(
            input instanceof Request ? input.url : input.toString(),
          );

          requests.push(url);

          const worldTotal =
            url.searchParams.get("world") === "pandora" ? 12 : 42;

          const response: UserKillStatsResponseDtoOutput = {
            overview: {
              totalKills:
                url.searchParams.get("period") === "24h" ? 3 : worldTotal,
              killsByType: { ELITE2: 40, HERO: 2 },
              killsByWorld: { pandora: 12, zorza: 30 },
            },
            topNpcs: [],
          };

          return Response.json(response);
        },
      },
    }),
  );
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "/@me",
    component: DashboardKillSummary,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/@me"] }),
  });

  const queryClient = new QueryClient();
  onTestFinished(() => queryClient.clear());
  render(
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider
        value={{
          theme: "default",
          resolvedTheme: "default",
          setTheme: vi.fn(),
          isLoading: false,
        }}
      >
        <RouterProvider router={router} />
      </ThemeContext.Provider>
    </QueryClientProvider>,
  );
  await screen.findByText("42");
  expect(requests[0]?.search).toBe("");
  expect(screen.getByText("42")).toBeTruthy();
  expect(screen.getByText("40")).toBeTruthy();
  expect(screen.getAllByText("0")).toHaveLength(2);
  fireEvent.click(screen.getByRole("combobox", { name: "Świat" }));
  fireEvent.click(await screen.findByRole("option", { name: "Pandora" }));
  await screen.findByText("12");
  expect(
    requests.some(
      (url) =>
        url.searchParams.get("world") === "pandora" &&
        url.searchParams.get("period") === "all",
    ),
  ).toBe(true);
  expect(
    screen.getByRole("link", { name: /^Statystyki$/ }).getAttribute("href"),
  ).toContain("world=pandora");
  fireEvent.click(screen.getByRole("combobox", { name: "Świat" }));
  fireEvent.click(
    await screen.findByRole("option", { name: "Wszystkie światy" }),
  );
  await screen.findByText("42");
  fireEvent.click(screen.getByRole("combobox", { name: "Okres" }));

  const weekOption = await screen.findByRole("option", {
    name: "Ostatni tydzień",
  });

  fireEvent.pointerDown(weekOption, { pointerType: "mouse" });
  fireEvent.click(weekOption);
  expect(
    screen.getByRole("link", { name: /^Statystyki$/ }).getAttribute("href"),
  ).toContain("days=7");
  fireEvent.click(screen.getByRole("combobox", { name: "Okres" }));

  const dayOption = await screen.findByRole("option", {
    name: "Ostatnie 24 godziny",
  });

  fireEvent.pointerDown(dayOption, { pointerType: "mouse" });
  fireEvent.click(dayOption);
  await screen.findByText("3");
  fireEvent.click(screen.getByRole("combobox", { name: "Okres" }));
  const allOption = await screen.findByRole("option", { name: "Wszystko" });
  fireEvent.pointerDown(allOption, { pointerType: "mouse" });
  fireEvent.click(allOption);
  await screen.findByText("42");
  expect(
    screen.getByRole("link", { name: /^Statystyki$/ }).getAttribute("href"),
  ).not.toContain("world=");
});
