// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SidebarNavItem } from "./sidebar-nav-item";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="/events">{children}</a>
  ),
}));

vi.mock("@/themes/theme-interactive-frame", () => ({
  ThemeInteractiveFrame: ({ children }: { children: ReactNode }) => children,
}));

describe("SidebarNavItem", () => {
  afterEach(cleanup);

  it("uses the active foreground color for a nested navigation icon", () => {
    renderSidebarNavItem(true);

    expect(
      screen.getByTestId("navigation-icon").parentElement?.className,
    ).toContain("[&_svg]:text-primary-foreground");
  });

  it("preserves the signal color for an inactive navigation icon", () => {
    renderSidebarNavItem(false);

    expect(
      screen.getByTestId("navigation-icon").parentElement?.className,
    ).not.toContain("[&_svg]:text-primary-foreground");
  });
});

const renderSidebarNavItem = (isActive: boolean) =>
  render(
    <SidebarNavItem
      url="/events"
      available
      isActive={isActive}
      icon={<svg data-testid="navigation-icon" className="text-yellow-500" />}
      label="Events"
      isRukiaTheme={false}
      isCatTheme={false}
      onItemClick={() => undefined}
    />,
  );
