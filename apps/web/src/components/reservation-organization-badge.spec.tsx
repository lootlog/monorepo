// @vitest-environment happy-dom

import type { ComponentProps } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationOrganizationBadge } from "./reservation-organization-badge";

vi.mock("@lootlog/ui/components/avatar", () => ({
  Avatar: ({ children, ...props }: ComponentProps<"span">) => (
    <span {...props}>{children}</span>
  ),
  AvatarImage: (props: ComponentProps<"img">) => <img {...props} />,
  AvatarFallback: ({ children, ...props }: ComponentProps<"span">) => (
    <span {...props}>{children}</span>
  ),
}));

afterEach(cleanup);

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
