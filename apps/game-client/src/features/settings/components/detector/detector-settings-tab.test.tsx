import { getUsersControllerGetUserGameAccountPreferencesQueryKey } from "@lootlog/client/main";
import { createGameAccountPreferences } from "@/test/game-account-preferences-fixtures";
import { setTestRuntimeGame } from "@/test/test-runtime-window";
import {
  act,
  render as renderUi,
  screen,
  waitFor,
} from "@testing-library/react";
import { Profiler } from "react";
import { createGuildPreferencesTest } from "@/test/guild-preferences-test";
import { beforeEach, describe, expect, it } from "vitest";

import { DetectorSettingsTab } from "./detector-settings-tab";

let harness: ReturnType<typeof createGuildPreferencesTest>;

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
  it("renders translated tab copy instead of raw settings keys", () => {
    render();

    expect(
      screen.getByRole("heading", { name: "Ustawienia wykrywacza" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Skonfiguruj wspólny routing komunikatów oraz lokalne wykrywanie NPC dla każdego typu.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Heros" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Kolos" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Tytan" })).toBeInTheDocument();
    expect(
      screen.queryByText("settings.detector.title"),
    ).not.toBeInTheDocument();
  });
  it("applies refreshed account preferences without restarting the form reset loop", async () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });

    const key = getUsersControllerGetUserGameAccountPreferencesQueryKey({
      accountId: "202",
    });

    const initial = createGameAccountPreferences("202");
    harness.queryClient.setQueryData(key, initial);
    render();
    const control = document.getElementById("ELITE2-detect");
    expect(control).not.toBeChecked();
    act(() =>
      harness.queryClient.setQueryData(key, {
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
