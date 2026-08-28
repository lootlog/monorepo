// @vitest-environment happy-dom

import type { ReactNode } from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRESET_THEME_CONFIGS } from "@/themes/preset-configs";
import { ThemeBuilder } from "./theme-builder";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  patchLibrary: vi.fn(),
  startPreviewSession: vi.fn(),
  stopPreviewSession: vi.fn(),
  useBlocker: vi.fn(),
  previewSession: null as null | {
    config: typeof PRESET_THEME_CONFIGS.default;
    name: string;
    returnTo: string;
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => (
    <a href="#back">{children}</a>
  ),
  useBlocker: mocks.useBlocker,
  useNavigate: () => mocks.navigate,
  useLocation: () => ({
    pathname: "/@me/settings/appearance/themes/new",
    searchStr: "",
  }),
  useParams: () => ({}),
  useSearch: () => ({}),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn() },
}));

vi.mock("@/hooks/context/use-theme", () => ({
  useTheme: () => ({
    library: {
      revision: 1,
      selection: { kind: "preset", presetId: "default" },
      customThemes: [],
      specialOverrides: {},
    },
    patchLibrary: mocks.patchLibrary,
    previewSession: mocks.previewSession,
    startPreviewSession: mocks.startPreviewSession,
    stopPreviewSession: mocks.stopPreviewSession,
    isLoading: false,
    isSaving: false,
  }),
}));

vi.mock("@lootlog/ui/components/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("./theme-builder-controls", () => ({
  ThemeBuilderControls: ({
    config,
    onConfigChange,
  }: {
    config: typeof PRESET_THEME_CONFIGS.default;
    onConfigChange: (config: typeof PRESET_THEME_CONFIGS.default) => void;
  }) => (
    <button
      type="button"
      onClick={() => onConfigChange({ ...config, recipe: "solid" })}
    >
      Change draft
    </button>
  ),
}));

vi.mock("./theme-builder-preview", () => ({
  ThemeBuilderPreview: ({
    focused,
    label,
    onFocusedChange,
  }: {
    focused: boolean;
    label: string;
    onFocusedChange: (focused: boolean) => void;
  }) => (
    <div data-testid="theme-preview">
      {label}
      <button type="button" onClick={() => onFocusedChange(!focused)}>
        Toggle focus
      </button>
    </div>
  ),
}));

beforeEach(() => {
  mocks.navigate.mockReset();
  mocks.patchLibrary.mockReset().mockResolvedValue(undefined);
  mocks.startPreviewSession.mockReset();
  mocks.stopPreviewSession.mockReset();
  mocks.useBlocker.mockReset();
  mocks.previewSession = null;
});

afterEach(cleanup);

describe("ThemeBuilder", () => {
  it("saves and activates the draft in one operation with the keyboard shortcut", async () => {
    const { getByRole } = render(<ThemeBuilder />);

    fireEvent.click(getByRole("button", { name: "Change draft" }));
    fireEvent.click(
      getByRole("checkbox", {
        name: "settings.appearance.builder.activateAfterSave",
      }),
    );
    fireEvent.keyDown(window, { key: "s", ctrlKey: true });

    await waitFor(() => expect(mocks.patchLibrary).toHaveBeenCalledOnce());
    const [operations] = mocks.patchLibrary.mock.calls[0] ?? [];
    expect(operations).toEqual([
      expect.objectContaining({
        kind: "upsert",
        activate: true,
        theme: expect.objectContaining({
          name: "settings.appearance.builder.defaultName",
          config: expect.objectContaining({ recipe: "solid" }),
        }),
      }),
    ]);
    expect(mocks.stopPreviewSession).toHaveBeenCalledOnce();
  });

  it("keeps an unsaved draft and blocks navigation after a failed save", async () => {
    mocks.patchLibrary.mockRejectedValueOnce(new Error("save failed"));
    const confirm = vi.fn(() => false);
    window.confirm = confirm;
    const { getByRole } = render(<ThemeBuilder />);

    fireEvent.click(getByRole("button", { name: "Change draft" }));
    fireEvent.click(getByRole("button", { name: "common.save" }));

    await waitFor(() => expect(mocks.patchLibrary).toHaveBeenCalledOnce());
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(
      getByRole("button", { name: "common.save" }).hasAttribute("disabled"),
    ).toBe(false);

    const blockerCalls = mocks.useBlocker.mock.calls;
    const blockerOptions = blockerCalls[blockerCalls.length - 1]?.[0];
    expect(blockerOptions.shouldBlockFn()).toBe(true);
    expect(confirm).toHaveBeenCalledOnce();
  });

  it("switches between settings and preview on the mobile layout", () => {
    const { getByRole, getByTestId } = render(<ThemeBuilder />);
    const previewSection = getByTestId("theme-preview").closest("section");

    expect(previewSection?.classList.contains("hidden")).toBe(true);
    fireEvent.click(
      getByRole("button", {
        name: "settings.appearance.builder.previewTab",
      }),
    );

    expect(previewSection?.classList.contains("hidden")).toBe(false);
    expect(
      getByRole("button", {
        name: "settings.appearance.builder.previewTab",
      }).getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("collapses and restores the settings rail in preview focus mode", () => {
    const { container, getByRole } = render(<ThemeBuilder />);
    const settingsRail = container.querySelector("aside");

    expect(settingsRail?.classList.contains("xl:hidden")).toBe(false);
    fireEvent.click(getByRole("button", { name: "Toggle focus" }));
    expect(settingsRail?.classList.contains("xl:hidden")).toBe(true);
    fireEvent.click(getByRole("button", { name: "Toggle focus" }));
    expect(settingsRail?.classList.contains("xl:hidden")).toBe(false);
  });

  it("starts an in-memory application preview without saving", async () => {
    const { getByRole } = render(<ThemeBuilder />);

    fireEvent.click(getByRole("button", { name: "Change draft" }));
    fireEvent.click(
      getByRole("button", {
        name: "settings.appearance.builder.tryInApplication",
      }),
    );

    await waitFor(() =>
      expect(mocks.startPreviewSession).toHaveBeenCalledOnce(),
    );
    expect(mocks.startPreviewSession).toHaveBeenCalledWith({
      config: expect.objectContaining({ recipe: "solid" }),
      name: "settings.appearance.builder.defaultName",
      returnTo: "/@me/settings/appearance/themes/new",
    });
    expect(mocks.patchLibrary).not.toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/@me" });
  });

  it("keeps the application preview after saving without activation", async () => {
    mocks.previewSession = {
      config: PRESET_THEME_CONFIGS.default,
      name: "Existing preview",
      returnTo: "/@me/settings/appearance/themes/new",
    };
    const { getByRole } = render(<ThemeBuilder />);

    fireEvent.click(getByRole("button", { name: "Change draft" }));
    fireEvent.click(getByRole("button", { name: "common.save" }));

    await waitFor(() => expect(mocks.patchLibrary).toHaveBeenCalledOnce());
    expect(mocks.patchLibrary).toHaveBeenCalledWith([
      expect.objectContaining({ kind: "upsert", activate: false }),
    ]);
    await waitFor(() =>
      expect(mocks.startPreviewSession).toHaveBeenCalledOnce(),
    );
    expect(mocks.startPreviewSession).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({ recipe: "solid" }),
        returnTo: expect.stringMatching(
          /^\/@me\/settings\/appearance\/themes\//,
        ),
      }),
    );
    expect(mocks.stopPreviewSession).not.toHaveBeenCalled();
  });
});
