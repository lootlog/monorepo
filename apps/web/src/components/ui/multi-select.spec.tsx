import { initializeTestTranslations } from "@/lib/testing/i18n";
// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MultiSelect } from "./multi-select";

await initializeTestTranslations({ "common.removeOption": "Usuń {{label}}" });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("MultiSelect", () => {
  it("keeps the last label for duplicate option values", () => {
    render(
      <MultiSelect
        onClose={() => {}}
        onValueChange={() => {}}
        options={[
          { value: "selected", label: "Previous label" },
          { value: "selected", label: "Latest label" },
        ]}
        value={["selected"]}
      />,
    );

    expect(screen.getByText("Latest label")).toBeTruthy();
    expect(screen.queryByText("Previous label")).toBeNull();
  });

  it("shows search failure instead of empty or stale results while preserving selected values", () => {
    render(
      <MultiSelect
        controlledSearch
        errorMessage="Wyszukiwarka niedostępna"
        onClose={() => {}}
        onValueChange={() => {}}
        options={[
          { value: "selected", label: "Wybrany" },
          { value: "stale", label: "Nieaktualny wynik" },
        ]}
        searchValue="potwór"
        value={["selected"]}
      />,
    );
    fireEvent.click(screen.getByRole("combobox"));
    expect(screen.getByRole("alert").textContent).toBe(
      "Wyszukiwarka niedostępna",
    );
    expect(screen.queryByText("common.noResults")).toBeNull();
    expect(
      screen.queryByRole("option", { name: "Nieaktualny wynik" }),
    ).toBeNull();
    expect(screen.getByText("Wybrany")).toBeTruthy();
  });

  it("renders its custom popover trigger without native button warnings", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MultiSelect
        onClose={() => {}}
        onValueChange={() => {}}
        options={[]}
        value={[]}
      />,
    );

    expect(consoleError.mock.calls.flat().join(" ")).not.toContain(
      "expected a native <button>",
    );
  });

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

  it("uses the last label when remote options contain duplicate values", () => {
    render(
      <MultiSelect
        onClose={() => {}}
        onValueChange={() => {}}
        value={["player-1"]}
        options={[
          { label: "Old name", value: "player-1" },
          { label: "New name", value: "player-1" },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: "Usuń New name" })).toBeTruthy();
  });

  it("refreshes a selected label when the same remote option changes", () => {
    const sharedProps = {
      onClose: () => {},
      onValueChange: () => {},
      value: ["player-1"],
    };

    const { rerender } = render(
      <MultiSelect
        {...sharedProps}
        options={[{ label: "Old name", value: "player-1" }]}
      />,
    );

    rerender(
      <MultiSelect
        {...sharedProps}
        options={[{ label: "New name", value: "player-1" }]}
      />,
    );

    expect(screen.queryByText("Old name")).toBeNull();
    expect(screen.getByRole("button", { name: "Usuń New name" })).toBeTruthy();
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
    const searchInput = screen.getByPlaceholderText("Szukaj...");

    if (!(searchInput instanceof HTMLInputElement))
      throw new Error("Missing search input");

    fireEvent.change(searchInput, { target: { value: "Quet" } });

    expect(searchInput.value).toBe("Quet");
    expect(onSearchChange).toHaveBeenCalledWith("Quet");
  });

  it("selects an option through the Base UI control", () => {
    const onValueChange = vi.fn();
    const onClose = vi.fn();

    render(
      <MultiSelect
        commandSearch
        onClose={onClose}
        onValueChange={onValueChange}
        options={[
          { label: "Alpha", value: "alpha" },
          { label: "Beta", value: "beta" },
        ]}
        value={[]}
      />,
    );

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Alpha" }));

    expect(onValueChange).toHaveBeenCalledWith(["alpha"]);
  });

  it("labels chip removal with the selected option", () => {
    render(
      <MultiSelect
        onClose={() => {}}
        onValueChange={() => {}}
        options={[{ label: "Alpha", value: "alpha" }]}
        value={["alpha"]}
      />,
    );

    expect(screen.getByRole("button", { name: "Usuń Alpha" })).toBeTruthy();
  });

  it("clears selected options and reports the close once", () => {
    const onValueChange = vi.fn();
    const onClose = vi.fn();

    render(
      <MultiSelect
        onClose={onClose}
        onValueChange={onValueChange}
        options={[{ label: "Alpha", value: "alpha" }]}
        value={["alpha"]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "common.clear" }));

    expect(onValueChange).toHaveBeenCalledWith([]);
    expect(onClose).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledWith([]);
  });

  it("does not open when disabled", () => {
    render(
      <MultiSelect
        disabled
        onClose={() => {}}
        onValueChange={() => {}}
        options={[{ label: "Alpha", value: "alpha" }]}
        value={[]}
      />,
    );

    const input = screen.getByRole("combobox");
    fireEvent.click(input);

    expect(input.getAttribute("aria-expanded")).toBe("false");
  });
});
