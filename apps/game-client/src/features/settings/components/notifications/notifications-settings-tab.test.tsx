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
  it("renders translated tab copy instead of raw settings keys", () => {
    render();

    expect(
      screen.getByRole("heading", { name: "Ustawienia powiadomień" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Skonfiguruj ustawienia powiadomień. Możesz dostosować, które typy NPC będą wywoływać powiadomienia oraz jak będą one prezentowane.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Elita 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Komunikaty" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Grupa" })).toBeInTheDocument();
    expect(
      screen.queryByText("settings.notifications.title"),
    ).not.toBeInTheDocument();
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
