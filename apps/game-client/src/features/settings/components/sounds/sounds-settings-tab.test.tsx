import { render as renderUi, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { getSoundSettingsControllerGetSettingsQueryKey } from "@lootlog/client/main";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { createSoundSettings } from "@/test/sound-settings-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<SoundsSettingsTab />, { wrapper: harness.wrapper });

import { SoundsSettingsTab } from "./sounds-settings-tab";

describe("SoundsSettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.queryClient.setQueryData(
      getSoundSettingsControllerGetSettingsQueryKey(),
      createSoundSettings({
        masterVolume: 0.8,
        notificationsVolume: 0.6,
        detectorVolume: 0.5,
        timersVolume: 0.4,
      }),
    );
    setTestRuntimeGame({ interface: "ni" });
  });

  it("renders translated settings copy instead of raw settings keys", () => {
    render();

    expect(
      screen.getByRole("heading", { name: "Ustawienia dźwięków" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Skonfiguruj dźwięki dla różnych funkcji."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Kategorie dźwięków" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Powiadomienia")).toBeInTheDocument();
    expect(screen.getByText("Wykrywacz")).toBeInTheDocument();
    expect(screen.getByText("Timery")).toBeInTheDocument();
    expect(screen.queryByText("settings.sounds.title")).not.toBeInTheDocument();
    expect(
      screen.queryByText("settings.sounds.categories.notifications.label"),
    ).not.toBeInTheDocument();
  });

  it("hides map ping sound settings on the old interface", () => {
    setTestRuntimeGame({ interface: "si" });
    render();

    expect(
      screen.queryByRole("heading", { name: "Pingi na mapie" }),
    ).not.toBeInTheDocument();
  });

  it("shows map ping sound settings on the new interface", () => {
    render();

    expect(
      screen.getByRole("heading", { name: "Pingi na mapie" }),
    ).toBeInTheDocument();
  });
});
