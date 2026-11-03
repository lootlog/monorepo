// @vitest-environment happy-dom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { getLootsControllerFetchLootByIdQueryKey } from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { afterEach, expect, it, vi } from "vitest";
import "@/i18n/config";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import type { Loot } from "@/lib/loots/loot-types";
import { createLoot } from "@/lib/testing/loot";
import { LootLikeButton } from "./loot-like-button";

afterEach(cleanup);

const lootKey = getLootsControllerFetchLootByIdQueryKey({
  guildId: "guild-1",
  lootId: 1,
});

const other = { id: 7, name: "Tytan", avatar: null, userId: "other" };

const me = { id: 3, name: "Kamil", avatar: null, userId: "me" };

const likesResponse = (likes: Loot["likes"]) =>
  new Response(JSON.stringify({ likes }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const CachedLoot = () => {
  const { data } = useQuery<Loot>({
    queryKey: lootKey,
    queryFn: () => Promise.reject(new Error("Unexpected loot read")),
    enabled: false,
  });

  return data ? <LootLikeButton loot={data} /> : null;
};

const renderButton = (fetch: typeof globalThis.fetch) => {
  const restore = configureApiClients({
    main: { baseUrl: "http://api.test", fetch },
  });

  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });

  // SAFETY: the like button reads only the user's name, image and discordId.
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: {
      user: { id: "user-1", name: "Kamil", image: null, discordId: "me" },
    },
  } as never);
  client.setQueryData<Loot>(lootKey, { ...createLoot(1), likes: [other] });

  const root = createRootRoute();

  const route = createRoute({
    getParentRoute: () => root,
    path: "$guildId",
    component: CachedLoot,
  });

  const router = createRouter({
    routeTree: root.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ["/guild-1"] }),
  });

  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return {
    client,
    dispose: () => {
      cleanup();
      client.clear();
      restore();
    },
  };
};

const heart = () => screen.findByRole("button", { name: /^Polub/ });

it("sends a quick like and unlike in order and ends with the last answer", async () => {
  const answers: Array<(response: Response) => void> = [];

  const fetch = vi.fn(
    (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Promise<Response>((resolve) => answers.push(resolve)),
  );

  const { client, dispose } = renderButton(fetch);

  try {
    fireEvent.click(await heart());
    expect((await heart()).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(await heart());
    expect((await heart()).getAttribute("aria-pressed")).toBe("false");

    // The unlike waits for the like, so the server applies them in order.
    await waitFor(() => expect(fetch).toHaveBeenCalledOnce());
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("PUT");

    // An earlier answer must not flip the heart back while the unlike is pending.
    answers[0]?.(likesResponse([other, me]));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect((await heart()).getAttribute("aria-pressed")).toBe("false");

    answers[1]?.(likesResponse([other]));
    await waitFor(() =>
      expect(client.getQueryData<Loot>(lootKey)?.likes).toEqual([other]),
    );
    expect((await heart()).getAttribute("aria-pressed")).toBe("false");
  } finally {
    dispose();
  }
});

it("restores the likes when the server rejects a like", async () => {
  const fetch = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(JSON.stringify({ message: "unavailable" }), { status: 503 }),
  );

  const { client, dispose } = renderButton(fetch);

  try {
    fireEvent.click(await heart());
    expect(client.getQueryData<Loot>(lootKey)?.likes).toHaveLength(2);

    await waitFor(() =>
      expect(client.getQueryData<Loot>(lootKey)?.likes).toEqual([other]),
    );
    expect((await heart()).getAttribute("aria-pressed")).toBe("false");
  } finally {
    dispose();
  }
});
