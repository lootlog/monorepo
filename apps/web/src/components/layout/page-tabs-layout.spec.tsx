// @vitest-environment happy-dom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, expect, it, vi } from "vitest";
import { PageTabsLayout } from "./page-tabs-layout";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const renderSettings = (initialPath: string) => {
  const root = createRootRoute({
    component: () => (
      <PageTabsLayout
        ariaLabel="Ustawienia"
        basePath="/organization"
        tabs={[
          { id: "general", label: "Ogólne", href: "/settings" },
          { id: "roles", label: "Role", href: "/settings/roles" },
        ]}
      >
        <Outlet />
      </PageTabsLayout>
    ),
  });

  const page = createRoute({
    getParentRoute: () => root,
    path: "$",
    component: () => <p>Strona</p>,
  });

  const router = createRouter({
    routeTree: root.addChildren([page]),
    history: createMemoryHistory({ initialEntries: [initialPath] }),
  });

  render(<RouterProvider router={router} />);

  return router;
};

it("keeps the same tabs while switching tabs and leaves them out of a page outside the tabs", async () => {
  const router = renderSettings("/organization/settings");
  const tabs = await screen.findByRole("navigation", { name: "Ustawienia" });
  expect(
    screen.getByRole("link", { name: "Ogólne" }).getAttribute("aria-current"),
  ).toBe("page");

  fireEvent.click(screen.getByRole("link", { name: "Role" }));
  await waitFor(() =>
    expect(
      screen.getByRole("link", { name: "Role" }).getAttribute("aria-current"),
    ).toBe("page"),
  );
  expect(router.state.location.pathname).toBe("/organization/settings/roles");
  expect(screen.getByRole("navigation", { name: "Ustawienia" })).toBe(tabs);
  expect(
    screen.getByRole("link", { name: "Ogólne" }).getAttribute("aria-current"),
  ).toBeNull();

  await act(async () => router.history.push("/organization/settings/roles/7"));
  expect(screen.getByText("Strona")).toBeTruthy();
  expect(screen.queryByRole("navigation", { name: "Ustawienia" })).toBeNull();
});

it("opens another tab at its top but keeps the position restored on the way back from a detail page", async () => {
  const scroll = vi.spyOn(HTMLElement.prototype, "scrollTo");
  // The tabs also scroll themselves sideways, so only a vertical scroll counts.
  const pageScroll = expect.objectContaining({ top: expect.anything() });

  const router = renderSettings("/organization/settings/roles");
  await screen.findByRole("navigation", { name: "Ustawienia" });
  expect(scroll).not.toHaveBeenCalledWith(pageScroll);

  await act(async () => router.history.push("/organization/settings/roles/7"));
  await act(async () => router.history.push("/organization/settings/roles"));
  await screen.findByRole("navigation", { name: "Ustawienia" });
  expect(scroll).not.toHaveBeenCalledWith(pageScroll);

  fireEvent.click(screen.getByRole("link", { name: "Ogólne" }));
  await waitFor(() => expect(scroll).toHaveBeenCalledWith({ top: 0 }));
});
