// @vitest-environment happy-dom

import { simulateLoadedImages } from "@/lib/testing/images";

import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { ReservationOrganizationBadge } from "./reservation-organization-badge";

afterEach(cleanup);

beforeEach(simulateLoadedImages);

afterEach(() => vi.restoreAllMocks());

describe("ReservationOrganizationBadge", () => {
  it("shows the organization name and Discord guild icon", () => {
    const { container } = render(
      <ReservationOrganizationBadge
        name="Zgarbieni"
        iconUrl="https://cdn.discordapp.com/icons/guild/icon.png"
      />,
    );

    expect(screen.getByText("Zgarbieni")).not.toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn.discordapp.com/icons/guild/icon.png",
    );
  });

  it("falls back to the organization initial when the icon is missing", () => {
    render(<ReservationOrganizationBadge name="Zgarbieni" />);

    expect(screen.getByText("Z")).not.toBeNull();
  });
});
