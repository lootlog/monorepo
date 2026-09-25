// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import type { MapTemplateResponseDto } from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { MapTemplatesSettings } from "./map-templates";

await initializeTestTranslations({
  "settings.mapTemplates.editTemplate": "Edytuj {{name}}",
  "common.removeOption": "Usuń {{label}}",
});

afterEach(() => {
  toast.dismiss();
  cleanup();
});

const ithan = { id: 1, name: "Ithan" };

const torneg = { id: 2, name: "Torneg" };

const gameMaps = [ithan, torneg];

const createdTemplate = {
  id: "template-1",
  guildId: "guild-1",
  name: "Pierwszy szablon",
  maps: [ithan],
  createdAt: "2026-09-25T12:00:00.000Z",
} satisfies MapTemplateResponseDto;

const updatedTemplate = {
  ...createdTemplate,
  name: "Zmieniony szablon",
  maps: [torneg],
} satisfies MapTemplateResponseDto;

async function renderSettings(failFirstSave = false) {
  let templates: MapTemplateResponseDto[] = [];
  const saves: Request[] = [];

  const restoreClient = configureApiClients({
    main: {
      baseUrl: "https://api.test",
      fetch: async (input, init) => {
        const request = new Request(input, init);
        const { pathname } = new URL(request.url);

        if (request.method === "POST" || request.method === "PUT") {
          saves.push(request);

          if (failFirstSave && saves.length === 1) {
            return Response.json({ message: "Unavailable" }, { status: 503 });
          }

          const saved =
            request.method === "POST" ? createdTemplate : updatedTemplate;

          templates = [saved];

          return Response.json(saved);
        }

        if (pathname === "/maps") return Response.json(gameMaps);

        if (pathname === "/guilds/guild-1/map-templates") {
          return Response.json(templates);
        }

        throw new Error(`Unexpected request: ${request.method} ${pathname}`);
      },
    },
  });

  onTestFinished(restoreClient);

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => client.clear());
  const Wrapper = await createOrganizationTestWrapper();
  render(
    <Wrapper>
      <QueryClientProvider client={client}>
        <MapTemplatesSettings />
        <Toaster />
      </QueryClientProvider>
    </Wrapper>,
  );

  await screen.findByText("settings.mapTemplates.noTemplates");

  return saves;
}

async function openCreateDialog() {
  fireEvent.click(
    screen.getByRole("button", { name: "settings.mapTemplates.newTemplate" }),
  );
  await screen.findByRole("dialog", {
    name: "settings.mapTemplates.createDialog.title",
  });
  fireEvent.change(
    screen.getByRole("textbox", {
      name: "settings.mapTemplates.templateName",
    }),
    { target: { value: createdTemplate.name } },
  );
  fireEvent.click(await screen.findByRole("checkbox", { name: /Ithan/ }));
}

function saveTemplate() {
  fireEvent.click(
    screen.getByRole("button", {
      name: "settings.mapTemplates.saveTemplate",
    }),
  );
}

it("opens create and edit dialogs and refreshes the saved name and map selection", async () => {
  const saves = await renderSettings();
  await openCreateDialog();
  saveTemplate();

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByText(createdTemplate.name)).toBeTruthy();
  expect(saves[0]?.method).toBe("POST");
  expect(await saves[0]?.json()).toEqual({
    name: createdTemplate.name,
    maps: createdTemplate.maps,
  });

  fireEvent.click(
    screen.getByRole("button", { name: `Edytuj ${createdTemplate.name}` }),
  );
  await screen.findByRole("dialog", {
    name: "settings.mapTemplates.editDialog.title",
  });

  const name = screen.getByRole<HTMLInputElement>("textbox", {
    name: "settings.mapTemplates.templateName",
  });

  expect(name.value).toBe(createdTemplate.name);
  fireEvent.change(name, { target: { value: updatedTemplate.name } });
  fireEvent.click(screen.getByRole("button", { name: "Usuń Ithan" }));
  fireEvent.change(
    screen.getByRole("searchbox", {
      name: "settings.mapTemplates.searchAndAddMaps",
    }),
    { target: { value: "Torneg" } },
  );
  fireEvent.click(screen.getByRole("checkbox", { name: /Torneg/ }));
  saveTemplate();

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(screen.getByText(updatedTemplate.name)).toBeTruthy();
  expect(saves[1]?.method).toBe("PUT");
  expect(saves[1]?.url).toBe(
    "https://api.test/guilds/guild-1/map-templates/template-1",
  );
  expect(await saves[1]?.json()).toEqual({
    name: updatedTemplate.name,
    maps: updatedTemplate.maps,
  });
});

it("keeps the draft after a failed save and allows retrying", async () => {
  const saves = await renderSettings(true);
  await openCreateDialog();
  saveTemplate();

  await screen.findByText("settings.mapTemplates.toasts.createError");
  expect(screen.getByRole("dialog")).toBeTruthy();
  expect(
    screen.getByRole<HTMLInputElement>("textbox", {
      name: "settings.mapTemplates.templateName",
    }).value,
  ).toBe(createdTemplate.name);
  expect(screen.getByRole("button", { name: "Usuń Ithan" })).toBeTruthy();
  await waitFor(() =>
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "settings.mapTemplates.saveTemplate",
      }).disabled,
    ).toBe(false),
  );
  saveTemplate();

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(saves).toHaveLength(2);
  expect(await saves[1]?.json()).toEqual({
    name: createdTemplate.name,
    maps: createdTemplate.maps,
  });
  expect(screen.getByText(createdTemplate.name)).toBeTruthy();
});
