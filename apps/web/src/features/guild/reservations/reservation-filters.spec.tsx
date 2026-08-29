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
  it("renders the filters as a shadcn button group", () => {
    render(<ReservationFilters value="all" onChange={vi.fn()} />);

    const group = screen.getByRole("group", {
      name: "reservations.filters.label",
    });

    expect(group.getAttribute("data-slot")).toBe("button-group");
    expect(screen.getAllByRole("button")).toHaveLength(4);
    const activeFilter = screen.getByRole("button", {
      name: "reservations.filters.all",
    });

    expect(activeFilter.getAttribute("aria-pressed")).toBe("true");
    expect(activeFilter.classList).toContain("border");
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
