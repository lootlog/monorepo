// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { AppBreadcrumbs } from "./app-breadcrumbs";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("AppBreadcrumbs", () => {
  afterEach(cleanup);

  it("renders accessible navigation with links, separators, and current page", async () => {
    const root = createRootRoute({
      component: () => (
        <AppBreadcrumbs
          breadcrumbs={[
            { label: "Lootlog", path: "/guild" },
            { label: "Events", path: "/guild/events" },
            { label: "Summer Event", path: "/guild/events/summer" },
            { label: "Members", path: "/guild/events/summer/members" },
            { label: "Very Long Member Name", path: null },
          ]}
        />
      ),
    });
    const route = createRoute({ getParentRoute: () => root, path: "/$" });
    const router = createRouter({
      routeTree: root.addChildren([route]),
      history: createMemoryHistory({ initialEntries: ["/guild"] }),
    });
    await router.load();
    const { container } = render(<RouterProvider router={router} />);

    expect(
      screen.getByRole("navigation", {
        name: "common.breadcrumbs.navigationLabel",
      }),
    ).toBeDefined();
    expect(
      container.querySelectorAll('[data-slot="breadcrumb-separator"]'),
    ).toHaveLength(4);
    expect(
      container.querySelector('[data-slot="breadcrumb-page"]')?.textContent,
    ).toBe("Very Long Member Name");

    const breadcrumbItems = container.querySelectorAll(
      '[data-slot="breadcrumb-item"]',
    );
    expect(breadcrumbItems[0]?.className).toContain("2xl:inline-flex");
    expect(breadcrumbItems[2]?.className).toContain("xl:inline-flex");
    expect(breadcrumbItems[3]?.className).toContain("sm:inline-flex");
    expect(breadcrumbItems[4]?.className).not.toContain("hidden");
    expect(
      screen.getByRole("link", { name: "Summer Event" }).className,
    ).toContain("truncate");

    const members = screen.getByRole("link", { name: "Members" });
    expect(members.getAttribute("href")).toBe("/guild/events/summer/members");
    fireEvent.click(members, { ctrlKey: true });
    expect(router.state.location.pathname).toBe("/guild");
    fireEvent.click(members);

    await waitFor(() =>
      expect(router.state.location.pathname).toBe(
        "/guild/events/summer/members",
      ),
    );
  });
});
