import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AutocompleteSuggestions } from "./autocomplete-suggestions";

describe("AutocompleteSuggestions", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a delayed loading state instead of no results", () => {
    vi.useFakeTimers();

    render(
      <AutocompleteSuggestions
        items={[]}
        isLoading
        isOpen
        keyExtractor={(item: string) => item}
        loadingMessage="Searching"
        onSelect={vi.fn()}
        renderItem={(item: string) => item}
        selectedIndex={-1}
        showNoResults
      />,
    );

    expect(screen.queryByText("Searching")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Nie znaleziono wyników"),
    ).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByText("Searching")).toBeVisible();
  });
});
