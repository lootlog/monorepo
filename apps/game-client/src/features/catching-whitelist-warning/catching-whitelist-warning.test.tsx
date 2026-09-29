import { act, render, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configureGameClientPlatform,
  createGameRealtimeClient,
} from "@/lib/game-client-platform";
import { queryClient } from "@/lib/query-client";
import { storageKey } from "@/lib/storage-key";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useWindowsStore } from "@/store/windows.store";
import { CatchingWhitelistWarning } from "./catching-whitelist-warning";

const CHECKLIST_DISMISSED_KEY = storageKey("ll:setup-checklist-dismissed");

const MEMBER_GUILD = {
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

const restores: Array<() => void> = [];

/** A signed-in player whose character has no catching scope yet. */
const serve = ({ guilds }: { guilds: (typeof MEMBER_GUILD)[] }) => {
  const requested: string[] = [];

  const http: typeof fetch = async (input, init) => {
    const path = decodeURIComponent(
      new URL(new Request(input, init).url).pathname,
    );

    requested.push(path);

    if (path.endsWith("/get-session")) return Response.json(SESSION);

    if (path === "/users/@me/guilds/accessible") return Response.json(guilds);

    if (path === "/users/@me/preferences")
      return Response.json({
        userId: "user",
        guildsOrder: guilds.map((guild) => guild.id),
        hiddenGuildIds: [],
      });

    if (path === "/users/@me/lootlog-config/accounts/202")
      return Response.json({});

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

  return requested;
};

const isWarningOpen = () =>
  useWindowsStore.getState()["catching-whitelist-warning"].open;

const renderWarning = () =>
  render(
    <QueryClientProvider client={queryClient}>
      <CatchingWhitelistWarning />
    </QueryClientProvider>,
  );

describe("CatchingWhitelistWarning", () => {
  beforeEach(() => {
    window.localStorage.clear();
    queryClient.clear();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    setTestRuntimeGame({ hero: { accountId: "202", characterId: "101" } });
    useWindowsStore.setState((state) => ({
      ...state,
      "catching-whitelist-warning": {
        ...state["catching-whitelist-warning"],
        open: false,
      },
      "backend-preferences-warning": {
        ...state["backend-preferences-warning"],
        open: false,
      },
    }));
  });

  afterEach(() => {
    for (const restore of restores.splice(0)) restore();
  });

  it("reminds a member who dismissed the checklist, after any other notice closes", async () => {
    window.localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    useWindowsStore.getState().setOpen("backend-preferences-warning", true);
    const requested = serve({ guilds: [MEMBER_GUILD] });
    renderWarning();

    await waitFor(() =>
      expect(requested).toContain("/users/@me/lootlog-config/accounts/202"),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(isWarningOpen()).toBe(false);

    act(() =>
      useWindowsStore.getState().setOpen("backend-preferences-warning", false),
    );
    await waitFor(() => expect(isWarningOpen()).toBe(true));
  });

  it("stays closed for a player without any Lootlog", async () => {
    window.localStorage.setItem(CHECKLIST_DISMISSED_KEY, "true");
    const requested = serve({ guilds: [] });
    renderWarning();

    await waitFor(() =>
      expect(requested).toContain("/users/@me/guilds/accessible"),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(isWarningOpen()).toBe(false);
  });

  it("leaves the missing scope to the first-run checklist while it is shown", async () => {
    const requested = serve({ guilds: [MEMBER_GUILD] });
    renderWarning();

    await waitFor(() =>
      expect(requested).toContain("/users/@me/lootlog-config/accounts/202"),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(isWarningOpen()).toBe(false);
  });
});
