// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiSelect } from "./multi-select";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
  cleanup();
});

describe("MultiSelect", () => {
  it("distinguishes an untouched search from an empty result", () => {
    render(
      <MultiSelect
        controlledSearch
        onClose={() => {}}
        onSearchChange={() => {}}
        onValueChange={() => {}}
        options={[]}
        searchValue=""
        value={[]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));

    expect(screen.getByText("common.startTypingToSearch")).toBeTruthy();
    expect(screen.queryByText("common.noResults")).toBeNull();
  });

  it("asks for the minimum query length before showing an empty result", () => {
    render(
      <MultiSelect
        controlledSearch
        minimumSearchLength={2}
        onClose={() => {}}
        onSearchChange={() => {}}
        onValueChange={() => {}}
        options={[]}
        searchPlaceholder="Szukaj..."
        searchValue=""
        value={[]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.change(screen.getByPlaceholderText("Szukaj..."), {
      target: { value: "a" },
    });

    expect(screen.getByText("common.searchMinimumCharacters")).toBeTruthy();
    expect(screen.queryByText("common.noResults")).toBeNull();
  });

  it("keeps selected labels when remote options are replaced", () => {
    const sharedProps = {
      onClose: () => {},
      onValueChange: () => {},
      placeholder: "Wybierz graczy",
      value: ["player-1"],
    };
    const { rerender } = render(
      <MultiSelect
        {...sharedProps}
        options={[{ label: "Freaky nikky", value: "player-1" }]}
      />,
    );

    expect(screen.getByText("Freaky nikky")).toBeTruthy();

    rerender(
      <MultiSelect
        {...sharedProps}
        options={[{ label: "Inny gracz", value: "player-2" }]}
      />,
    );

    expect(screen.getByText("Freaky nikky")).toBeTruthy();
  });

  it("updates controlled-search text immediately while the query value is debounced", () => {
    const onSearchChange = vi.fn();

    render(
      <MultiSelect
        controlledSearch
        emptyMessage="Brak wyników"
        onClose={() => {}}
        onSearchChange={onSearchChange}
        onValueChange={() => {}}
        options={[]}
        placeholder="Wybierz potwory"
        searchPlaceholder="Szukaj..."
        searchValue=""
        value={[]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText(
      "Szukaj...",
    ) as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: "Quet" } });

    expect(searchInput.value).toBe("Quet");
    expect(onSearchChange).toHaveBeenCalledWith("Quet");
  });
});
