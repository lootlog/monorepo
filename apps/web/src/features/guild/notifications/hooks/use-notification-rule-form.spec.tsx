// @vitest-environment happy-dom

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { configureApiClients } from "@lootlog/client/transport";
import { getNpcsControllerGetNpcsQueryKey } from "@lootlog/client/search";
import { afterEach, expect, it, vi } from "vitest";
import { useNotificationRuleForm } from "./use-notification-rule-form";

vi.mock("react-i18next", () => {
  const t = (key: string) => key;
  return { useTranslation: () => ({ t }) };
});
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({ guildId: "test-org" }),
  useSearch: () => ({}),
}));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("lets a recovered NPC search replace a failed selected-label lookup", async () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const restore = configureApiClients({
    main: { baseUrl: "https://api.test" },
    search: { baseUrl: "https://search.test" },
  });
  const npc = { id: 2, name: "Smok", type: "HERO" };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : input);
      if (url.pathname === "/npcs") {
        if (url.searchParams.get("search") === "smok") {
          return Response.json([npc]);
        }
        return Response.json(
          { _tag: "SearchUnavailable", message: "Search unavailable" },
          { status: 503 },
        );
      }
      if (url.pathname.endsWith("/rules")) {
        return Response.json({ items: [] });
      }
      return Response.json([]);
    }),
  );

  try {
    const { result } = renderHook(useNotificationRuleForm, {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.form.setValue("npcIds", ["1"]));
    await waitFor(() =>
      expect(result.current.npcSearchError).toBe("common.searchUnavailable"),
    );

    act(() => result.current.setNpcSearch("missing"));
    await waitFor(() =>
      expect(result.current.searchedNpcQuery.isError).toBe(true),
    );
    expect(result.current.npcSearchError).toBe("common.searchUnavailable");

    act(() => result.current.setNpcSearch("smok"));
    await waitFor(() =>
      expect(result.current.searchedNpcQuery.isSuccess).toBe(true),
    );
    expect(
      client.getQueryState(
        getNpcsControllerGetNpcsQueryKey({
          ids: [1],
          world: undefined,
        }),
      )?.status,
    ).toBe("error");
    expect(result.current.npcOptions).toEqual([
      { value: "2", label: "Smok npcType.HERO (#2)" },
    ]);
    expect(result.current.npcSearchError).toBeUndefined();

    act(() => result.current.setNpcSearch(""));
    expect(result.current.npcSearchError).toBe("common.searchUnavailable");
    act(() => result.current.handleManualNpcEntryChange(true));
    expect(result.current.npcSearchError).toBeUndefined();
    act(() => {
      result.current.handleManualNpcEntryChange(false);
      result.current.form.setValue("npcIds", []);
    });
    expect(result.current.npcSearchError).toBeUndefined();
  } finally {
    cleanup();
    client.clear();
    restore();
  }
});
