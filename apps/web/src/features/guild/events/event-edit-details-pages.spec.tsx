// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { getShowEventOverviewQueryKey } from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { createEventOverview } from "@/lib/testing/event";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { EventEditRulebookPage } from "./event-edit-rulebook-page";
import { EventEditSettingsPage } from "./event-edit-settings-page";

await initializeTestTranslations();

afterEach(cleanup);

const pages = {
  settings: {
    component: EventEditSettingsPage,
    field: () => screen.findByLabelText("events.settings.nameLabel"),
    key: "name",
  },
  rulebook: {
    component: EventEditRulebookPage,
    field: () => screen.findByRole("textbox"),
    key: "rulebookMarkdown",
  },
} as const;

// The form takes its values from the event after mounting and resets again
// after each save; a reset that unregisters the fields leaves edits unsaveable.
it.each(["settings", "rulebook"] as const)(
  "saves consecutive edits on the %s page",
  async (pageName) => {
    const page = pages[pageName];
    const requests: Request[] = [];

    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Infinity } },
    });

    const event = createEventOverview({ name: "Wakacje 2026" });

    client.setQueryData(
      getShowEventOverviewQueryKey({ guildId: "guild-1", eventId: "event-1" }),
      event,
    );
    onTestFinished(() => client.clear());
    onTestFinished(
      configureApiClients({
        main: {
          baseUrl: "https://api.test",
          fetch: async (input, init) => {
            const request = new Request(input, init);

            if (request.method !== "GET") requests.push(request);

            return Response.json(event);
          },
        },
      }),
    );

    const root = createRootRoute();

    const router = createRouter({
      routeTree: root.addChildren([
        createRoute({
          getParentRoute: () => root,
          path: "/$guildId/events/$eventId/edit/page",
          component: page.component,
        }),
      ]),
      history: createMemoryHistory({
        initialEntries: ["/guild-1/events/event-1/edit/page"],
      }),
    });

    await router.load();
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );

    for (const [index, value] of ["Zima 2026", "Lato 2027"].entries()) {
      fireEvent.change(await page.field(), { target: { value } });
      fireEvent.click(
        await screen.findByRole("button", { name: /common.save/ }),
      );
      await expect.poll(() => requests.length).toBe(index + 1);
      expect(await requests[index]?.json()).toEqual(
        expect.objectContaining({ [page.key]: value }),
      );
    }
  },
);
