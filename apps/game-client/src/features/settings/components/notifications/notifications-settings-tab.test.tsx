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

import { NotificationsSettingsTab } from "./notifications-settings-tab";

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
      <NotificationsSettingsTab />
    </Profiler>,
    { wrapper: harness.wrapper },
  );
};

describe("NotificationsSettingsTab", () => {
  it("lists every category as an accordion item with the first one open", () => {
    render();
    expect(screen.getByRole("button", { name: "Elita 2" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: "Komunikaty" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: "Grupa" })).toBeInTheDocument();
    expect(document.getElementById("ELITE2-show")).toBeInTheDocument();
    expect(document.getElementById("message-show")).not.toBeInTheDocument();
  });

  it("opens a collapsed category and keeps dependent rows disabled until show is on", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.HERO.show = false;
    seedAccountPreferences(initial);
    render();

    await user.click(screen.getByRole("button", { name: "Heros" }));

    expect(document.getElementById("HERO-show")).not.toBeChecked();
    expect(document.getElementById("HERO-highlight")).toBeDisabled();
    expect(document.getElementById("HERO-auto-hide-timeout")).toBeDisabled();
  });

  it("autosaves a committed auto-hide timeout clamped to the allowed range", async () => {
    const user = userEvent.setup();
    setTestRuntimeGame({ hero: { accountId: "202" } });
    const initial = createGameAccountPreferences("202");
    initial.notifications.ELITE2.show = true;
    seedAccountPreferences(initial);
    harness.request.mockImplementation(() =>
      Promise.resolve(
        Response.json(readSeededSettingsDocuments(harness.queryClient)),
      ),
    );
    render();

    const timeout = document.getElementById("ELITE2-auto-hide-timeout");

    if (!(timeout instanceof HTMLInputElement)) throw new Error("no input");
    await user.clear(timeout);
    await user.type(timeout, "9999");
    expect(harness.request).not.toHaveBeenCalled();
    await user.tab();

    await waitFor(() => {
      const body = JSON.parse(String(harness.request.mock.calls[0]?.[1]?.body));
      expect(body.operations[0].set.presentation.ELITE2.autoHideTimeout).toBe(
        600,
      );
    });
  });
  it("applies refreshed account preferences without restarting the form reset loop", async () => {
    setTestRuntimeGame({ hero: { accountId: "202" } });

    const initial = createGameAccountPreferences("202");
    initial.notifications.ELITE2.show = true;
    seedAccountPreferences(initial);
    render();
    const control = document.getElementById("ELITE2-show");
    expect(control).toBeChecked();
    act(() =>
      seedAccountPreferences({
        ...initial,
        notifications: {
          ...initial.notifications,
          ELITE2: { ...initial.notifications.ELITE2, show: false },
        },
      }),
    );
    await waitFor(() => expect(control).not.toBeChecked());
  });
});
