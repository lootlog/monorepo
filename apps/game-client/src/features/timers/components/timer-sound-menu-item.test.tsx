import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { getCurrentSettingsDocumentsQueryKey } from "@/lib/settings-persistence/settings-patch-client";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import {
  seedSettingsDocumentValues,
  soundSettingValues,
} from "@/test/settings-documents-fixtures";
import { createSoundSettings } from "@/test/sound-settings-fixtures";
import { TimerSoundMenuItem } from "./timer-sound-menu-item";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const patchRequest = vi.fn<typeof fetch>();

const renderMenu = async () => {
  render(
    <ContextMenu>
      <ContextMenuTrigger>Timer</ContextMenuTrigger>
      <ContextMenuContent>
        <TimerSoundMenuItem npcName="Tanroth" npcType="HERO" />
      </ContextMenuContent>
    </ContextMenu>,
    { wrapper: harness.wrapper },
  );
  await userEvent.pointer({
    keys: "[MouseRight]",
    target: screen.getByText("Timer"),
  });
};

describe("TimerSoundMenuItem", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
    harness.setPreferences({ userId: "user-1" });
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
  });

  it("switches sound on for this one timer and persists it", async () => {
    seedSettingsDocumentValues(
      harness.queryClient,
      soundSettingValues({
        ...createSoundSettings(),
        timerSoundNpcNames: ["Kotołak"],
      }),
    );
    await renderMenu();

    await userEvent.click(
      await screen.findByRole("menuitem", { name: "Włącz dźwięk timera" }),
    );

    await waitFor(() => {
      const body = patchRequest.mock.lastCall?.[1]?.body;

      expect(body && JSON.parse(String(body)).operations).toEqual([
        expect.objectContaining({
          domain: "sounds",
          set: { timerSoundNpcNames: ["Kotołak", "Tanroth"] },
        }),
      ]);
    });
  });

  it("explains that the timer already plays because its type is enabled", async () => {
    seedSettingsDocumentValues(
      harness.queryClient,
      soundSettingValues(
        createSoundSettings({
          timersConfig: { HERO: { volume: 0.5, soundUrl: "", enabled: true } },
        }),
      ),
    );
    await renderMenu();

    expect(
      await screen.findByRole("menuitem", { name: "Dźwięk włączony dla typu" }),
    ).toHaveAttribute("aria-disabled", "true");
  });
});
