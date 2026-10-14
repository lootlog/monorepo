import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  waitFor,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";

import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { MyReservations } from "./my-reservations";
import { parseMyReservationsSearch } from "./my-reservations-search";

await initializeTestTranslations({
  "reservations.my.title": "Moje rezerwacje",
  "reservations.my.tabsLabel": "Zakres rezerwacji",
  "reservations.my.upcoming": "Nadchodzące",
  "reservations.my.history": "Historia 30 dni",
  "reservations.my.emptyUpcoming": "Brak nadchodzących rezerwacji",
  "reservations.my.emptyHistory": "Brak rezerwacji w historii",
  "reservations.my.emptyDescription": "Brak wpisów",
});

const renderMyReservations = (url: string) => {
  const requests: URL[] = [];

  onTestFinished(
    configureApiClients({ main: { baseUrl: "https://api.test" } }),
  );
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    requests.push(new URL(input instanceof Request ? input.url : input));

    return Response.json({ items: [] });
  });

  const root = createRootRoute();

  const auth = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
  });

  const route = createRoute({
    getParentRoute: () => auth,
    path: "@me/reservations",
    validateSearch: parseMyReservationsSearch,
    component: MyReservations,
  });

  const router = createRouter({
    routeTree: root.addChildren([auth.addChildren([route])]),
    history: createMemoryHistory({ initialEntries: [url] }),
  });

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return requests;
};

describe("MyReservations", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("names the page and requests the complete upcoming list", async () => {
    const requests = renderMyReservations("/@me/reservations");

    await screen.findByText("Brak nadchodzących rezerwacji");

    expect(
      screen.getByRole("heading", { level: 1, name: "Moje rezerwacje" }),
    ).toBeTruthy();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.searchParams.get("status")).toBe("upcoming");
    expect(screen.queryByRole("button", { name: "Poprzednia" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Następna" })).toBeNull();
  });

  it("opens the history tab from the link and its tab", async () => {
    const requests = renderMyReservations("/@me/reservations?status=past");

    await screen.findByText("Brak rezerwacji w historii");
    expect(requests[requests.length - 1]?.searchParams.get("status")).toBe(
      "past",
    );

    fireEvent.click(screen.getByRole("link", { name: "Nadchodzące" }));

    await screen.findByText("Brak nadchodzących rezerwacji");
    expect(requests[requests.length - 1]?.searchParams.get("status")).toBe(
      "upcoming",
    );
  });
});
