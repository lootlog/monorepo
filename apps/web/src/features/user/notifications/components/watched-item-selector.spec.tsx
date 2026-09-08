// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WatchedItemSelector } from "./watched-item-selector";

await initializeTestTranslations();
afterEach(cleanup);

it("distinguishes an item-search outage from a successful empty search and recovers", async () => {
  const props = {
    loading: false,
    items: [],
    searchValue: "miecz",
    selectedItem: null,
    placeholder: "Wybierz przedmiot",
    searchPlaceholder: "Wyszukaj przedmiot",
    emptyMessage: "Brak przedmiotów",
    loadingMessage: "Wczytywanie",
    disabledMessage: "Wybierz świat",
    onSearchChange: vi.fn(),
    onSelect: vi.fn(),
  };
  const { rerender } = render(
    <WatchedItemSelector {...props} errorMessage="Wyszukiwarka niedostępna" />,
  );
  fireEvent.click(screen.getByRole("combobox"));
  await waitFor(() =>
    expect(screen.getByRole("alert").textContent).toBe(
      "Wyszukiwarka niedostępna",
    ),
  );
  expect(screen.queryByText("Brak przedmiotów")).toBeNull();
  rerender(<WatchedItemSelector {...props} />);
  await waitFor(() =>
    expect(screen.getByText("Brak przedmiotów")).toBeTruthy(),
  );
  expect(screen.queryByRole("alert")).toBeNull();
});
