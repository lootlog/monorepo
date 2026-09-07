// @vitest-environment happy-dom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationFilters } from "./reservation-filters";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

afterEach(cleanup);

describe("ReservationFilters", () => {
  it("labels the filter group and marks the selected filter", () => {
    render(<ReservationFilters value="all" onChange={vi.fn()} />);

    const group = screen.getByRole("group", {
      name: "reservations.filters.label",
    });

    expect(group).toBeTruthy();
    expect(screen.getAllByRole("button")).toHaveLength(4);
    const activeFilter = screen.getByRole("button", {
      name: "reservations.filters.all",
    });

    expect(activeFilter.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "reservations.filters.available" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });

  it("selects a filter when its button is pressed", () => {
    const onChange = vi.fn();
    render(<ReservationFilters value="all" onChange={onChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "reservations.filters.available" }),
    );

    expect(onChange).toHaveBeenCalledWith("available");
  });
});
