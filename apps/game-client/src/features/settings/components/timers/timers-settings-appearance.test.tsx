import { render as renderUi, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import {
  TIMERS_MODERN_COMFORTABLE_PRESET,
  TIMERS_MODERN_COMPACT_PRESET,
} from "@lootlog/schema/timer-settings";
import { readTimerAppearance } from "@/features/timers/settings/timer-settings-writers";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { seedSettingsDocumentValues } from "@/test/settings-documents-fixtures";
import { TimersSettingsAppearance } from "./timers-settings-appearance";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const render = () =>
  renderUi(<TimersSettingsAppearance />, { wrapper: harness.wrapper });

describe("TimersSettingsAppearance", () => {
  beforeEach(() => {
    harness = createGuildPreferencesTest();
  });

  it("applies a modern preset and marks hand-tuned values as no preset", async () => {
    const user = userEvent.setup();
    render();

    expect(screen.getByRole("radio", { name: /^Czytelny/ })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: /^Kompaktowy/ }));

    await waitFor(() =>
      expect(readTimerAppearance().modern).toEqual(
        TIMERS_MODERN_COMPACT_PRESET,
      ),
    );
    expect(screen.getByRole("radio", { name: /^Kompaktowy/ })).toBeChecked();

    await user.click(screen.getByRole("switch", { name: "Stopka" }));
    await waitFor(() =>
      expect(readTimerAppearance().modern).toEqual({
        ...TIMERS_MODERN_COMPACT_PRESET,
        showFooter: true,
      }),
    );
    expect(
      screen.getByRole("radio", { name: /^Kompaktowy/ }),
    ).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /^Czytelny/ })).not.toBeChecked();
  });

  it("keeps the stored modern values when the documents already hold a custom setup", () => {
    seedSettingsDocumentValues(harness.queryClient, {
      "appearance.timers.modern": {
        ...TIMERS_MODERN_COMFORTABLE_PRESET,
        fontScalePercent: 120,
      },
    });
    render();

    expect(screen.getByRole("radio", { name: /^Czytelny/ })).not.toBeChecked();
    expect(screen.getByText("120%")).toBeVisible();
  });
});
