// @vitest-environment happy-dom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MyReservations } from "./my-reservations";

const mocks = vi.hoisted(() => ({
  invalidateQueries: vi.fn(),
  useListMyReservations: vi.fn(() => ({
    data: { items: [] },
    isFetching: false,
    isPending: false,
  })),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
}));

vi.mock("@lootlog/client/main", async () => ({
  ...(await vi.importActual("@lootlog/client/main")),
  getListMyReservationsQueryKey: () => ["my-reservations"],
  useDeleteMyReservation: () => ({ isPending: false, mutate: vi.fn() }),
  useListMyReservations: mocks.useListMyReservations,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "reservations.my.title": "Moje zapisy",
        "reservations.my.description": "Opis",
        "reservations.my.tabsLabel": "Zakres rezerwacji",
        "reservations.my.upcoming": "Nadchodzące",
        "reservations.my.history": "Historia 30 dni",
        "reservations.my.emptyUpcoming": "Brak nadchodzących rezerwacji",
        "reservations.my.emptyDescription": "Brak wpisów",
      };

      return translations[key] ?? key;
    },
  }),
}));

vi.mock("./my-reservation-list-item", () => ({
  MyReservationListItem: () => <li>Rezerwacja</li>,
}));

describe("MyReservations", () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("uses the full content width and requests the complete selected list", () => {
    render(<MyReservations />);

    const heading = screen.getByRole("heading", { name: "Moje zapisy" });
    const page = heading.parentElement?.parentElement;

    expect(page?.className).toContain("w-full");
    expect(page?.className).not.toContain("max-w-");
    expect(mocks.useListMyReservations).toHaveBeenCalledWith({
      status: "upcoming",
    });
    expect(screen.queryByRole("button", { name: "Poprzednia" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Następna" })).toBeNull();
  });
});
