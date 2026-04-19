import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DetectorSettingsTab } from "./detector-settings-tab";
import { useGameAccountPreferencesSyncStatus } from "@/hooks/use-game-account-preferences-sync-status";

const mockUseGameAccountPreferencesSyncStatus = vi.fn();
const mockSettingsSyncStatus = vi.fn();

vi.mock("@/hooks/use-game-account-preferences-sync-status", () => ({
  useGameAccountPreferencesSyncStatus: vi.fn(),
}));

vi.mock(
  "@/features/settings/components/detector/detector-settings-tab-form",
  () => ({
    DetectorSettingsTabForm: ({ categoryKey }: { categoryKey: string }) => (
      <div>{`form:${categoryKey}`}</div>
    ),
  }),
);

vi.mock(
  "@/features/settings/components/detector/detector-routing-settings-tab-form",
  () => ({
    DetectorRoutingSettingsTabForm: () => <div>routing-form</div>,
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

vi.mock("@/components/settings/settings-section", () => ({
  SettingsSection: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  ),
}));

vi.mock("@/components/settings/settings-sync-status", () => ({
  SettingsSyncStatus: ({
    status,
  }: {
    status: "idle" | "loading" | "saving" | "error";
  }) => {
    mockSettingsSyncStatus(status);
    return <div data-testid="sync-status">{status}</div>;
  },
}));

describe("DetectorSettingsTab", () => {
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

  it("renders detector forms for all npc categories and the shared routing section", () => {
    render(<DetectorSettingsTab />);

    expect(screen.getByText("Ustawienia wykrywacza")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Heros" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kolos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tytan" })).toBeInTheDocument();
    expect(screen.getByText("form:ELITE2")).toBeInTheDocument();
    expect(screen.getByText("routing-form")).toBeInTheDocument();
  });

  it("delays visible sync status updates for loading and saving states", () => {
    vi.useFakeTimers();

    const { rerender } = render(<DetectorSettingsTab />);

    expect(screen.getByTestId("sync-status")).toHaveTextContent("idle");

    mockUseGameAccountPreferencesSyncStatus.mockReturnValue({
      status: "saving",
      error: null,
    });
    rerender(<DetectorSettingsTab />);

    expect(screen.getByTestId("sync-status")).toHaveTextContent("idle");

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByTestId("sync-status")).toHaveTextContent("saving");
  });

  it("switches to the error status immediately without waiting for the delay", () => {
    const { rerender } = render(<DetectorSettingsTab />);

    mockUseGameAccountPreferencesSyncStatus.mockReturnValue({
      status: "error",
      error: new Error("sync failed"),
    });
    rerender(<DetectorSettingsTab />);

    expect(screen.getByTestId("sync-status")).toHaveTextContent("error");
  });
});
