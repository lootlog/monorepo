// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
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
import type { ReactNode } from "react";
import { afterEach, expect, it } from "vitest";
import { RootRouteError } from "./root-route-error";
import { RootRouteNotFound } from "./root-route-not-found";

await initializeTestTranslations();

afterEach(cleanup);

async function renderRecovery(content: ReactNode) {
  const root = createRootRoute();

  const errorPage = createRoute({
    getParentRoute: () => root,
    path: "/",
    component: () => content,
  });

  const dashboard = createRoute({ getParentRoute: () => root, path: "/@me" });
  const signin = createRoute({ getParentRoute: () => root, path: "/signin" });

  const router = createRouter({
    routeTree: root.addChildren([errorPage, dashboard, signin]),
    history: createMemoryHistory({ initialEntries: ["/"] }),
  });

  await router.load();
  render(<RouterProvider router={router} />);

  return router;
}

it("leaves a missing page through the dashboard without requiring an installation callback", async () => {
  const router = await renderRecovery(<RootRouteNotFound />);
  fireEvent.click(
    screen.getByRole("button", {
      name: "common.routeErrors.actions.goToDashboard",
    }),
  );
  await waitFor(() => expect(router.state.location.pathname).toBe("/@me"));
});

it.each([
  { status: 401, label: "goToSignIn", destination: "/signin" },
  { status: 503, label: "goToDashboard", destination: "/@me" },
])(
  "offers a usable exit after HTTP $status",
  async ({ status, label, destination }) => {
    const error = Object.assign(new Error("Upstream request failed"), {
      status,
    });

    const router = await renderRecovery(
      <RootRouteError error={error} reset={() => undefined} />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: `common.routeErrors.actions.${label}`,
      }),
    );
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(destination),
    );
  },
);
