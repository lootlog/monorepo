// @vitest-environment happy-dom

import {
  getUserThemesControllerGetThemesQueryKey,
  getUsersControllerGetUserPreferencesQueryKey,
  type UserThemeResponseDto,
} from "@lootlog/client/main";
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
import { THEME_STORAGE_KEY } from "@lootlog/ui/themes/catalog";
import { ThemeProvider } from "./theme-provider";

await initializeTestTranslations();

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

const signedInSession = {
  data: {
    user: {
      id: "user-1",
      discordId: "discord-1",
      name: "Member",
      email: "member@example.test",
      emailVerified: true,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
    session: {
      id: "session-1",
      userId: "user-1",
      token: "fixture-token",
      expiresAt: new Date("2099-01-01"),
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  },
  error: null,
};

const setup = ({
  theme = "default",
  userThemes,
}: { theme?: string; userThemes?: UserThemeResponseDto[] } = {}) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  onTestFinished(() => client.clear());
  client.setQueryData(
    sessionQueryOptions.queryKey,
    userThemes ? signedInSession : { data: null, error: null },
  );
  client.setQueryData(
    getUsersControllerGetUserPreferencesQueryKey(),
    createUserPreferences({ theme }),
  );

  if (userThemes) {
    client.setQueryData(getUserThemesControllerGetThemesQueryKey(), userThemes);
  }

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

const greenRias: UserThemeResponseDto = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Zielona Rias",
  definition: {
    baseThemeId: "rias",
    accent: "#3FB950",
    overrides: {},
    wallpaper: "base",
    font: "inter",
    radius: "pill",
  },
  shareToken: null,
  createdAt: "2026-10-15T00:00:00.000Z",
  updatedAt: "2026-10-15T00:00:00.000Z",
};

const rootStyle = (property: string) =>
  document.documentElement.style.getPropertyValue(property);

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

it("applies the selected custom theme over its base theme", async () => {
  const { result } = setup({
    theme: `custom:${greenRias.id}`,
    userThemes: [greenRias],
  });

  // Rias's own touches, such as its wallpaper and cursor, keep working.
  expect(result.current.theme).toBe("rias");
  expect(result.current.customTheme?.id).toBe(greenRias.id);
  expect(document.documentElement.classList.contains("rias")).toBe(true);
  expect(rootStyle("--primary")).toBe("#3FB950");
  expect(rootStyle("--control-radius")).toBe("9999px");
});

it("falls back to the default theme once the selected custom theme is gone", async () => {
  const { result } = setup({
    theme: `custom:${greenRias.id}`,
    userThemes: [],
  });

  expect(result.current.theme).toBe("default");
  expect(result.current.customTheme).toBeNull();
  expect(rootStyle("--primary")).toBe("");
});

it("previews an unsaved definition and returns to the saved theme", async () => {
  const { result } = setup({ theme: "muted", userThemes: [] });

  await act(async () =>
    result.current.setPreview({
      ...greenRias.definition,
      baseThemeId: "cyberpunk",
      accent: "#FF4D4F",
    }),
  );
  expect(document.documentElement.classList.contains("cyberpunk")).toBe(true);
  expect(rootStyle("--primary")).toBe("#FF4D4F");

  await act(async () => result.current.setPreview(null));
  expect(document.documentElement.classList.contains("muted")).toBe(true);
  expect(rootStyle("--primary")).toBe("");
});

it("gives a built-in theme its own font and rounding", async () => {
  setup({ theme: "cyberpunk", userThemes: [] });

  expect(document.documentElement.classList.contains("cyberpunk")).toBe(true);
  expect(rootStyle("--font-sans")).toContain("Space Grotesk Variable");
  expect(rootStyle("--radius")).toBe("0rem");
  // A built-in theme keeps its stylesheet colours.
  expect(rootStyle("--primary")).toBe("");
});
