import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configureGameClientPlatform,
  createGameRealtimeClient,
} from "@/lib/game-client-platform";
import { queryClient } from "@/lib/query-client";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useSettingsSaveStatusStore } from "@/features/settings/persistence/settings-save-status.store";
import { CatchingSettings } from "./catching-settings";

const GUILD = {
  id: "guild-1",
  name: "Test guild",
  icon: null,
  ownerId: "discord-1",
  publicStatsCardEnabled: false,
  hasLootlogAccess: true,
  isAccessDataStale: false,
};

const SESSION = {
  user: {
    id: "user",
    discordId: "discord-1",
    name: "Tester",
    email: "member@example.test",
    emailVerified: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  session: {
    id: "session",
    userId: "user",
    expiresAt: "2099-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

const characterConfig = (characterId: string, catchingGuildIds: string[]) => ({
  id: Number(characterId),
  userId: "discord-1",
  accountId: "202",
  characterId,
  catchingGuildIds,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const restores: Array<() => void> = [];

/** Serves the catching tab; each character config write waits for `release`. */
const serve = () => {
  const pendingWrites: Array<() => void> = [];

  const http: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const path = decodeURIComponent(new URL(request.url).pathname);

    if (path.endsWith("/get-session")) return Response.json(SESSION);

    if (path === "/users/@me/guilds/accessible") return Response.json([GUILD]);

    if (path === "/users/@me/preferences")
      return Response.json({
        userId: "user",
        guildsOrder: [GUILD.id],
        hiddenGuildIds: [],
      });

    if (path === "/users/@me/lootlog-config/accounts/202") {
      if (request.method === "GET")
        return Response.json({
          "101": characterConfig("101", []),
          "102": characterConfig("102", []),
        });

      // SAFETY: the catching form writes one CreateOrUpdateLootlogCharacterConfigDto.
      const body = (await request.json()) as {
        characterId: string;
        catchingGuildIds: string[];
      };

      await new Promise<void>((resolve) => pendingWrites.push(resolve));

      return Response.json(
        characterConfig(body.characterId, body.catchingGuildIds),
      );
    }

    return new Response(null, { status: 404 });
  };

  restores.push(
    configureGameClientPlatform({
      fetch: http,
      createRealtime: createGameRealtimeClient,
    }),
    configureApiClients({
      main: { baseUrl: "https://api.example.test", fetch: http },
    }),
  );

  return {
    pendingWrites,
    release: () => {
      for (const resolve of pendingWrites.splice(0)) resolve();
    },
  };
};

const characterCard = (name: string) =>
  screen.getByRole("button", { name: new RegExp(`^${name} `) });

const isSaving = (card: HTMLElement) =>
  card.querySelector(".ll\\:animate-spin") !== null;

describe("CatchingSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
    queryClient.clear();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    useSettingsSaveStatusStore.setState({ status: "idle", keyMarks: {} });
    setTestRuntimeGame({ hero: { accountId: "202", characterId: "101" } });
    queryClient.setQueryData(
      ["characters-v2", 202, "luvia", "pl"],
      [
        { id: 101, nick: "Alpha", lvl: 100, prof: "w", icon: "a.gif" },
        { id: 102, nick: "Beta", lvl: 90, prof: "m", icon: "b.gif" },
      ],
    );
  });

  afterEach(() => {
    for (const restore of restores.splice(0)) restore();
  });

  it("resolves a character's saving badge after the player switched to another character", async () => {
    const { pendingWrites, release } = serve();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <CatchingSettings />
      </QueryClientProvider>,
    );

    await user.click(await screen.findByRole("button", { name: GUILD.name }));
    await waitFor(() => expect(pendingWrites).toHaveLength(1));
    expect(isSaving(characterCard("Alpha"))).toBe(true);

    // Switching remounts the form of the character whose save is in flight.
    await user.click(characterCard("Beta"));
    release();

    await waitFor(() => expect(isSaving(characterCard("Alpha"))).toBe(false));
  });
});
