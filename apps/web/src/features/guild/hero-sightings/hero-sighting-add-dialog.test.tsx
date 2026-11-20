// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { createOrganizationTestWrapper } from "@/lib/testing/router";
import { HeroSightingAddDialog } from "./hero-sighting-add-dialog";
import "@/i18n/config";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const mount = async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({ main: { baseUrl: "https://api.test" } }),
  );
  localStorage.setItem("lootlog:guild:guild-1:world", JSON.stringify("jaruna"));

  const requests: Array<{ url: string; body: unknown }> = [];

  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);

      requests.push({ url: request.url, body: await request.json() });

      return Response.json({ message: "Unavailable" }, { status: 503 });
    },
  );

  const Wrapper = await createOrganizationTestWrapper();

  render(
    <QueryClientProvider client={client}>
      <Wrapper>
        <HeroSightingAddDialog
          open
          onOpenChange={() => undefined}
          knownHeroes={[]}
        />
      </Wrapper>
    </QueryClientProvider>,
  );

  return { requests, hero: await screen.findByLabelText("Heros") };
};

it("adds the hero, state and map of a pasted detector answer on the page's world", async () => {
  const { requests, hero } = await mount();

  fireEvent.paste(hero, {
    clipboardData: {
      getData: () =>
        "[b]Tepeyollotl (258b)[/b] pojawi się w: Oztotl Tzacua p.2 - sala 2",
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "Dodaj" }));

  await waitFor(() => expect(requests).toHaveLength(1));
  expect(requests[0]).toEqual({
    url: "https://api.test/guilds/guild-1/hero-sightings",
    body: {
      world: "jaruna",
      hero: { name: "Tepeyollotl", lvl: 258, prof: "b" },
      state: "SPAWNING",
      mapName: "Oztotl Tzacua p.2 - sala 2",
    },
  });
});

it("sends nothing while the hero, its level or the map is missing", async () => {
  const { requests, hero } = await mount();

  fireEvent.change(hero, { target: { value: "Tepeyollotl" } });
  fireEvent.click(screen.getByRole("button", { name: "Dodaj" }));

  expect(await screen.findByText("Podaj nazwę mapy")).toBeTruthy();
  expect(requests).toEqual([]);
});
