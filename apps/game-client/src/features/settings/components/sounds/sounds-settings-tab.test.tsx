import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentSettingsDocumentsQueryKey } from "@/features/settings/persistence/settings-patch-client";
import {
  seedSettingsDocumentValues,
  soundSettingValues,
} from "@/test/settings-documents-fixtures";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { createSoundSettings } from "@/test/sound-settings-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import { useSettingsStore } from "@/store/settings.store";
import { SoundsSettingsTab } from "./sounds-settings-tab";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const patchRequest = vi.fn<typeof fetch>();

const render = () =>
  renderUi(<SoundsSettingsTab />, { wrapper: harness.wrapper });

const lastPatchOperations = () => {
  const body = patchRequest.mock.lastCall?.[1]?.body;

  return body ? JSON.parse(String(body)).operations : undefined;
};

describe("SoundsSettingsTab", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.setPreferences({ userId: "user-1" });
    seedSettingsDocumentValues(
      harness.queryClient,
      soundSettingValues(
        createSoundSettings({
          masterVolume: 0.8,
          notificationsVolume: 0.6,
          detectorVolume: 0.5,
          timersVolume: 0.4,
        }),
      ),
    );
    patchRequest
      .mockReset()
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(
            harness.queryClient.getQueryData(
              getCurrentSettingsDocumentsQueryKey(),
            ),
          ),
        ),
      );
    harness.request.mockImplementation(patchRequest);
    useSettingsStore.setState({ soundsMuted: false, masterVolume: 0.8 });
    setTestRuntimeGame({ interface: "ni" });
  });

  it("shows every category expanded without the unsupported timers category", () => {
    render();
    expect(
      screen.getByRole("heading", { name: "Powiadomienia" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Wykrywacz" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Timery")).not.toBeInTheDocument();
    expect(screen.queryByText(/settings\.sounds\./)).not.toBeInTheDocument();
    // Every sound url is editable at once; nothing is collapsed.
    expect(screen.getByRole("textbox", { name: "Komunikaty" })).toBeVisible();
    expect(screen.getAllByRole("textbox", { name: "Heros" })).toHaveLength(2);
  });

  it("hides map ping sound settings on the old interface", () => {
    setTestRuntimeGame({ interface: "si" });
    render();

    expect(
      screen.queryByRole("slider", { name: "Pingi na mapie" }),
    ).not.toBeInTheDocument();
  });

  it("shows map ping sound settings on the new interface", () => {
    render();

    expect(
      screen.getByRole("slider", { name: "Pingi na mapie" }),
    ).toBeInTheDocument();
  });

  it("mutes every add-on sound from the master volume row", async () => {
    const user = userEvent.setup();
    render();

    await user.click(screen.getAllByRole("button", { name: "Wycisz" })[0]!);

    expect(useSettingsStore.getState().soundsMuted).toBe(true);
    expect(
      screen.getAllByRole("button", { name: "Włącz dźwięk" })[0],
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("persists a category mute as a zero volume", async () => {
    const user = userEvent.setup();
    render();

    const notificationsSlider = screen.getByRole("slider", {
      name: "Powiadomienia",
    });

    // The mute toggle is the slider's sibling inside the volume control.
    let control: HTMLElement | null = notificationsSlider;
    let muteButton: HTMLButtonElement | null = null;

    while (control && !muteButton) {
      muteButton = control.querySelector('button[aria-label="Wycisz"]');
      control = control.parentElement;
    }

    if (!muteButton) throw new Error("Missing notifications mute button");
    await user.click(muteButton);

    await waitFor(() => {
      expect(lastPatchOperations()).toEqual([
        expect.objectContaining({
          domain: "sounds",
          set: { notificationsVolume: 0 },
        }),
      ]);
    });
  });

  it("flags an invalid sound url instead of saving it", async () => {
    const user = userEvent.setup();
    render();

    const input = screen.getByRole("textbox", { name: "Komunikaty" });
    await user.type(input, "not a url");

    expect(screen.getByText("Nieprawidłowy URL")).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(patchRequest).not.toHaveBeenCalled();
  });

  it("saves a valid sound url for the field", async () => {
    const user = userEvent.setup();
    render();

    // The detector section lists the same types after the notifications one.
    const input = screen.getAllByRole("textbox", { name: "Heros" })[1]!;
    await user.type(input, "https://audio.test/hero.mp3");

    await waitFor(() => {
      expect(lastPatchOperations()).toEqual([
        expect.objectContaining({
          domain: "sounds",
          set: {
            detectorConfig: {
              HERO: { volume: 0.5, soundUrl: "https://audio.test/hero.mp3" },
            },
          },
        }),
      ]);
    });
  });
});
