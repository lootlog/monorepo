import { render, screen } from "@testing-library/react";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { HotkeysSettingsTab } from "./hotkeys-settings-tab";

const testState = vi.hoisted(() => ({
  gameInterface: "si" as "ni" | "si",
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("HotkeysSettingsTab", () => {
  beforeEach(() => {
    testState.gameInterface = "si";
    setTestRuntimeGame({ interface: "si" });
  });

  it("hides the map ping hotkey on the old interface", () => {
    render(<HotkeysSettingsTab />);

    expect(
      screen.queryByText("settings.hotkeys.actions.map-ping.label"),
    ).not.toBeInTheDocument();
  });

  it("shows the map ping hotkey on the new interface", () => {
    testState.gameInterface = "ni";
    setTestRuntimeGame({ interface: "ni" });
    render(<HotkeysSettingsTab />);

    expect(
      screen.getByText("settings.hotkeys.actions.map-ping.label"),
    ).toBeInTheDocument();
  });
});
