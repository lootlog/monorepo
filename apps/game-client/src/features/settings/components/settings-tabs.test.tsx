import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";

const { mockCommitSha } = vi.hoisted(() => ({
  mockCommitSha: { value: "" },
}));

vi.mock("@/config/app", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/config/app")>();

  return {
    ...actual,
    get COMMIT_SHA() {
      return mockCommitSha.value;
    },
  };
});

vi.mock(
  "@/features/settings/components/battle-panel/battle-panel-settings-tab",
  () => ({
    BattlePanelSettingsTab: () => <div>Battle panel tab</div>,
  }),
);

vi.mock("@/features/settings/components/catching/catching-settings", () => ({
  CatchingSettings: () => <div>Catching tab</div>,
}));

vi.mock("@/features/settings/components/debug/debug-tab", () => ({
  DebugTab: () => <div>Debug tab</div>,
}));

vi.mock(
  "@/features/settings/components/detector/detector-settings-tab",
  () => ({
    DetectorSettingsTab: () => <div>Detector tab</div>,
  }),
);

vi.mock("@/features/settings/components/general/general-settings-tab", () => ({
  GeneralSettingsTab: () => <div>General tab</div>,
}));

vi.mock(
  "@/features/settings/components/hidden-timers/hidden-timers-tab",
  () => ({
    HiddenTimersTab: () => <div>Hidden timers tab</div>,
  }),
);

vi.mock("@/features/settings/components/hotkeys/hotkeys-settings-tab", () => ({
  HotkeysSettingsTab: () => <div>Hotkeys tab</div>,
}));

vi.mock("@/features/settings/components/logs/logs-settings-tab", () => ({
  LogsSettingsTab: () => <div>Logs tab</div>,
}));

vi.mock(
  "@/features/settings/components/notification-mutes/notification-mutes-settings-tab",
  () => ({
    NotificationMutesSettingsTab: () => <div>Notification mutes tab</div>,
  }),
);

vi.mock(
  "@/features/settings/components/notifications/notifications-settings-tab",
  () => ({
    NotificationsSettingsTab: () => <div>Notifications tab</div>,
  }),
);

vi.mock("@/features/settings/components/sounds/sounds-settings-tab", () => ({
  SoundsSettingsTab: () => <div>Sounds tab</div>,
}));

vi.mock("@/features/settings/components/timers/timers-settings-tab", () => ({
  TimersSettingsTab: () => <div>Timers tab</div>,
}));

import { SettingsTabs } from "./settings-tabs";

describe("SettingsTabs", () => {
  beforeEach(() => {
    mockCommitSha.value = "";

    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        size: { width: 640, height: 440 },
        state: { activeTab: "general" },
      },
    }));
  });

  it("renders a short commit sha and exposes the full value in a tooltip", async () => {
    const user = userEvent.setup();
    const fullCommitSha = "1234567890abcdef1234567890abcdef12345678";
    mockCommitSha.value = fullCommitSha;

    render(<SettingsTabs />);

    const commitShaLabel = screen.getByText("Commit SHA: 1234567");
    expect(commitShaLabel).toBeInTheDocument();

    await user.hover(commitShaLabel);

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent(fullCommitSha);
    });
  });

  it("hides the commit sha footer when commit sha is missing", () => {
    render(<SettingsTabs />);

    expect(screen.queryByText(/^Commit SHA:/)).not.toBeInTheDocument();
  });
});
