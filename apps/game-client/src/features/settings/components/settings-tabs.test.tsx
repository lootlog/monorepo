import { render, screen } from "@testing-library/react";
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
vi.mock("@/features/settings/components/chat/chat-appearance-settings", () => ({
  ChatAppearanceSettingsForm: () => (
    <details data-testid="chat-advanced-settings">
      <summary>Więcej opcji</summary>
      <div id="chat-font-scale" data-settings-control>
        Skala tekstu
      </div>
    </details>
  ),
}));
vi.mock(
  "@/features/settings/components/timers/timers-settings-appearance",
  () => ({
    TimersSettingsAppearance: () => <div>Timer appearance</div>,
  }),
);
vi.mock(
  "@/features/settings/components/timers/timers-settings-general",
  () => ({
    TimersSettingsGeneral: () => <div>Timer behavior</div>,
  }),
);
vi.mock("@/features/settings/components/timers/timers-settings-colors", () => ({
  TimersSettingsColors: () => <div>Timer colors</div>,
}));
vi.mock(
  "@/features/settings/components/information/information-settings-tab",
  () => ({
    InformationSettingsTab: () => <div>Build information</div>,
  }),
);

import { SettingsTabs } from "./settings-tabs";

describe("SettingsTabs", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        size: { width: 760, height: 520 },
        state: { activeTab: "general" },
      },
    }));
  });

  it("renders ten domain tabs in order and opens the selected domain", async () => {
    const user = userEvent.setup();
    render(<SettingsTabs />);

    const tabs = screen.getAllByRole("tab");
    const tabNames = tabs.map((tab) => tab.textContent);
    const soundsTab = screen.getByRole("tab", { name: "Dźwięki" });

    expect(tabNames).toEqual([
      "Ogólne",
      "Serwery",
      "Wygląd",
      "Timery",
      "Dane z gry",
      "Powiadomienia",
      "Dźwięki",
      "Sterowanie",
      "Diagnostyka",
      "Informacje",
    ]);

    await user.click(soundsTab);

    expect(soundsTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Sounds tab")).toBeInTheDocument();
  });

  it("groups search results by domain and subsection", async () => {
    const user = userEvent.setup();
    render(<SettingsTabs />);

    await user.type(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
      "discord",
    );

    expect(screen.getByText("Dane z gry")).toBeInTheDocument();
    expect(screen.getByText("Wykrywacz")).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Routing na serwery" }),
    ).toBeInTheDocument();
  });

  it("groups sound controls under the standalone sounds domain", async () => {
    const user = userEvent.setup();
    render(<SettingsTabs />);

    await user.type(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
      "głośność główna",
    );

    expect(screen.getAllByText("Dźwięki")).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: "Głośność główna" }),
    ).toBeInTheDocument();
  });

  it("opens advanced settings before revealing a search result", async () => {
    const user = userEvent.setup();
    render(<SettingsTabs />);

    await user.type(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
      "skala tekstu",
    );
    await user.click(screen.getByRole("option", { name: "Skala tekstu" }));

    expect(await screen.findByTestId("chat-advanced-settings")).toHaveAttribute(
      "open",
    );
  });

  it("shows subsection navigation only when the domain has multiple subsections", async () => {
    const user = userEvent.setup();
    render(<SettingsTabs />);

    expect(
      screen.queryByRole("button", { name: "Zachowanie" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Wygląd" }));

    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Wygląd timerów" }),
    ).toBeInTheDocument();
  });

  it("uses an icon rail and opens the overlaid search panel when compact", async () => {
    const user = userEvent.setup();
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        size: { ...state.settings.size, width: 500 },
      },
    }));

    render(<SettingsTabs />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dźwięki" })).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Szukaj w ustawieniach" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
    ).toBeInTheDocument();
  });
});
