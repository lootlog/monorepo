import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationsSettingsTab } from "./notifications-settings-tab";
import { useGameAccountPreferencesSyncStatus } from "@/hooks/use-game-account-preferences-sync-status";

const mockUseGameAccountPreferencesSyncStatus = vi.fn();

vi.mock("@/hooks/use-game-account-preferences-sync-status", () => ({
  useGameAccountPreferencesSyncStatus: vi.fn(),
}));

vi.mock(
  "@/features/settings/components/notifications/notification-category-form",
  () => ({
    NotificationCategoryForm: ({ categoryKey }: { categoryKey: string }) => (
      <div>{`form:${categoryKey}`}</div>
    ),
  }),
);

vi.mock("@/components/settings/settings-tab-layout", () => ({
  SettingsTabLayout: ({
    title,
    description,
    children,
  }: {
    title: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h1>{title}</h1>
      <p>{description}</p>
      {children}
    </section>
  ),
}));

vi.mock("@/components/settings/settings-sync-status", () => ({
  SettingsSyncStatus: ({
    status,
  }: {
    status: "idle" | "loading" | "saving" | "error";
  }) => <div data-testid="sync-status">{status}</div>,
}));

describe("NotificationsSettingsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(useGameAccountPreferencesSyncStatus).mockImplementation(() =>
      mockUseGameAccountPreferencesSyncStatus(),
    );
    mockUseGameAccountPreferencesSyncStatus.mockReturnValue({
      status: "idle",
      error: null,
    });
  });

  it("renders notification category tabs and category forms", () => {
    render(<NotificationsSettingsTab />);

    expect(screen.getByText("Ustawienia powiadomień")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Heros" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kolos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tytan" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Komunikaty" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grupa" })).toBeInTheDocument();
    expect(screen.getByText("form:ELITE2")).toBeInTheDocument();
  });

  it("delays visible sync status updates for loading and saving states", () => {
    vi.useFakeTimers();

    const { rerender } = render(<NotificationsSettingsTab />);

    expect(screen.getByTestId("sync-status")).toHaveTextContent("idle");

    mockUseGameAccountPreferencesSyncStatus.mockReturnValue({
      status: "saving",
      error: null,
    });
    rerender(<NotificationsSettingsTab />);

    expect(screen.getByTestId("sync-status")).toHaveTextContent("idle");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("sync-status")).toHaveTextContent("saving");
  });

  it("switches to error immediately without waiting for the delay", () => {
    const { rerender } = render(<NotificationsSettingsTab />);

    mockUseGameAccountPreferencesSyncStatus.mockReturnValue({
      status: "error",
      error: new Error("sync failed"),
    });
    rerender(<NotificationsSettingsTab />);

    expect(screen.getByTestId("sync-status")).toHaveTextContent("error");
  });
});
