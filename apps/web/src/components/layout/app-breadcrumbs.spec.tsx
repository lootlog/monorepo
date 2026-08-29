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
          { label: "Settings", path: "/guild/settings" },
          { label: "Members", path: null },
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
    ).toHaveLength(2);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe(
      "Members",
    );

    fireEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith("/guild/settings");
  });
});
