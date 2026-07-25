import { fireEvent, render, screen } from "@testing-library/react";
import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AsyncContent } from "./async-content";

describe("AsyncContent", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays the spinner without exposing the empty content", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <AsyncContent
        error={null}
        errorLabel="Load failed"
        isLoading
        loadingLabel="Loading"
        retryLabel="Retry"
      >
        <div>No results</div>
      </AsyncContent>,
    );

    expect(screen.getByRole("status").querySelector("svg")).toBeNull();
    expect(screen.queryByText("No results")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));

    const loadingStatus = screen.getByRole("status");
    expect(loadingStatus).toHaveAttribute("aria-busy", "true");
    expect(loadingStatus.querySelector("svg")).toHaveClass(
      "ll:animate-spin",
      "ll:motion-reduce:animate-none",
    );

    rerender(
      <AsyncContent
        error={null}
        errorLabel="Load failed"
        isLoading={false}
        loadingLabel="Loading"
        retryLabel="Retry"
      >
        <div>Loaded</div>
      </AsyncContent>,
    );

    expect(screen.getByText("Loaded")).toBeVisible();
  });

  it("does not flash the spinner when loading finishes before the delay", () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <AsyncContent
        error={null}
        errorLabel="Load failed"
        isLoading
        loadingLabel="Loading"
        retryLabel="Retry"
      >
        <div>Content</div>
      </AsyncContent>,
    );

    act(() => vi.advanceTimersByTime(100));
    rerender(
      <AsyncContent
        error={null}
        errorLabel="Load failed"
        isLoading={false}
        loadingLabel="Loading"
        retryLabel="Retry"
      >
        <div>Content</div>
      </AsyncContent>,
    );
    act(() => vi.advanceTimersByTime(100));

    expect(screen.getByText("Content")).toBeVisible();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows a retry action when loading fails without content", () => {
    const onRetry = vi.fn();

    render(
      <AsyncContent
        error={new Error("network")}
        errorLabel="Load failed"
        isLoading={false}
        loadingLabel="Loading"
        onRetry={onRetry}
        retryLabel="Retry"
      >
        <div>Content</div>
      </AsyncContent>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(screen.getByText("Load failed")).toBeVisible();
    expect(onRetry).toHaveBeenCalledOnce();
    expect(screen.queryByText("Content")).not.toBeInTheDocument();
  });
});
