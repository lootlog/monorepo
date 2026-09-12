import {
  accountPreferenceValues,
  createSettingsDocuments,
  readSeededSettingsDocuments,
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
  it("shows every option of every NPC type at once and keeps dependent switches disabled until detect is on", () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.detector.HERO.detect = false;
    initial.detector.COLOSSUS.detect = true;
    seedAccountPreferences(initial);
    render();

    expect(
      screen.getByRole("table", { name: "Które potwory wykrywać" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { expanded: false })).toBeNull();

    for (const type of ["ELITE2", "HERO", "COLOSSUS", "TITAN"]) {
      expect(document.getElementById(`${type}-detect`)).toBeInTheDocument();
    }

    expect(document.getElementById("HERO-detect")).not.toBeChecked();
    expect(document.getElementById("HERO-autoSend")).toBeDisabled();
    expect(document.getElementById("HERO-highlight")).toBeDisabled();
    expect(document.getElementById("COLOSSUS-autoSend")).toBeEnabled();
  });

  it("saves only the NPC type whose switch changed", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.detector.TITAN.detect = false;
    seedAccountPreferences(initial);
    harness.request.mockImplementation(() =>
      Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      ),
    );
    render();

    await user.click(screen.getByRole("switch", { name: "Tytan: Wykrywaj" }));

    await waitFor(() => {
      const body = JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body));
      expect(Object.keys(body.operations[0].set.detector)).toEqual(["TITAN"]);
      expect(body.operations[0].set.detector.TITAN.detect).toBe(true);
    });
  });

  it("keeps a switch toggled while an earlier save is still in flight", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.detector.TITAN.detect = false;
    initial.detector.HERO.detect = false;
    seedAccountPreferences(initial);

    const firstResponse = createSettingsDocuments(
      accountPreferenceValues({
        ...initial,
        detector: {
          ...initial.detector,
          TITAN: { ...initial.detector.TITAN, detect: true },
        },
      }),
    );

    let resolveFirst: (() => void) | undefined;
    harness.request
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = () => resolve(Response.json(firstResponse));
          }),
      )
      .mockImplementation(() =>
        Promise.resolve(
          Response.json(readSeededSettingsDocuments(harness.queryClient)),
        ),
      );
    render();

    await user.click(screen.getByRole("switch", { name: "Tytan: Wykrywaj" }));
    await waitFor(() => expect(harness.request).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole("switch", { name: "Heros: Wykrywaj" }));
    expect(document.getElementById("HERO-detect")).toBeChecked();
    await act(async () => {
      resolveFirst?.();
      // Let the response land before any follow-up save could re-apply it.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    expect(document.getElementById("HERO-detect")).toBeChecked();

    await waitFor(() => expect(harness.request).toHaveBeenCalledTimes(2));
    expect(document.getElementById("HERO-detect")).toBeChecked();
    expect(document.getElementById("TITAN-detect")).toBeChecked();
    const body = JSON.parse(String(harness.request.mock.calls[1]?.[1]?.body));
    expect(body.operations[0].set.detector.HERO.detect).toBe(true);
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
