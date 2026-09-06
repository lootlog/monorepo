// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { StatisticsQueryState } from "./statistics-query-state";
afterEach(cleanup);
it("shows pending, preserves stale data on failed refresh and offers retry", () => {
  const refetch = vi.fn();
  const { rerender } = render(
    <StatisticsQueryState
      query={{
        isPending: true,
        isError: false,
        isFetching: true,
        data: undefined,
        refetch,
      }}
    >
      <p>42 bicia</p>
    </StatisticsQueryState>,
  );
  expect(screen.getByRole("status")).toBeTruthy();
  expect(screen.queryByText("42 bicia")).toBeNull();
  rerender(
    <StatisticsQueryState
      query={{
        isPending: false,
        isError: true,
        isFetching: false,
        data: {},
        refetch,
      }}
    >
      <p>42 bicia</p>
    </StatisticsQueryState>,
  );
  expect(screen.getByRole("alert")).toBeTruthy();
  expect(screen.getByText("42 bicia")).toBeTruthy();
  fireEvent.click(screen.getByRole("button"));
  expect(refetch).toHaveBeenCalledOnce();
});
