// @vitest-environment happy-dom

import { TEST_THEME_CONTEXT } from "@/lib/testing/theme-context";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, describe, expect, it } from "vitest";
import { SidebarProvider } from "@lootlog/ui/components/sidebar";
import { ThemeContext } from "@/contexts/theme-context";
import { UserShell } from "./user-shell";
import { HeaderSlotPortal } from "./header-slot-portal";
import "@/i18n/config";

const theme = TEST_THEME_CONTEXT;

const renderAccountPage = async () => {
  const root = createRootRoute({
    component: () => (
      <ThemeContext.Provider value={theme}>
        <SidebarProvider>
          <Outlet />
        </SidebarProvider>
      </ThemeContext.Provider>
    ),
  });

  const authenticated = createRoute({
    getParentRoute: () => root,
    id: "_authenticated",
    component: () => (
      <UserShell>
        <Outlet />
      </UserShell>
    ),
  });

  const user = createRoute({
    getParentRoute: () => authenticated,
    path: "@me",
  });

  const settings = createRoute({
    getParentRoute: () => user,
    path: "settings",
  });

  const settingsIndex = createRoute({
    getParentRoute: () => settings,
    path: "/",
    component: () => (
      <div>
        <h1>Settings overview</h1>
      </div>
    ),
  });

  const account = createRoute({
    getParentRoute: () => settings,
    path: "account",
    component: () => (
      <div>
        <HeaderSlotPortal slot="actions">
          <button>Page action</button>
        </HeaderSlotPortal>
        <h1>Account content</h1>
      </div>
    ),
  });

  const router = createRouter({
    routeTree: root.addChildren([
      authenticated.addChildren([
        user.addChildren([settings.addChildren([settingsIndex, account])]),
      ]),
    ]),
    history: createMemoryHistory({ initialEntries: ["/@me/settings/account"] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);
  await screen.findByRole("heading", { name: "Account content" });

  return router;
};

describe("user shell navigation", () => {
  afterEach(cleanup);

  it("names the section of a settings tab and drops the tab's header action on leaving", async () => {
    const router = await renderAccountPage();
    expect(
      await screen.findByRole("button", { name: "Page action" }),
    ).toBeDefined();
    expect(
      within(screen.getByRole("main")).queryByRole("button", {
        name: "Page action",
      }),
    ).toBeNull();
    // A settings tab is a sibling of the overview, not its child.
    expect(screen.queryByRole("link", { name: /^Wróć/ })).toBeNull();
    expect(screen.getByText("Ustawienia")).toBeDefined();

    await act(async () => {
      await router.navigate({ to: "/@me/settings" });
    });

    await screen.findByRole("heading", { name: "Settings overview" });
    expect(screen.queryByRole("button", { name: "Page action" })).toBeNull();
  });
});
