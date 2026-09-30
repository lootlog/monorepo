// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { DEFAULT_ADVANCED_EVENT_SCORING_RULES } from "@lootlog/domain/scoring";
import { getShowEventOverviewQueryKey } from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { createEventOverview } from "@/lib/testing/event";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { EventCreateDialog } from "./components/dialogs/event-create-dialog";
import { EventEditScoringPage } from "./event-edit-scoring-page";

await initializeTestTranslations();

afterEach(cleanup);

async function renderScoringForm(mode: "create" | "edit") {
  const requests: Request[] = [];

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  const event = createEventOverview({
    scoringMode: "ADVANCED",
    scoringRules: DEFAULT_ADVANCED_EVENT_SCORING_RULES,
  });

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

  const createRouteDefinition = createRoute({
    getParentRoute: () => root,
    path: "/$guildId/events",
    component: () => <EventCreateDialog open onOpenChange={() => {}} />,
  });

  const editRouteDefinition = createRoute({
    getParentRoute: () => root,
    path: "/$guildId/events/$eventId/edit/scoring",
    component: EventEditScoringPage,
  });

  const detailRouteDefinition = createRoute({
    getParentRoute: () => root,
    path: "/$guildId/events/$eventId",
    component: () => null,
  });

  const router = createRouter({
    routeTree: root.addChildren([
      createRouteDefinition,
      editRouteDefinition,
      detailRouteDefinition,
    ]),
    history: createMemoryHistory({
      initialEntries: [
        mode === "create"
          ? "/guild-1/events"
          : "/guild-1/events/event-1/edit/scoring",
      ],
    }),
  });

  await router.load();
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return requests;
}

it.each(["create", "edit"] as const)(
  "blocks the %s request until an emptied scoring condition is corrected",
  async (mode) => {
    const requests = await renderScoringForm(mode);

    if (mode === "create") {
      fireEvent.click(
        await screen.findByRole("radio", {
          name: /events.scoring.modeAdvancedTitle/,
        }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Dalej" }));
      fireEvent.change(
        screen.getByPlaceholderText("events.createDialog.namePlaceholder"),
        { target: { value: "Event" } },
      );
      fireEvent.change(
        screen.getByPlaceholderText("events.createDialog.worldPlaceholder"),
        { target: { value: "Fobos" } },
      );
    }

    fireEvent.click(await screen.findByRole("button", { name: /Base 25%/ }));

    const threshold = screen.getByRole("spinbutton", {
      name: "events.scoring.fieldLabel.conditionValue",
    });

    fireEvent.change(threshold, { target: { value: "" } });

    const saveButton = screen.getByRole("button", {
      name: mode === "create" ? "events.createDialog.create" : "common.save",
    });

    const submit = () => {
      if (mode === "create") {
        fireEvent.click(saveButton);

        return;
      }

      const parentForm = saveButton.closest("form");

      if (!parentForm) throw new Error("Expected the scoring form");

      fireEvent.submit(parentForm);
    };

    submit();
    await screen.findByText("events.scoring.validation.invalidRules");
    expect(document.activeElement).toBe(threshold);
    expect(requests).toHaveLength(0);

    fireEvent.change(threshold, { target: { value: "30" } });
    submit();
    await waitFor(() => expect(requests).toHaveLength(1));

    const request = requests[0];

    if (!request) throw new Error("Expected the scoring mutation");

    expect(request.method).toBe(mode === "create" ? "POST" : "PATCH");
    expect(await request.json()).toEqual(
      expect.objectContaining({
        scoringMode: "ADVANCED",
        scoringRules: {
          ...DEFAULT_ADVANCED_EVENT_SCORING_RULES,
          rules: DEFAULT_ADVANCED_EVENT_SCORING_RULES.rules.map((rule) =>
            rule.id === "base-25"
              ? {
                  ...rule,
                  conditions: [
                    {
                      type: "NUMERIC",
                      factor: "trackingDurationPercentage",
                      operator: ">=",
                      value: 30,
                    },
                  ],
                }
              : rule,
          ),
        },
      }),
    );
  },
);
