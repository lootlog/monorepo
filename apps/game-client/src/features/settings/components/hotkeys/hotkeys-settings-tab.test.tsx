import i18n from "@/i18n/config";
import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useHotkeys } from "@/hooks/use-hotkeys";
import { useHotkeysStore, type HotkeyAction } from "@/store/hotkeys.store";
import { useWindowsStore } from "@/store/windows.store";
import { HotkeysSettingsTab } from "./hotkeys-settings-tab";

const keyCaps = (row: ReturnType<typeof chatRow>) =>
  row.getByText(
    (_, element) => element?.getAttribute("data-slot") === "kbd-group",
  ).textContent;

const hotkeyRow = (action: HotkeyAction) => {
  const label = screen.getByText(
    i18n.t(`settings.hotkeys.actions.${action}.label`),
  );

  // SettingsRow: row > text column > label.
  const row = label.parentElement?.parentElement;

  if (!row) throw new Error(`Missing ${action} hotkey row`);

  return within(row);
};

const chatRow = () => hotkeyRow("toggle-chat");

describe("HotkeysSettingsTab", () => {
  beforeEach(() => {
    setTestRuntimeGame({ interface: "si" });
    useHotkeysStore.getState().resetAll();
  });

  it("records an already assigned shortcut as a conflict instead of running it", async () => {
    const user = userEvent.setup();
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
    renderHook(() => useHotkeys());
    render(<HotkeysSettingsTab />);

    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Czat" }),
    );
    fireEvent.keyDown(window, { key: "S", shiftKey: true });

    expect(
      chatRow().getByText(i18n.t("settings.hotkeys.conflict")),
    ).toBeInTheDocument();
    expect(useWindowsStore.getState().command.open).toBe(false);
    expect(useHotkeysStore.getState().bindings["toggle-chat"]).toMatchObject({
      key: "C",
      shift: true,
    });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.keyDown(window, { key: "S", shiftKey: true });
    expect(useWindowsStore.getState().command.open).toBe(true);
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

    expect(
      chatRow().queryByRole("button", { name: "Przywróć domyślny" }),
    ).toBeNull();
    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Czat" }),
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
    expect(keyCaps(chatRow())).toBe("Ctrl + K");

    await user.click(
      chatRow().getByRole("button", { name: "Przywróć domyślny" }),
    );

    expect(keyCaps(chatRow())).toBe("Shift + C");
    expect(
      chatRow().queryByRole("button", { name: "Przywróć domyślny" }),
    ).toBeNull();
  });

  it("rejects a binding already used by another action", async () => {
    const user = userEvent.setup();
    render(<HotkeysSettingsTab />);

    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Czat" }),
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

  it("restores every default binding from the restore row", async () => {
    const user = userEvent.setup();
    useHotkeysStore.getState().setBinding("toggle-chat", {
      type: "keyboard",
      key: "K",
      shift: false,
      ctrl: true,
      alt: false,
    });
    render(<HotkeysSettingsTab />);

    await user.click(screen.getByRole("button", { name: "Przywróć" }));

    expect(keyCaps(chatRow())).toBe("Shift + C");
    expect(
      chatRow().queryByRole("button", { name: "Przywróć domyślny" }),
    ).toBeNull();
  });

  it("keeps reassigned shortcuts working after a conflicting reset and reload, then allows retry once the default is free", async () => {
    const user = userEvent.setup();
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
    useWindowsStore.getState().setOpen("timers", false);
    useWindowsStore.getState().setOpen("chat", false);
    renderHook(() => useHotkeys());
    render(<HotkeysSettingsTab />);

    await user.click(
      hotkeyRow("toggle-timers").getByRole("button", {
        name: "Zmień skrót: Timery",
      }),
    );
    fireEvent.keyDown(window, { key: "X", shiftKey: true });
    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Czat" }),
    );
    fireEvent.keyDown(window, { key: "T", shiftKey: true });

    await user.click(
      hotkeyRow("toggle-timers").getByRole("button", {
        name: "Przywróć domyślny",
      }),
    );
    await act(() => useHotkeysStore.persist.rehydrate());

    fireEvent.keyDown(window, { key: "X", shiftKey: true });
    expect(useWindowsStore.getState().timers.open).toBe(true);
    expect(useWindowsStore.getState().chat.open).toBe(false);
    fireEvent.keyDown(window, { key: "T", shiftKey: true });
    expect(useWindowsStore.getState().chat.open).toBe(true);
    expect(useWindowsStore.getState().timers.open).toBe(true);
    expect(hotkeyRow("toggle-timers").getByRole("alert")).toBeVisible();

    await user.click(
      chatRow().getByRole("button", { name: "Przywróć domyślny" }),
    );
    await user.click(
      hotkeyRow("toggle-timers").getByRole("button", {
        name: "Przywróć domyślny",
      }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await act(() => useHotkeysStore.persist.rehydrate());
    fireEvent.keyDown(window, { key: "T", shiftKey: true });
    expect(useWindowsStore.getState().timers.open).toBe(false);
    expect(useWindowsStore.getState().chat.open).toBe(true);
  });

  it("rejects resetting the map ping to a mouse button reassigned to chat and clears the conflict when restoring all defaults", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ interface: "ni" });
    render(<HotkeysSettingsTab />);

    await user.click(
      hotkeyRow("map-ping").getByRole("button", {
        name: i18n.t("settings.hotkeys.changeLabel", {
          action: i18n.t("settings.hotkeys.actions.map-ping.label"),
        }),
      }),
    );
    fireEvent.keyDown(window, { key: "X", shiftKey: true });
    await user.click(
      chatRow().getByRole("button", { name: "Zmień skrót: Czat" }),
    );
    fireEvent.mouseDown(window, { button: 1 });

    await user.click(
      hotkeyRow("map-ping").getByRole("button", {
        name: "Przywróć domyślny",
      }),
    );
    expect(useHotkeysStore.getState().bindings["map-ping"]).toMatchObject({
      type: "keyboard",
      key: "X",
      shift: true,
    });
    expect(hotkeyRow("map-ping").getByRole("alert")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Przywróć" }));

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(useHotkeysStore.getState().bindings["map-ping"]).toMatchObject({
      type: "mouse",
      button: 1,
    });
    expect(useHotkeysStore.getState().bindings["toggle-chat"]).toMatchObject({
      type: "keyboard",
      key: "C",
      shift: true,
    });
  });
});
