// @vitest-environment happy-dom
import type {
  FactionWarDisqualificationDto,
  FactionWarLeaderboardEntryDto,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, onTestFinished } from "vitest";
import { loadAuthenticatedTranslations } from "@/i18n/config";
import type { FactionWar } from "./faction-war-queries";
import { FactionWarRankingResults } from "./faction-war-ranking-results";

await loadAuthenticatedTranslations();

const WAR_ID = "war-1";

const war = (isAdmin: boolean): FactionWar => ({
  id: WAR_ID,
  status: "RUNNING",
  startsAt: "2026-10-19T22:00:00.000Z",
  endsAt: "2026-11-16T23:00:00.000Z",
  scoring: {
    killPoints: {},
    lootPoints: {},
    onlineSecondsPerPoint: 600,
    pvpWinPoints: 5,
    underdogBonusCap: 2,
    dailyCaps: { KILL: 300, LOOT: 150, ONLINE: 30, PVP: 50 },
  },
  totals: [],
  winners: [],
  days: [],
  pick: null,
  champion: null,
  isAdmin,
});

const entry = (
  rank: number,
  characterName: string,
  userId: string | null,
): FactionWarLeaderboardEntryDto => ({
  rank,
  characterName,
  world: "tempest",
  points: 1000 - rank,
  isMe: false,
  userId,
});

const disqualified: FactionWarDisqualificationDto = {
  userId: "user-9",
  faction: "BARBATOS",
  characterName: "Botownik",
  world: "tempest",
  disqualifiedAt: "2026-10-21T10:00:00.000Z",
  reason: "Bot",
};

afterEach(cleanup);

const mount = ({
  isAdmin,
  entries,
}: {
  isAdmin: boolean;
  entries: FactionWarLeaderboardEntryDto[];
}) => {
  const writes: { method: string; url: string; body: unknown }[] = [];

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  onTestFinished(() => client.clear());
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          const url = String(input);
          const method = init?.method ?? "GET";

          if (method !== "GET") {
            writes.push({
              method,
              url,
              body: init?.body ? JSON.parse(String(init.body)) : undefined,
            });

            return Response.json([]);
          }

          if (url.includes("/disqualifications")) {
            return Response.json([disqualified]);
          }

          return Response.json({ faction: "BARBATOS", entries });
        },
      },
    }),
  );

  render(
    <QueryClientProvider client={client}>
      <FactionWarRankingResults war={war(isAdmin)} />
    </QueryClientProvider>,
  );

  return { writes };
};

const openDisqualifyDialog = async (name: string) => {
  fireEvent.click(
    await screen.findByRole("button", { name: `Akcje dla gracza ${name}` }),
  );
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Wyklucz z wojny" }),
  );

  return screen.findByRole("dialog");
};

it("offers moderation only to war admins, on other players' rows the server named an account for", async () => {
  mount({
    isAdmin: false,
    entries: [entry(1, "Aurelia", null)],
  });
  await screen.findByText("Aurelia");

  expect(screen.queryByRole("button", { name: /Akcje dla gracza/ })).toBeNull();
  expect(screen.queryByRole("heading", { name: /Wykluczeni/ })).toBeNull();

  cleanup();

  mount({
    isAdmin: true,
    entries: [
      entry(1, "Aurelia", "user-1"),
      entry(2, "Borgin", null),
      { ...entry(3, "Kamyk", "user-me"), isMe: true },
    ],
  });
  await screen.findByText("Borgin");

  expect(
    screen.getByRole("button", { name: "Akcje dla gracza Aurelia" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "Akcje dla gracza Borgin" }),
  ).toBeNull();
  expect(
    screen.queryByRole("button", { name: "Akcje dla gracza Kamyk" }),
  ).toBeNull();
  expect(await screen.findByText("Botownik")).toBeTruthy();
});

it("disqualifies a player only once the admin gives a reason", async () => {
  const { writes } = mount({
    isAdmin: true,
    entries: [entry(1, "Aurelia", "user-1")],
  });

  const dialog = await openDisqualifyDialog("Aurelia");

  const submit = within(dialog).getByRole("button", {
    name: "Wyklucz z wojny",
  });

  const reason = within(dialog).getByRole("textbox", { name: "Powód" });

  fireEvent.change(reason, { target: { value: "   " } });
  fireEvent.click(submit);

  expect(submit.hasAttribute("disabled")).toBe(true);
  expect(writes).toEqual([]);

  fireEvent.change(reason, { target: { value: "  Bot na expowisku " } });
  fireEvent.click(submit);

  await waitFor(() =>
    expect(writes).toEqual([
      {
        method: "PUT",
        url: `https://api.test/faction-wars/${WAR_ID}/disqualifications/user-1`,
        body: { reason: "Bot na expowisku" },
      },
    ]),
  );
});

it("restores the confirmed player through the DELETE endpoint", async () => {
  const { writes } = mount({
    isAdmin: true,
    entries: [entry(1, "Aurelia", "user-1")],
  });

  fireEvent.click(
    await screen.findByRole("button", { name: "Przywróć: Botownik" }),
  );
  const dialog = await screen.findByRole("alertdialog");
  fireEvent.click(within(dialog).getByRole("button", { name: "Przywróć" }));

  await waitFor(() =>
    expect(writes).toEqual([
      {
        method: "DELETE",
        url: `https://api.test/faction-wars/${WAR_ID}/disqualifications/user-9`,
        body: undefined,
      },
    ]),
  );
});
