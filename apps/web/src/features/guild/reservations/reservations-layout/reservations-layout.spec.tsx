// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReservationsLayout } from "./reservations-layout";

vi.mock("@tanstack/react-router", () => ({
  Outlet: () => <div data-slot="outlet" />,
}));

afterEach(cleanup);

describe("ReservationsLayout", () => {
  it("tracks the dynamic viewport so the mobile action dock stays visible", () => {
    const { container } = render(<ReservationsLayout />);

    expect(container.firstElementChild?.className).toContain(
      "h-[calc(100dvh-3.5rem)]",
    );
  });
});
