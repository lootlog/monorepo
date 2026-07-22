import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";

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
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        size: { width: 640, height: 440 },
        state: { activeTab: "general" },
      },
    }));
  });

  it("places the information tab after logs and before debug and opens it", async () => {
    const user = userEvent.setup();
    render(<SettingsTabs />);

    const tabs = screen.getAllByRole("tab");
    const tabNames = tabs.map((tab) => tab.getAttribute("aria-label"));
    const informationTab = screen.getByRole("tab", { name: "Informacje" });

    expect(tabNames.slice(-3)).toEqual(["Logi", "Informacje", "Debug"]);

    await user.click(informationTab);

    expect(informationTab).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { name: "Informacje o kliencie" }),
    ).toBeInTheDocument();
  });

  it("keeps both settings columns inside the settings height", () => {
    const { container } = render(<SettingsTabs />);

    const settingsLayout = container.firstElementChild;
    const generalTab = screen.getByRole("tab", { name: "Ogólne" });
    const tabsList = generalTab.closest('[role="tablist"]');
    const navigationViewport = tabsList?.closest(
      "[data-ll-scroll-area-viewport]",
    );
    const navigationScrollArea = navigationViewport?.parentElement;
    const sidebar = navigationScrollArea?.parentElement;
    const contentColumn = sidebar?.nextElementSibling;

    expect(settingsLayout).toHaveClass("ll:box-border");
    expect(sidebar).not.toHaveClass("ll:pb-2");
    expect(contentColumn).not.toHaveClass("ll:pb-2");
    expect(sidebar).not.toHaveTextContent("Commit SHA");
  });

  it("shows the information label in a tooltip for the compact sidebar", async () => {
    const user = userEvent.setup();
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        size: { ...state.settings.size, width: 500 },
      },
    }));

    render(<SettingsTabs />);

    const informationTab = screen.getByRole("tab", { name: "Informacje" });

    expect(informationTab.querySelector(".lucide-info")).toBeInTheDocument();

    await user.hover(informationTab);

    await waitFor(() => {
      expect(screen.getByRole("tooltip")).toHaveTextContent("Informacje");
    });
  });
});
