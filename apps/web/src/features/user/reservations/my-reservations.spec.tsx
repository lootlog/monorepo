import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { waitFor, cleanup, render, screen } from "@testing-library/react";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";

import { afterEach, describe, expect, it, vi } from "vitest";
import { MyReservations } from "./my-reservations";

await initializeTestTranslations({
  "reservations.my.title": "Moje zapisy",
  "reservations.my.description": "Opis",
  "reservations.my.tabsLabel": "Zakres rezerwacji",
  "reservations.my.upcoming": "Nadchodzące",
  "reservations.my.history": "Historia 30 dni",
  "reservations.my.emptyUpcoming": "Brak nadchodzących rezerwacji",
  "reservations.my.emptyDescription": "Brak wpisów",
});

describe("MyReservations", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("names the page and requests the complete selected list", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    const restore = configureApiClients({
      main: { baseUrl: "https://api.test" },
    });

    const requests: URL[] = [];
    vi.stubGlobal("fetch", async (input: string | URL | Request) => {
      requests.push(new URL(input instanceof Request ? input.url : input));

      return Response.json({ items: [] });
    });
    render(
      <QueryClientProvider client={client}>
        <MyReservations />
      </QueryClientProvider>,
    );
    await screen.findByText("Brak nadchodzących rezerwacji");
    restore();

    expect(
      screen.getByRole("heading", { level: 1, name: "Moje zapisy" }),
    ).toBeTruthy();
    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.searchParams.get("status")).toBe("upcoming");
    expect(screen.queryByRole("button", { name: "Poprzednia" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Następna" })).toBeNull();
  });
});
