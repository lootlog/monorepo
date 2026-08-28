// @vitest-environment happy-dom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultThemeLibrary } from "@lootlog/types";
import { PRESET_THEME_CONFIGS } from "@/themes/preset-configs";
import { clearThemeConfig, THEME_SNAPSHOT_STORAGE_KEY } from "@/themes/runtime";
import { ThemeContext, ThemeProvider } from "./theme-context";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
  setQueryData: vi.fn(),
  serverLibrary: null as unknown,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({ data: { user: { id: "user" } } }),
}));

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  getUsersControllerGetThemeLibraryQueryKey: () => ["theme-library"],
  useSetUsersControllerGetThemeLibraryQueryData: () => mocks.setQueryData,
  useUsersControllerGetThemeLibrary: () => ({
    data: mocks.serverLibrary,
    isLoading: false,
    refetch: mocks.refetch,
  }),
  useUsersControllerPatchThemeLibrary: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));

const ThemeProbe = () => (
  <ThemeContext.Consumer>
    {(theme) => {
      if (!theme) return null;
      return (
        <div>
          <output data-testid="theme">{theme.theme}</output>
          <output data-testid="primary">
            {theme.activeConfig.tokens.primary}
          </output>
          <output data-testid="preview">
            {theme.previewSession ? "active" : "inactive"}
          </output>
          <button
            type="button"
            onClick={() =>
              theme.startPreviewSession({
                config: structuredClone(PRESET_THEME_CONFIGS.pastel),
                name: "Pastel draft",
                returnTo: "/@me/settings/appearance/themes/new",
              })
            }
          >
            Start preview
          </button>
        </div>
      );
    }}
  </ThemeContext.Consumer>
);

beforeEach(() => {
  const library = createDefaultThemeLibrary();
  mocks.serverLibrary = {
    ...library,
    selection: { kind: "preset", presetId: "rias" },
  };
  mocks.mutateAsync.mockReset();
  mocks.refetch.mockReset();
  mocks.setQueryData.mockReset();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  clearThemeConfig(document.documentElement);
  document.documentElement.removeAttribute("class");
});

describe("ThemeProvider application preview", () => {
  it("keeps the draft in memory, disables the special package and restores it on Escape", async () => {
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("theme").textContent).toBe("rias"),
    );
    const savedSnapshot = localStorage.getItem(THEME_SNAPSHOT_STORAGE_KEY);

    fireEvent.click(screen.getByRole("button", { name: "Start preview" }));

    expect(screen.getByTestId("theme").textContent).toBe("default");
    expect(screen.getByTestId("preview").textContent).toBe("active");
    expect(screen.getByTestId("primary").textContent).toBe(
      PRESET_THEME_CONFIGS.pastel.tokens.primary,
    );
    expect(document.documentElement.style.getPropertyValue("--primary")).toBe(
      PRESET_THEME_CONFIGS.pastel.tokens.primary,
    );
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(localStorage.getItem(THEME_SNAPSHOT_STORAGE_KEY)).toBe(
      savedSnapshot,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.getByTestId("theme").textContent).toBe("rias");
    expect(screen.getByTestId("preview").textContent).toBe("inactive");
    expect(screen.getByTestId("primary").textContent).toBe(
      PRESET_THEME_CONFIGS.rias.tokens.primary,
    );
  });
});
