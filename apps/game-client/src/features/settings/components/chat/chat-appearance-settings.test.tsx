import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CHAT_APPEARANCE_READABLE_PRESET,
  DEFAULT_NPC_TYPE_COLORS,
} from "@lootlog/types";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  allowWorldSelection: false,
  patchPreferences: vi.fn(),
  refetchPreferences: vi.fn(),
  refetchSettingsDocuments: vi.fn(),
}));

const settingsDocuments = {
  domains: {
    appearance: {
      effective: {
        chat: CHAT_APPEARANCE_READABLE_PRESET,
        npcColors: DEFAULT_NPC_TYPE_COLORS,
      },
      layers: [],
      sources: {},
      schemaVersion: 1,
    },
  },
};

vi.mock("@/hooks/api/use-user-preferences", () => ({
  useUserPreferences: () => ({
    data: {
      userId: "user-1",
      chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
    },
    refetch: mocks.refetchPreferences,
  }),
}));

vi.mock("@/store/settings.store", () => ({
  useSettingsStore: (
    selector: (state: { allowWorldSelection: boolean }) => unknown,
  ) => selector({ allowWorldSelection: mocks.allowWorldSelection }),
}));

vi.mock("@/hooks/api/use-settings-documents", async (importOriginal) => ({
  ...(await importOriginal()),
  useAppearanceSettingsDocuments: () => ({
    data: settingsDocuments,
    params: { domains: "appearance" },
    refetch: mocks.refetchSettingsDocuments,
  }),
}));

vi.mock("@lootlog/api-client/react-query/main/preferences", () => ({
  getSettingsDocumentsControllerGetPreferencesQueryKey: () => [
    "settings-documents",
  ],
  settingsDocumentsControllerPatchPreferences: mocks.patchPreferences,
}));

vi.mock("@lootlog/api-client/react-query/main/users", () => ({
  getUsersControllerGetUserPreferencesQueryKey: () => ["user-preferences"],
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    "aria-label": ariaLabel,
    onValueChange,
    onValueCommit,
  }: {
    "aria-label": string;
    onValueChange?: (value: number[]) => void;
    onValueCommit?: (value: number[]) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onValueChange?.([70])}>
        Change {ariaLabel}
      </button>
      <button type="button" onClick={() => onValueCommit?.([70])}>
        Commit {ariaLabel}
      </button>
    </div>
  ),
}));

import { ChatAppearanceSettingsForm } from "./chat-appearance-settings";

describe("ChatAppearanceSettingsForm", () => {
  beforeEach(() => {
    mocks.allowWorldSelection = false;
    mocks.patchPreferences.mockReset();
    mocks.refetchPreferences.mockReset();
    mocks.refetchSettingsDocuments.mockReset();
  });

  it("shows the guild label option only when world selection is allowed", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(
      screen.queryByRole("switch", { name: "Gildia" }),
    ).not.toBeInTheDocument();

    mocks.allowWorldSelection = true;
    rerender(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("switch", { name: "Gildia" })).toBeInTheDocument();
  });

  it("aligns every segmented control to the right edge", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    const toggleGroups = container.querySelectorAll(
      '[data-slot="toggle-group"]',
    );
    expect(toggleGroups).toHaveLength(1);
    for (const toggleGroup of toggleGroups) {
      expect(toggleGroup).toHaveClass("ll:ml-auto");
    }
  });

  it("uses two preset cards without scope or inheritance controls", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    expect(screen.getByRole("button", { name: /Czytelny/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /Kompaktowy/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(document.getElementById("chat-preset")).toHaveStyle({
      gap: "8px",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 9rem), 1fr))",
    });
    expect(screen.getByText("Więcej opcji")).toBeVisible();
    expect(document.querySelector("details")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("chat-appearance-preview-messages"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Zakres ustawień")).not.toBeInTheDocument();
    expect(screen.queryByText(/Dziedzicz/)).not.toBeInTheDocument();
  });

  it("keeps slider changes local until the interaction is committed", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["user-preferences"], {
      userId: "user-1",
      chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
    });
    queryClient.setQueryData(["settings-documents"], settingsDocuments);
    mocks.patchPreferences.mockResolvedValue({
      domains: {
        appearance: {
          ...settingsDocuments.domains.appearance,
          effective: {
            chat: {
              ...CHAT_APPEARANCE_READABLE_PRESET,
              fontScalePercent: 70,
            },
          },
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    const restoreDefaultsButton = screen
      .getByText("Przywróć domyślne")
      .closest("button");
    expect(restoreDefaultsButton).toHaveClass("ll:invisible");

    await user.click(
      screen.getByRole("button", { name: "Change Skala tekstu" }),
    );

    expect(restoreDefaultsButton).not.toHaveClass("ll:invisible");
    expect(screen.queryByText("Własne ustawienia")).not.toBeInTheDocument();
    expect(
      queryClient.getQueryData<{
        chatAppearance: { fontScalePercent: number };
      }>(["user-preferences"])?.chatAppearance.fontScalePercent,
    ).toBe(100);
    expect(mocks.patchPreferences).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: "Commit Skala tekstu" }),
    );

    expect(
      queryClient.getQueryData<{
        chatAppearance: { fontScalePercent: number };
      }>(["user-preferences"])?.chatAppearance.fontScalePercent,
    ).toBe(70);
    await waitFor(() => expect(mocks.patchPreferences).toHaveBeenCalledOnce());
  });

  it("updates NPC location and coordinates with one control", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mocks.patchPreferences.mockResolvedValue(settingsDocuments);

    render(
      <QueryClientProvider client={queryClient}>
        <ChatAppearanceSettingsForm />
      </QueryClientProvider>,
    );

    await user.click(
      await screen.findByRole("switch", {
        name: "Lokacja i koordynaty NPC",
      }),
    );

    await waitFor(() => {
      expect(mocks.patchPreferences).toHaveBeenCalledWith({
        operations: [
          {
            domain: "appearance",
            scope: { type: "USER", id: "user-1" },
            set: {
              chat: {
                showNpcLocationAndCoordinates: false,
              },
            },
            unset: [],
          },
        ],
      });
    });
    expect(screen.queryByText("Nazwa lokacji NPC")).not.toBeInTheDocument();
    expect(screen.queryByText("Koordynaty NPC")).not.toBeInTheDocument();
  });
});
