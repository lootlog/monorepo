import { createOrganizationTestWrapper } from "@/lib/testing/router";
// @vitest-environment happy-dom

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ReservationsLayout } from "./reservations-layout";

afterEach(cleanup);

describe("ReservationsLayout", () => {
  it("fills the bounded application frame so the mobile action dock stays visible", async () => {
    const { container } = render(<ReservationsLayout />, {
      wrapper: await createOrganizationTestWrapper(),
    });

    expect(container.firstElementChild?.className).toContain("h-full");
  });
});
