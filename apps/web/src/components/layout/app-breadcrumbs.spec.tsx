// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppBreadcrumbs } from "./app-breadcrumbs";

vi.mock("@/themes", () => ({
  ThemeInteractiveFrame: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("AppBreadcrumbs", () => {
  afterEach(cleanup);

  it("renders accessible navigation with links, separators, and current page", () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <AppBreadcrumbs
        breadcrumbs={[
          { label: "Lootlog", path: "/guild" },
          { label: "Events", path: "/guild/events" },
          { label: "Summer Event", path: "/guild/events/summer" },
          { label: "Members", path: "/guild/events/summer/members" },
          { label: "Very Long Member Name", path: null },
        ]}
        onNavigate={onNavigate}
      />,
    );

    expect(
      screen.getByRole("navigation", {
        name: "common.breadcrumbs.navigationLabel",
      }),
    ).toBeDefined();
    expect(
      container.querySelectorAll('[data-slot="breadcrumb-separator"]'),
    ).toHaveLength(4);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Very Long Member Name",
    );

    const breadcrumbItems = container.querySelectorAll(
      '[data-slot="breadcrumb-item"]',
    );
    expect(breadcrumbItems[0]?.className).toContain("2xl:inline-flex");
    expect(breadcrumbItems[2]?.className).toContain("xl:inline-flex");
    expect(breadcrumbItems[3]?.className).toContain("sm:inline-flex");
    expect(breadcrumbItems[4]?.className).not.toContain("hidden");
    expect(
      screen.getByRole("button", { name: "Summer Event" }).className,
    ).toContain("truncate");

    fireEvent.click(screen.getByRole("button", { name: "Members" }));

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("/guild/events/summer/members");
  });
});
