import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";

import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { createSoundSettings } from "@/test/sound-settings-fixtures";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@lootlog/client/main";
let harness: ReturnType<typeof createGuildPreferencesTest>;
const render = () => renderUi(<SettingsTabs />, { wrapper: harness.wrapper });

import { SettingsTabs } from "./settings-tabs";

describe("SettingsTabs", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings(),
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn<HTMLElement["scrollIntoView"]>(),
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
    render();

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
    expect(screen.getByText("Głośność główna")).toBeInTheDocument();
  });

  it("groups search results by domain and subsection", async () => {
    const user = userEvent.setup();
    render();

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
    render();

    await user.type(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
      "głośność główna",
    );

    expect(screen.getAllByText("Dźwięki")).toHaveLength(2);
    expect(
      screen.getByRole("option", { name: "Głośność główna" }),
    ).toBeInTheDocument();
  });

  it("reveals and highlights the real control selected from search", async () => {
    const user = userEvent.setup();
    render();

    await user.type(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
      "skala tekstu",
    );
    await user.click(screen.getByRole("option", { name: "Skala tekstu" }));

    await waitFor(() =>
      expect(
        document
          .getElementById("chat-font-scale")
          ?.closest("[data-settings-control]"),
      ).toHaveAttribute("data-settings-highlighted", "true"),
    );
  });

  it("shows subsection navigation only when the domain has multiple subsections", async () => {
    const user = userEvent.setup();
    render();

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

    render();

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
