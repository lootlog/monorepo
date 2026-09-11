import i18n from "@/i18n/config";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useHotkeysStore } from "@/store/hotkeys.store";
import { HotkeysSettingsTab } from "./hotkeys-settings-tab";

const chatRow = () => {
  const label = screen.getByText(
    i18n.t("settings.hotkeys.actions.toggle-chat.label"),
  );

  // SettingsRow: row > text column > label.
  const row = label.parentElement?.parentElement;

  if (!row) throw new Error("Missing chat hotkey row");

  return within(row);
};

describe("HotkeysSettingsTab", () => {
  beforeEach(() => {
    setTestRuntimeGame({ interface: "si" });
    useHotkeysStore.getState().resetAll();
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

  it("captures a new binding and offers a reset only once it differs from the default", async () => {
    const user = userEvent.setup();
    render(<HotkeysSettingsTab />);

    expect(chatRow().queryByRole("button", { name: "Reset" })).toBeNull();
    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Chat" }),
    );
    expect(
      chatRow().getByText(i18n.t("settings.hotkeys.capture")),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "k", ctrlKey: true });

    expect(useHotkeysStore.getState().bindings["toggle-chat"]).toEqual({
      type: "keyboard",
      key: "K",
      shift: false,
      ctrl: true,
      alt: false,
    });
    expect(chatRow().getByText("Ctrl + K")).toBeInTheDocument();

    await user.click(chatRow().getByRole("button", { name: "Reset" }));

    expect(chatRow().getByText("Shift + C")).toBeInTheDocument();
    expect(chatRow().queryByRole("button", { name: "Reset" })).toBeNull();
  });

  it("rejects a binding already used by another action", async () => {
    const user = userEvent.setup();
    render(<HotkeysSettingsTab />);

    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Chat" }),
    );
    fireEvent.keyDown(window, { key: "S", shiftKey: true });

    expect(
      chatRow().getByText(i18n.t("settings.hotkeys.conflict")),
    ).toBeInTheDocument();
    expect(useHotkeysStore.getState().bindings["toggle-chat"]).toMatchObject({
      key: "C",
      shift: true,
    });
  });

  it("restores every default binding from the toolbar", async () => {
    const user = userEvent.setup();
    useHotkeysStore.getState().setBinding("toggle-chat", {
      type: "keyboard",
      key: "K",
      shift: false,
      ctrl: true,
      alt: false,
    });
    render(<HotkeysSettingsTab />);

    await user.click(screen.getByRole("button", { name: "Przywróć domyślne" }));

    expect(chatRow().getByText("Shift + C")).toBeInTheDocument();
    expect(chatRow().queryByRole("button", { name: "Reset" })).toBeNull();
  });
});
