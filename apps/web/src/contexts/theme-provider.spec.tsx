// @vitest-environment happy-dom

import { getUsersControllerGetUserPreferencesQueryKey } from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, expect, it, onTestFinished, vi } from "vitest";
import { z } from "zod";
import { sessionQueryOptions } from "@/hooks/auth/use-session-query";
import { useTheme } from "@/hooks/context/use-theme";
import { initializeTestTranslations } from "@/lib/testing/i18n";
import { createUserPreferences } from "@/lib/testing/preferences";
import { THEME_STORAGE_KEY } from "@/themes/catalog";
import { ThemeProvider } from "./theme-provider";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

const setup = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(sessionQueryOptions.queryKey, {
    data: null,
    error: null,
  });
  client.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    createUserPreferences(),
  );

  return {
    client,
    ...renderHook(useTheme, {
      wrapper: ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryClientProvider>
      ),
    }),
  };
};

it("persists the last selected theme when an earlier save is delayed", async () => {
  let finishFirst: (() => void) | undefined;

  const firstSave = new Promise<void>((resolve) => {
    finishFirst = resolve;
  });

  let saved = createUserPreferences();
  const writes: string[] = [];
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async (input, init) => {
          const { theme } = z
            .object({ theme: z.string() })
            .parse(await new Request(input, init).json());

          writes.push(theme);

          if (theme === "cyberpunk") await firstSave;

          saved = { ...saved, theme };

          return Response.json(saved);
        },
      },
    }),
  );
  const { client, result } = setup();

  await act(async () => result.current.setTheme("cyberpunk"));
  await waitFor(() => expect(writes).toEqual(["cyberpunk"]));
  await act(async () => result.current.setTheme("pastel"));

  expect(result.current.theme).toBe("pastel");
  expect(writes).toEqual(["cyberpunk"]);

  await act(async () => finishFirst?.());
  await waitFor(() => expect(client.isMutating()).toBe(0));
  expect(saved.theme).toBe("pastel");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("pastel");
});

it("reports a failed account save while keeping the selected preview", async () => {
  const showError = vi.spyOn(toast, "error").mockReturnValue("theme-error");
  onTestFinished(
    configureApiClients({
      main: {
        baseUrl: "https://api.test",
        fetch: async () => Response.json({}, { status: 503 }),
      },
    }),
  );
  const { result } = setup();

  await act(async () => result.current.setTheme("pastel"));
  await waitFor(() =>
    expect(showError).toHaveBeenCalledWith("settings.appearance.saveError"),
  );
  expect(result.current.theme).toBe("pastel");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("pastel");
});
