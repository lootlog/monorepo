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
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { MyReservationsCard } from "./my-reservations-card";

const reservations = vi.hoisted(() => vi.fn());
vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  useListMyReservations: reservations,
  useUsersControllerGetCurrentUserGuilds: () => ({ data: [] }),
}));
afterEach(cleanup);

function renderCard() {
  const root = createRootRoute();
  const route = createRoute({
    getParentRoute: () => root,
    path: "/@me",
    component: MyReservationsCard,
  });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/@me"] }),
  });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

it("shows a retryable error instead of an empty calendar after initial failure", async () => {
  const refetch = vi.fn();
  reservations.mockReturnValue({
    data: undefined,
    isPending: false,
    isFetching: false,
    isError: true,
    refetch,
  });
  renderCard();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Nie udało się pobrać rezerwacji.",
  );
  expect(screen.queryByText("Nie masz nadchodzących rezerwacji")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Spróbuj ponownie/ }));
  expect(refetch).toHaveBeenCalledOnce();
});

it("keeps cached reservations visible and marks them stale after a refresh failure", async () => {
  reservations.mockReturnValue({
    data: {
      items: [
        {
          id: 1,
          spotName: "Potępione zamczysko",
          startsAt: "2026-09-06T16:00:00Z",
          endsAt: "2026-09-06T17:00:00Z",
          reminderMinutesBefore: null,
          canEdit: false,
          canCancel: false,
          sourceOrganization: {
            name: "Organizacja",
            iconUrl: null,
            calendarPath: "/organizacja/reservations/zamek",
          },
        },
      ],
    },
    isPending: false,
    isFetching: false,
    isError: true,
    refetch: vi.fn(),
  });
  renderCard();
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Pokazujemy ostatnie dostępne dane.",
  );
  expect(screen.getByText("Potępione zamczysko")).toBeTruthy();
});
