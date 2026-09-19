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

it("clears a selected item through its keyboard-accessible action", () => {
  const onSelect = vi.fn();
  const onSearchChange = vi.fn();
  render(
    <WatchedItemSelector
      loading={false}
      items={[]}
      searchValue="miecz"
      selectedItem={{ id: 1, name: "miecz", icon: "", rarity: null }}
      placeholder="Wybierz przedmiot"
      searchPlaceholder="Wyszukaj przedmiot"
      emptyMessage="Brak przedmiotów"
      loadingMessage="Wczytywanie"
      disabledMessage="Wybierz świat"
      onSearchChange={onSearchChange}
      onSelect={onSelect}
    />,
  );
  const clear = screen.getByRole("button", { name: "common.clear" });
  clear.focus();
  fireEvent.click(clear);
  expect(onSelect).toHaveBeenCalledWith(null);
  expect(onSearchChange).toHaveBeenCalledWith("");
  expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe(
    "false",
  );
});

it("keeps externally filtered results and selects the complete item after asynchronous search", async () => {
  const item = {
    id: 17,
    name: "Ostrze",
    icon: "",
    rarity: null,
    stat: "",
    lvl: 20,
    type: null,
    worlds: ["test"],
  };

  const props = {
    loading: false,
    items: [],
    searchValue: "",
    selectedItem: null,
    placeholder: "Wybierz przedmiot",
    searchPlaceholder: "Wyszukaj przedmiot",
    emptyMessage: "Brak przedmiotów",
    loadingMessage: "Wczytywanie",
    disabledMessage: "Wybierz świat",
    onSearchChange: vi.fn(),
    onSelect: vi.fn(),
  };

  const { rerender } = render(<WatchedItemSelector {...props} />);
  fireEvent.click(screen.getByRole("combobox"));
  const input = await screen.findByPlaceholderText(props.searchPlaceholder);
  fireEvent.change(input, { target: { value: "miecz" } });
  expect(props.onSearchChange).toHaveBeenCalledWith("miecz");
  rerender(
    <WatchedItemSelector {...props} searchValue="miecz" items={[item]} />,
  );
  const option = await screen.findByRole("option", { name: /Ostrze/ });
  fireEvent.click(option);
  expect(props.onSelect).toHaveBeenCalledWith(item);
  expect(props.onSearchChange).toHaveBeenLastCalledWith(item.name);
  await waitFor(() =>
    expect(screen.getByRole("combobox").getAttribute("aria-expanded")).toBe(
      "false",
    ),
  );
});
