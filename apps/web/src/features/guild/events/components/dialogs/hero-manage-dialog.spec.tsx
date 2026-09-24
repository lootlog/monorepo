// @vitest-environment happy-dom

import { initializeTestTranslations } from "@/lib/testing/i18n";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { HeroManageDialog } from "./hero-manage-dialog";

await initializeTestTranslations();

afterEach(cleanup);

it("preserves hero edits across query refreshes and initializes new editing sessions", async () => {
  const client = new QueryClient();
  const onOpenChange = vi.fn();
  const requests: Request[] = [];
  const hero = { id: "hero-1", npcId: 1, npcName: "Heros" };

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          requests.push(new Request(input, init));

          return Response.json({});
        },
      },
    }),
  );

  const dialog = (open: boolean, currentHero: typeof hero) => (
    <QueryClientProvider client={client}>
      {open && (
        <HeroManageDialog
          key={currentHero.id}
          open={open}
          onOpenChange={onOpenChange}
          guildId="guild-1"
          eventId="event-1"
          hero={currentHero}
        />
      )}
    </QueryClientProvider>
  );

  const view = render(dialog(true, hero));
  fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "42" } });
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Corrected hero" },
  });

  const refreshedHero = { ...hero, npcName: "Updated server name" };
  view.rerender(dialog(true, refreshedHero));
  expect(screen.getByRole("spinbutton")).toHaveProperty("value", "42");
  expect(screen.getByRole("textbox")).toHaveProperty("value", "Corrected hero");
  fireEvent.click(screen.getByRole("button", { name: "common.save" }));
  await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));

  expect(requests).toHaveLength(1);
  const request = requests[0];

  if (!request) throw new Error("Expected a hero update request");
  expect(new URL(request.url).pathname).toBe(
    "/guilds/guild-1/events/event-1/heroes/hero-1",
  );
  expect(await request.json()).toEqual({
    npcId: 42,
    npcName: "Corrected hero",
  });

  view.rerender(dialog(false, refreshedHero));
  view.rerender(dialog(true, refreshedHero));
  await waitFor(() => {
    expect(screen.getByRole("spinbutton")).toHaveProperty("value", "1");
    expect(screen.getByRole("textbox")).toHaveProperty(
      "value",
      "Updated server name",
    );
  });

  view.rerender(
    dialog(true, { id: "hero-2", npcId: 2, npcName: "Other hero" }),
  );
  await waitFor(() => {
    expect(screen.getByRole("spinbutton")).toHaveProperty("value", "2");
    expect(screen.getByRole("textbox")).toHaveProperty("value", "Other hero");
  });
});
