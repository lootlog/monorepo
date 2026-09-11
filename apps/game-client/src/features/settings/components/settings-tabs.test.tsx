import {
  render as renderUi,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useWindowsStore } from "@/store/windows.store";
import { useSettingsUiStore } from "@/features/settings/settings-ui.store";
import { SETTINGS_MANIFEST } from "@/features/settings/settings-manifest";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { createSoundSettings } from "@/test/sound-settings-fixtures";
import {
  seedSettingsDocumentValues,
  soundSettingValues,
} from "@/test/settings-documents-fixtures";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () => renderUi(<SettingsTabs />, { wrapper: harness.wrapper });

import { SettingsTabs } from "./settings-tabs";

describe("SettingsTabs", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    seedSettingsDocumentValues(
      harness.queryClient,
      soundSettingValues(createSoundSettings()),
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

  it("renders thirteen domain tabs in order and opens the selected domain", async () => {
    const user = userEvent.setup();
    render();

    const tabs = within(
      screen.getByRole("tablist", { name: "Działy ustawień" }),
    ).getAllByRole("tab");

    const tabNames = tabs.map((tab) => tab.textContent);
    const soundsTab = screen.getByRole("tab", { name: "Dźwięki" });

    expect(tabNames).toEqual([
      "Ogólne",
      "Serwery",
      "Wygląd",
      "Chat",
      "Timery",
      "Powiadomienia",
      "Wyciszenia",
      "Panel walk",
      "Dźwięki",
      "Sterowanie",
      "Eksperymentalne",
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

    expect(screen.getByText("Powiadomienia › Routing")).toBeInTheDocument();
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

    // A single-subsection domain gets one heading, without a repeated name.
    expect(screen.getAllByText("Dźwięki")).toHaveLength(1);
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

    await user.click(screen.getByRole("tab", { name: "Sterowanie" }));

    expect(
      screen.queryByRole("tablist", { name: "Sekcje ustawień" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Chat" }));

    const subsections = within(
      screen.getByRole("tablist", { name: "Sekcje ustawień" }),
    );

    expect(
      subsections.getByRole("tab", { name: "Wygląd" }),
    ).toBeInTheDocument();
    expect(
      subsections.getByRole("tab", { name: "Filtry" }),
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

    expect(
      screen.queryByRole("textbox", { name: "Szukaj w ustawieniach" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dźwięki" })).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Szukaj w ustawieniach" }),
    );
    expect(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
    ).toBeInTheDocument();
  });
});

describe("SettingsTabs keyboard and start view", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    seedSettingsDocumentValues(
      harness.queryClient,
      soundSettingValues(createSoundSettings()),
    );
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn<HTMLElement["scrollIntoView"]>(),
    });
    useSettingsUiStore.getState().reset();
    useWindowsStore.setState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        open: true,
        size: { width: 760, height: 520 },
        state: { activeTab: "general" },
      },
    }));
  });

  it("focuses search with Ctrl+F only while focus is inside the window and closes on Escape", async () => {
    const user = userEvent.setup();
    render();

    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    await user.keyboard("{Control>}f{/Control}");
    expect(
      screen.getByRole("textbox", { name: "Szukaj w ustawieniach" }),
    ).not.toHaveFocus();

    screen.getByRole("tab", { name: "Ogólne" }).focus();
    await user.keyboard("{Control>}f{/Control}");

    const search = screen.getByRole("textbox", {
      name: "Szukaj w ustawieniach",
    });

    expect(search).toHaveFocus();

    await user.type(search, "skala");
    await user.keyboard("{Escape}");
    expect(search).toHaveValue("");
    expect(useWindowsStore.getState().settings.open).toBe(true);

    await user.keyboard("{Escape}");
    expect(useWindowsStore.getState().settings.open).toBe(false);
    outside.remove();
  });

  it("opens the selected search result with the keyboard and marks it active for assistive tech", async () => {
    const user = userEvent.setup();
    render();

    const search = screen.getByRole("textbox", {
      name: "Szukaj w ustawieniach",
    });

    await user.type(search, "chat");
    await user.keyboard("{ArrowDown}");

    const options = screen.getAllByRole("option");

    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(search).toHaveAttribute("aria-activedescendant", options[1]?.id);

    await user.keyboard("{Enter}");

    await waitFor(() =>
      expect(
        document.querySelector('[data-settings-highlighted="true"]'),
      ).toHaveAttribute(
        "data-settings-control",
        options[1]?.id.replace("settings-search-option-", ""),
      ),
    );
    expect(search).toHaveValue("");
  });
});

describe("SettingsTabs manifest coverage", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    setTestRuntimeGame({ interface: "ni" });
    seedSettingsDocumentValues(
      harness.queryClient,
      soundSettingValues(createSoundSettings()),
    );
    useSettingsUiStore.getState().reset();
    useWindowsStore.setState((state) => ({
      ...state,
      settings: { ...state.settings, size: { width: 760, height: 520 } },
    }));
  });

  // Catching needs the character list API and debug is development-only.
  const uncoveredSubsections = new Set(["catching", "debug"]);

  for (const domain of SETTINGS_MANIFEST) {
    for (const subsection of domain.subsections) {
      if (uncoveredSubsections.has(subsection.id)) continue;

      it(`renders every manifest control of ${domain.id}/${subsection.id}`, async () => {
        useWindowsStore.getState().setSettingsPath(domain.id, subsection.id);
        render();

        await waitFor(() => {
          for (const control of subsection.controls) {
            expect(
              document.querySelector(`[data-settings-control="${control.id}"]`),
            ).toBeInTheDocument();
          }
        });
      });
    }
  }
});
