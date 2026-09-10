// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import {
  getListMyReservationsQueryKey,
  getUsersControllerGetCurrentUserGuildsQueryKey,
} from "@lootlog/client/main";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import "@/i18n/config";
import { MyReservationsCard } from "./my-reservations-card";

let restoreClient = () => {};

afterEach(() => {
  cleanup();
  restoreClient();
  vi.unstubAllGlobals();
});

async function renderCard(client: QueryClient) {
  restoreClient = configureApiClients({
    main: { baseUrl: "https://api.test" },
  });
  client.setQueryData(getUsersControllerGetCurrentUserGuildsQueryKey(), []);
  const Wrapper = await createOrganizationTestWrapper("/@me");

  return render(
    <Wrapper>
      <QueryClientProvider client={client}>
        <MyReservationsCard />
      </QueryClientProvider>
    </Wrapper>,
  );
}

it("shows a retryable error instead of an empty calendar after initial failure", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  let requests = 0;
  vi.stubGlobal("fetch", async () => {
    requests += 1;

    if (requests === 1)
      return Response.json({ message: "Unavailable" }, { status: 503 });

    return Response.json({ items: [] });
  });
  await renderCard(client);
  expect((await screen.findByRole("alert")).textContent).toContain(
    "Nie udało się pobrać rezerwacji.",
  );
  expect(screen.queryByText("Nie masz nadchodzących rezerwacji")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /Spróbuj ponownie/ }));
  await screen.findByText("Nie masz nadchodzących rezerwacji");
  expect(requests).toBe(2);
});

it("keeps cached reservations visible and marks them stale after a refresh failure", async () => {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: Infinity },
    },
  });

  const queryKey = getListMyReservationsQueryKey({ status: "upcoming" });
  client.setQueryData(queryKey, {
    items: [
      {
        id: 1,
        spotId: "zamek",
        spotName: "Potępione zamczysko",
        startsAt: "2026-09-06T16:00:00Z",
        endsAt: "2026-09-06T17:00:00Z",
        comment: null,
        createdAt: "2026-09-01T12:00:00Z",
        author: { displayName: "Wild", avatarUrl: null },
        reminderMinutesBefore: null,
        canEdit: false,
        canCancel: false,
        isMine: true,
        editingConstraints: {
          reservationMaxDurationMinutes: 180,
          reservationMinDurationMinutes: 30,
          reservationTimeGranularityMinutes: 15,
          reservationMaxAdvanceDays: 7,
        },
        sourceOrganization: {
          name: "Organizacja",
          iconUrl: null,
          isCurrent: true,
          calendarPath: "/organizacja/reservations/zamek",
        },
      },
    ],
  });
  vi.stubGlobal("fetch", async () =>
    Response.json({ message: "Unavailable" }, { status: 503 }),
  );
  await renderCard(client);
  expect(screen.getByText("Potępione zamczysko")).toBeTruthy();
  await client.invalidateQueries({ queryKey });
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toContain(
      "Pokazujemy ostatnie dostępne dane.",
    ),
  );
  expect(screen.getByText("Potępione zamczysko")).toBeTruthy();
});
