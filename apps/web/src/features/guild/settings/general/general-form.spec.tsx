import { configureApiClients } from "@lootlog/client/transport";
import type { GuildResponseDtoOutput } from "@lootlog/client/main";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
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
import { Toaster, toast } from "sonner";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { GeneralForm } from "./general-form";

await initializeTestTranslations();

afterEach(() => {
  toast.dismiss();
  cleanup();
  vi.restoreAllMocks();
});

const guildFixture = {
  id: "guild-1",
  name: "Guild",
  ownerId: "owner",
  publicStatsCardEnabled: false,
  reservationMaxDurationMinutes: 120,
  reservationMinDurationMinutes: 5,
  reservationTimeGranularityMinutes: 5,
  reservationMaxAdvanceDays: 7,
  reservationActiveLimitPerSpot: 1,
} satisfies GuildResponseDtoOutput;

const renderForm = async (
  save: (init?: RequestInit) => Promise<Response>,
  vanityUrl = "",
  savedGuild?: GuildResponseDtoOutput,
) => {
  let guild: GuildResponseDtoOutput = { ...guildFixture, vanityUrl };

  const restoreClient = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: async (_input, init) => {
        if (init?.method === "PATCH") {
          const response = await save(init);

          if (response.ok && savedGuild) guild = savedGuild;

          return response;
        }

        return Response.json(guild);
      },
    },
  });

  onTestFinished(restoreClient);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => queryClient.clear());
  const root = createRootRoute();

  const settings = createRoute({
    getParentRoute: () => root,
    path: "$guildId/settings",
    component: GeneralForm,
  });

  const router = createRouter({
    routeTree: root.addChildren([settings]),
    history: createMemoryHistory({
      initialEntries: [`/${vanityUrl || guildFixture.id}/settings`],
    }),
    defaultPendingMinMs: 0,
  });

  await router.load();

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster />
    </QueryClientProvider>,
  );

  const textbox = await screen.findByRole<HTMLInputElement>("textbox");
  await waitFor(() => expect(queryClient.isFetching()).toBe(0));
  await waitFor(() => expect(textbox.value).toBe(vanityUrl));

  return { textbox, router };
};

const submitForm = async () => {
  const saveButton = await screen.findByRole<HTMLButtonElement>("button", {
    name: "common.save",
  });

  fireEvent.click(saveButton);

  return saveButton;
};

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

  const { textbox } = await renderForm(save);

  fireEvent.change(textbox, {
    target: { value: "new-name" },
  });

  const saveButton = await submitForm();
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
});

it.each(["50", "2024", "---", "Battles", "battles!"])(
  "blocks the invalid vanity URL %s with an accessible field error before sending a request",
  async (vanityUrl) => {
    const save = vi.fn(() => new Promise<Response>(() => undefined));
    await renderForm(save);

    const textbox = screen.getByRole("textbox", {
      name: "settings.general.vanityUrl.title",
    });

    fireEvent.change(textbox, { target: { value: vanityUrl } });

    await submitForm();

    const error = await screen.findByRole("alert");

    expect(textbox.getAttribute("aria-invalid")).toBe("true");
    expect(textbox.getAttribute("aria-describedby")?.split(" ")).toContain(
      error.id,
    );
    expect(error.textContent?.trim()).not.toBe("");
    expect(save).not.toHaveBeenCalled();
  },
);

it.each(["moj-klan", "klan123", "me"])(
  "submits the valid vanity URL %s",
  async (vanityUrl) => {
    const savedGuild = { ...guildFixture, vanityUrl };

    const save = vi.fn((_init?: RequestInit) =>
      Promise.resolve(Response.json(savedGuild)),
    );

    const { textbox, router } = await renderForm(save, "", savedGuild);

    fireEvent.change(textbox, { target: { value: vanityUrl } });

    await submitForm();

    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const request = new Request("https://api.test", save.mock.calls[0]?.[0]);

    expect(await request.json()).toEqual({
      vanityUrl,
      publicStatsCardEnabled: false,
    });
    expect(screen.queryByRole("alert")).toBeNull();
    await waitFor(() =>
      expect(router.state.location.pathname).toBe(`/${vanityUrl}/settings`),
    );
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "common.save" })).toBeNull(),
    );
    expect(textbox.value).toBe(vanityUrl);
  },
);

it("allows correcting an invalid vanity URL and submitting it", async () => {
  const save = vi.fn(
    (_init?: RequestInit) => new Promise<Response>(() => undefined),
  );

  const { textbox } = await renderForm(save);

  fireEvent.change(textbox, { target: { value: "50" } });
  await submitForm();
  await screen.findByRole("alert");
  expect(save).not.toHaveBeenCalled();

  fireEvent.change(textbox, { target: { value: "moj-klan" } });
  await submitForm();

  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const request = new Request("https://api.test", save.mock.calls[0]?.[0]);

  expect(await request.json()).toEqual({
    vanityUrl: "moj-klan",
    publicStatsCardEnabled: false,
  });
  expect(screen.queryByRole("alert")).toBeNull();
});

it("sends null when clearing an existing vanity URL", async () => {
  const savedGuild = { ...guildFixture, vanityUrl: null };

  const save = vi.fn((_init?: RequestInit) =>
    Promise.resolve(Response.json(savedGuild)),
  );

  const { textbox, router } = await renderForm(save, "old-name", savedGuild);

  fireEvent.change(textbox, { target: { value: "" } });

  await submitForm();

  await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  const request = new Request("https://api.test", save.mock.calls[0]?.[0]);

  expect(await request.json()).toEqual({
    vanityUrl: null,
    publicStatsCardEnabled: false,
  });
  expect(screen.queryByRole("alert")).toBeNull();
  await waitFor(() =>
    expect(router.state.location.pathname).toBe("/guild-1/settings"),
  );
  await waitFor(() =>
    expect(screen.queryByRole("button", { name: "common.save" })).toBeNull(),
  );
  expect(textbox.value).toBe("");
});

it("shows the API error for an unavailable vanity URL and lets the user retry", async () => {
  const save = vi
    .fn((_init?: RequestInit) => new Promise<Response>(() => undefined))
    .mockResolvedValueOnce(
      Response.json(
        { message: "errors.guilds.vanityUrlTaken" },
        { status: 409 },
      ),
    );

  const { textbox } = await renderForm(save);

  fireEvent.change(textbox, { target: { value: "taken-name" } });
  const saveButton = await submitForm();

  await screen.findByText("settings.general.vanityUrl.taken");
  await waitFor(() => expect(saveButton.disabled).toBe(false));
  expect(textbox.value).toBe("taken-name");

  fireEvent.change(textbox, { target: { value: "available-name" } });
  await submitForm();

  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  const request = new Request("https://api.test", save.mock.calls[1]?.[0]);

  expect(await request.json()).toEqual({
    vanityUrl: "available-name",
    publicStatsCardEnabled: false,
  });
});
