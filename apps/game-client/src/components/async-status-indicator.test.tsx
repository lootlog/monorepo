import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AsyncStatusIndicator } from "./async-status-indicator";

describe("AsyncStatusIndicator", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays a transient loading status", () => {
    vi.useFakeTimers();

    render(
      <AsyncStatusIndicator active delay kind="loading" label="Refreshing" />,
    );

    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));

    expect(screen.getByRole("status")).toHaveTextContent("Refreshing");
  });

  it("allows retrying a failed refresh", () => {
    const onRetry = vi.fn();

    render(
      <AsyncStatusIndicator
        active
        kind="error"
        label="Refresh failed"
        onRetry={onRetry}
        retryLabel="Retry"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
