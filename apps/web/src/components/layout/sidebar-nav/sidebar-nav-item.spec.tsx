// @vitest-environment happy-dom

import { TEST_THEME_CONTEXT } from "@/lib/testing/theme-context";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { ThemeContext } from "@/contexts/theme-context";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarNavItem } from "./sidebar-nav-item";

const wrapper = await createOrganizationTestWrapper();

describe("SidebarNavItem", () => {
  afterEach(cleanup);

  it("uses the active color for a nested navigation icon", () => {
    renderSidebarNavItem(true);

    expect(
      screen.getByTestId("navigation-icon").parentElement?.className,
    ).toContain("[&_svg]:text-primary");
  });

  it("preserves the signal color for an inactive navigation icon", () => {
    renderSidebarNavItem(false);

    expect(
      screen.getByTestId("navigation-icon").parentElement?.className,
    ).not.toContain("[&_svg]:text-primary");
  });
});

const renderSidebarNavItem = (isActive: boolean) =>
  render(
    <ThemeContext.Provider value={TEST_THEME_CONTEXT}>
      <SidebarNavItem
        url="/events"
        available
        isActive={isActive}
        icon=<svg data-testid="navigation-icon" className="text-yellow-500" />
        label="Events"
        isCatTheme={false}
        onItemClick={() => undefined}
      />
    </ThemeContext.Provider>,
    { wrapper },
  );
