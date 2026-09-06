// @vitest-environment happy-dom
import {
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
  RouterProvider,
} from "@tanstack/react-router";
import { afterEach, expect, it } from "vitest";
import { HorizontalMenu } from "./horizontal-menu";

afterEach(cleanup);

it("marks only the deepest matching section and keeps navigation within its base path", async () => {
  const root = createRootRoute({
    component: () => (
      <HorizontalMenu
        ariaLabel="Ustawienia"
        basePath="/organization"
        items={[
          { id: "general", label: "Ogólne", href: "/settings" },
          { id: "roles", label: "Role", href: "/settings/roles" },
          { id: "members", label: "Członkowie", href: "/settings/members" },
        ]}
      />
    ),
  });
  const route = createRoute({ getParentRoute: () => root, path: "$" });
  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({
      initialEntries: ["/organization/settings/roles/123"],
    }),
  });
  render(<RouterProvider router={router} />);
  const roles = await screen.findByRole("link", { name: "Role" });
  expect(roles.getAttribute("aria-current")).toBe("page");
  expect(
    screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("aria-current") === "page"),
  ).toHaveLength(1);
  fireEvent.click(screen.getByRole("link", { name: "Członkowie" }));
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(
      "/organization/settings/members",
    ),
  );
  expect(
    screen
      .getByRole("link", { name: "Członkowie" })
      .getAttribute("aria-current"),
  ).toBe("page");
  expect(roles.getAttribute("aria-current")).toBeNull();
});
