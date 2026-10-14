// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationFilters } from "./reservation-filters";

await initializeTestTranslations();

afterEach(cleanup);

describe("ReservationFilters", () => {
  it("selects a filter when its pill is pressed", () => {
    const onChange = vi.fn();
    render(<ReservationFilters value="all" onChange={onChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "reservations.filters.available" }),
    );

    expect(onChange).toHaveBeenCalledWith("available");
  });

  it("shows every spot again when the active pill is pressed", () => {
    const onChange = vi.fn();
    render(<ReservationFilters value="pinned" onChange={onChange} />);

    fireEvent.click(
      screen.getByRole("button", { name: "reservations.filters.pinned" }),
    );

    expect(onChange).toHaveBeenCalledWith("all");
  });
});
