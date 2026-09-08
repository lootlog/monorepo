import i18n from "@/i18n/config";
import { render, screen } from "@testing-library/react";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { HotkeysSettingsTab } from "./hotkeys-settings-tab";

describe("HotkeysSettingsTab", () => {
  beforeEach(() => {
    setTestRuntimeGame({ interface: "si" });
  });

  it("hides the map ping hotkey on the old interface", () => {
    render(<HotkeysSettingsTab />);

    expect(
      screen.queryByText(i18n.t("settings.hotkeys.actions.map-ping.label")),
    ).not.toBeInTheDocument();
  });

  it("shows the map ping hotkey on the new interface", () => {
    setTestRuntimeGame({ interface: "ni" });
    render(<HotkeysSettingsTab />);

    expect(
      screen.getByText(i18n.t("settings.hotkeys.actions.map-ping.label")),
    ).toBeInTheDocument();
  });
});
