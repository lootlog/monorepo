// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
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
import { UserHeaderActionsPortal } from "./user-header-actions-portal";
import "@/i18n/config";

const theme = {
  theme: "default",
  resolvedTheme: "default",
  setTheme: () => {},
  isLoading: false,
} as const;

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
        <UserHeaderActionsPortal>
          <button>Page action</button>
        </UserHeaderActionsPortal>
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

  it.each(["back", "breadcrumb"])(
    "removes the page's header action when returning through %s navigation",
    async (navigation) => {
      const router = await renderAccountPage();
      expect(
        await screen.findByRole("button", { name: "Page action" }),
      ).toBeDefined();
      expect(
        within(screen.getByRole("main")).queryByRole("button", {
          name: "Page action",
        }),
      ).toBeNull();

      const parentControl =
        navigation === "back"
          ? screen.getByRole("button", { name: "" })
          : within(screen.getByRole("navigation")).getByRole("link", {
              name: "Ustawienia",
            });
      fireEvent.click(parentControl);

      await screen.findByRole("heading", { name: "Settings overview" });
      expect(router.state.location.pathname).toBe("/@me/settings");
      expect(screen.queryByRole("button", { name: "Page action" })).toBeNull();
    },
  );
});
