import { configureApiClients } from "@lootlog/client/transport";
import type { GuildResponseDtoOutput } from "@lootlog/client/main";
import { RouterProvider } from "@tanstack/react-router";
import { createOrganizationTestRouter } from "@/lib/testing/router";
// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { GeneralForm } from "./general-form";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("keeps save busy for the network request and restores it after failure", async () => {
  let rejectSave = (_reason: Error): void => {
    throw new Error("Save has not started");
  };

  const save = vi.fn(
    () =>
      new Promise<Response>((_resolve, reject) => {
        rejectSave = reject;
      }),
  );

  const restoreClient = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: (_input, init) => {
        if (init?.method === "PATCH") return save();

        return Promise.resolve(
          Response.json({
            id: "guild-1",
            name: "Guild",
            ownerId: "owner",
            publicStatsCardEnabled: false,
            reservationMaxDurationMinutes: 120,
            reservationMinDurationMinutes: 5,
            reservationTimeGranularityMinutes: 5,
            reservationMaxAdvanceDays: 7,
            reservationActiveLimitPerSpot: 1,
          } satisfies GuildResponseDtoOutput),
        );
      },
    },
  });

  onTestFinished(restoreClient);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => queryClient.clear());
  const router = createOrganizationTestRouter(<GeneralForm />);
  await router.load();
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const textbox = await screen.findByRole("textbox");
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  fireEvent.change(textbox, {
    target: { value: "new-name" },
  });

  const saveButton = await screen.findByRole<HTMLButtonElement>("button", {
    name: "common.save",
  });

  fireEvent.click(saveButton);
  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(saveButton.disabled).toBe(true));
  expect(saveButton.getAttribute("aria-busy")).toBe("true");
  fireEvent.click(saveButton);
  const form = saveButton.closest("form");

  if (!form) throw new Error("Save button must belong to a form");
  fireEvent.submit(form);
  expect(save).toHaveBeenCalledTimes(1);
  rejectSave(new Error("Request failed"));
  await waitFor(() => expect(saveButton.disabled).toBe(false));
  expect(screen.getByRole("button", { name: "common.save" })).toBe(saveButton);
  queryClient.clear();
  restoreClient();
});
