// @vitest-environment happy-dom
import { createBattle } from "@/lib/testing/battle";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { afterEach, expect, it, vi, onTestFinished } from "vitest";
import { configureApiClients } from "@lootlog/client/transport";
import {
  RouterProvider,
  createRouter,
  createRootRoute,
  createRoute,
  createMemoryHistory,
} from "@tanstack/react-router";
import { ROUTES } from "@/config/routes";
import { BattlePanelSingleBattleActions } from "./battle-panel-single-battle-actions";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it("keeps a failed battle deletion open for retry and navigates only after success", async () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValueOnce(Response.json({}, { status: 500 }))
    .mockResolvedValueOnce(Response.json({}));

  onTestFinished(
    configureApiClients({
      battlelog: { baseUrl: "https://battlelog.test", fetch },
    }),
  );
  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "/guild-1",
    component: () => <BattlePanelSingleBattleActions battle={createBattle()} />,
  });

  const destination = createRoute({
    getParentRoute: () => root,
    path: ROUTES.user.battlePanel.base,
    component: () => null,
  });

  const router = createRouter({
    routeTree: root.addChildren([route, destination]),
    history: createMemoryHistory({ initialEntries: ["/guild-1"] }),
  });

  await router.load();
  const i18n = await initializeTestTranslations();
  render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={new QueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>,
  );

  fireEvent.click(
    screen.getByRole("button", { name: "battlePanel.actions.delete" }),
  );
  fireEvent.click(
    screen.getByRole("button", {
      name: "battlePanel.dialogs.deleteBattle.confirm",
    }),
  );
  await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
  await waitFor(() =>
    expect(
      screen
        .getByRole("button", {
          name: "battlePanel.dialogs.deleteBattle.confirm",
        })
        .hasAttribute("disabled"),
    ).toBe(false),
  );
  expect(screen.getByRole("alertdialog")).toBeTruthy();
  expect(router.state.location.pathname).toBe("/guild-1");

  fireEvent.click(
    screen.getByRole("button", {
      name: "battlePanel.dialogs.deleteBattle.confirm",
    }),
  );
  await waitFor(() =>
    expect(router.state.location.pathname).toBe(ROUTES.user.battlePanel.base),
  );
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(String(fetch.mock.calls[1]?.[0])).toBe(
    "https://battlelog.test/battles/battle-1",
  );
  expect(fetch.mock.calls[1]?.[1]?.method).toBe("DELETE");
});
