import {
  accountPreferenceValues,
  createSettingsDocuments,
  seedSettingsDocuments,
} from "@/test/settings-documents-fixtures";
import { createGameAccountPreferences } from "@/test/game-account-preferences-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  act,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Profiler } from "react";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { beforeEach, describe, expect, it } from "vitest";

import { DetectorSettingsTab } from "./detector-settings-tab";

let harness: ReturnType<typeof createGuildPreferencesTest>;

const seedAccountPreferences = (
  preferences: Parameters<typeof accountPreferenceValues>[0],
) =>
  seedSettingsDocuments(
    harness.queryClient,
    createSettingsDocuments(accountPreferenceValues(preferences)),
  );

beforeEach(() => {
  harness = createGuildPreferencesTest();
});

const render = () => {
  let commits = 0;

  return renderUi(
    <Profiler
      id="settings"
      onRender={() => {
        commits += 1;

        if (commits > 20)
          throw new Error(
            "Settings repeatedly reset their form without input changes",
          );
      }}
    >
      <DetectorSettingsTab />
    </Profiler>,
    { wrapper: harness.wrapper },
  );
};

describe("DetectorSettingsTab", () => {
  it("lists every NPC type as an accordion item with the first one open", () => {
    render();
    expect(screen.getByRole("button", { name: "Elita 2" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Heros" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Kolos" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tytan" })).toBeInTheDocument();
    expect(document.getElementById("ELITE2-detect")).toBeInTheDocument();
    expect(document.getElementById("HERO-detect")).not.toBeInTheDocument();
  });

  it("opens a collapsed type and keeps dependent rows disabled until detect is on", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.detector.HERO.detect = false;
    seedAccountPreferences(initial);
    render();

    await user.click(screen.getByRole("button", { name: "Heros" }));

    expect(document.getElementById("HERO-detect")).not.toBeChecked();
    expect(document.getElementById("HERO-autoSend")).toBeDisabled();
    expect(document.getElementById("HERO-highlight")).toBeDisabled();
  });
  it("applies refreshed account preferences without restarting the form reset loop", async () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });

    const initial = createGameAccountPreferences("202");
    seedAccountPreferences(initial);
    render();
    const control = document.getElementById("ELITE2-detect");
    expect(control).not.toBeChecked();
    act(() =>
      seedAccountPreferences({
        ...initial,
        detector: {
          ...initial.detector,
          ELITE2: { ...initial.detector.ELITE2, detect: true },
        },
      }),
    );
    await waitFor(() => expect(control).toBeChecked());
  });
});
